from flask import Flask, request, jsonify, render_template, send_from_directory
import os
from crewai import Agent, Task, Crew
from playwright.sync_api import sync_playwright
import json
import threading
import requests
import time
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get OpenAI API key from environment
os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY")

app = Flask(__name__, static_folder='static', template_folder='templates')

# Store verification results
verification_history = []

def extract_facebook_ads(instagram_username):
    url = f"https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=BR&q={instagram_username}&search_type=keyword"
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(url)
        page.wait_for_timeout(5000)
        text = page.inner_text('body')
        browser.close()
        return text

def extract_google_ads(domain):
    url = f"https://adstransparency.google.com/?region=BR&domain={domain}"
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(url)
        page.wait_for_timeout(7000)
        text = page.inner_text('body')
        browser.close()
        return text

def analyze_ads(plataforma, conteudo, consulta):
    agent = Agent(
        role="Analista de Anúncios",
        goal="Interpretar páginas públicas para verificar se há anúncios ativos para um perfil ou domínio.",
        backstory="Um especialista em marketing digital que entende o conteúdo de anúncios como um ser humano.",
        tools=[],
        verbose=True
    )

    if plataforma == "facebook":
        task = Task(
            description=(
                f"Leia o seguinte conteúdo da Biblioteca de Anúncios do Facebook e diga se há anúncios ativos para o usuário '{consulta}'.\n\n"
                f"Conteúdo da página:\n{conteudo}\n\n"
                "Procure especialmente por palavras como: 'nenhum', 'anúncios', 'ativos', '0' para ajudar na análise.\n"
                "Responda apenas com 'Sim' ou 'Não', sem explicações ou comentários adicionais."
            ),
            expected_output="Sim ou Não. Apenas uma dessas palavras, sem explicação.",
            agent=agent
        )
    else:
        task = Task(
            description=(
                f"Leia o seguinte conteúdo do Centro de Transparência de Anúncios do Google e diga se há anúncios ativos para o domínio '{consulta}'.\n\n"
                f"Conteúdo da página:\n{conteudo}\n\n"
                "Procure especialmente por palavras como: 'nenhum', 'anúncios', 'ativos', '0' para ajudar na análise.\n"
                "Responda apenas com 'Sim' ou 'Não', sem explicações ou comentários adicionais."
            ),
            expected_output="Sim ou Não. Apenas uma dessas palavras, sem explicação.",
            agent=agent
        )

    crew = Crew(
        agents=[agent],
        tasks=[task],
        verbose=True
    )
    
    result = crew.kickoff()
    texto = str(result)
    return texto.strip().lower() == "sim"

def verify_ads_async(instagram_username, domain):
    results = {
        "instagram_username": instagram_username,
        "domain": domain,
        "facebook_status": "pending",
        "google_status": "pending",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    
    verification_history.insert(0, results)
    
    def check_facebook():
        try:
            if instagram_username:
                facebook_content = extract_facebook_ads(instagram_username)
                has_ads = analyze_ads("facebook", facebook_content, instagram_username)
                results["facebook_status"] = "active" if has_ads else "inactive"
            else:
                results["facebook_status"] = "not_checked"
        except Exception as e:
            results["facebook_status"] = "error"
            print(f"Facebook error: {str(e)}")
    
    def check_google():
        try:
            if domain:
                google_content = extract_google_ads(domain)
                has_ads = analyze_ads("google", google_content, domain)
                results["google_status"] = "active" if has_ads else "inactive"
            else:
                results["google_status"] = "not_checked"
        except Exception as e:
            results["google_status"] = "error"
            print(f"Google error: {str(e)}")
    
    facebook_thread = threading.Thread(target=check_facebook)
    google_thread = threading.Thread(target=check_google)
    
    facebook_thread.start()
    google_thread.start()
    
    return results

def consultar_qsa(cnpj):
    cnpj = ''.join(filter(str.isdigit, cnpj))
    url = f"https://www.receitaws.com.br/v1/cnpj/{cnpj}"
    
    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 429:
            time.sleep(60)
            return consultar_qsa(cnpj)
        elif response.status_code != 200:
            return {"error": f"Erro ao consultar API: {response.status_code}"}

        data = response.json()
        if "qsa" in data:
            return {"success": True, "qsa": data["qsa"], "razao_social": data.get("nome", "N/A")}
        else:
            return {"error": "QSA não encontrado ou CNPJ inválido"}
    
    except requests.exceptions.RequestException as e:
        return {"error": f"Erro de conexão: {str(e)}"}

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/api/verify', methods=['POST'])
def verify_ads():
    data = request.json
    instagram_username = data.get('instagram_username', '')
    domain = data.get('domain', '')
    
    if not instagram_username and not domain:
        return jsonify({"error": "Please provide at least one of: Instagram username or domain"}), 400
    
    results = verify_ads_async(instagram_username, domain)
    
    return jsonify({"message": "Verification started", "id": id(results)}), 202

@app.route('/api/qsa', methods=['POST'])
def get_qsa():
    data = request.json
    cnpj = data.get('cnpj', '')
    
    if not cnpj:
        return jsonify({"error": "CNPJ é obrigatório"}), 400
    
    result = consultar_qsa(cnpj)
    return jsonify(result)

@app.route('/api/status')
def get_status():
    return jsonify(verification_history)

@app.route('/api/status', methods=['DELETE'])
def clear_status():
    global verification_history
    verification_history = []
    return jsonify({"message": "Verification history cleared"}), 200

@app.route('/static/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

if __name__ == '__main__':
    app.run(debug=True)