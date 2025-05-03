document.addEventListener('DOMContentLoaded', () => {
    const verificationForm = document.getElementById('verification-form');
    const verifyButton = document.getElementById('verify-button');
    const spinner = verifyButton.querySelector('.spinner');
    const buttonText = verifyButton.querySelector('.btn-text');
    const resultsContainer = document.getElementById('verification-results');
    const noResultsMessage = document.getElementById('no-results-message');
    
    // Status labels
    const statusLabels = {
        'active': 'Ativo',
        'inactive': 'Inativo',
        'pending': 'Verificando...',
        'error': 'Erro',
        'not_checked': 'Não verificado'
    };
    
    let pollingInterval = null;
    
    function startPolling() {
        // Clear any existing polling interval
        if (pollingInterval) {
            clearInterval(pollingInterval);
        }
        // Start new polling
        fetchVerificationStatus();
        pollingInterval = setInterval(fetchVerificationStatus, 3000);
    }
    
    function stopPolling() {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
    }
    
    // Handle form submission
    verificationForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const instagramUsername = document.getElementById('instagram-username').value.trim();
        const domain = document.getElementById('domain').value.trim();
        
        if (!instagramUsername && !domain) {
            alert('Por favor, preencha pelo menos um dos campos: Usuário do Instagram ou Domínio');
            return;
        }
        
        // Show loading state
        spinner.classList.remove('hidden');
        buttonText.textContent = 'Verificando...';
        verifyButton.disabled = true;
        
        try {
            const response = await fetch('/api/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    instagram_username: instagramUsername,
                    domain: domain
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao realizar verificação');
            }
            
            // Start polling for updates
            startPolling();
            
            // Reset form
            verificationForm.reset();
        } catch (error) {
            alert(error.message || 'Ocorreu um erro durante a verificação');
        } finally {
            // Reset button state
            spinner.classList.add('hidden');
            buttonText.textContent = 'Verificar Anúncios';
            verifyButton.disabled = false;
        }
    });
    
    // Fetch verification status
    async function fetchVerificationStatus() {
        try {
            const response = await fetch('/api/status');
            const data = await response.json();
            
            if (data && data.length > 0) {
                noResultsMessage.style.display = 'none';
                renderVerificationResults(data);
                
                // Check if all verifications are complete
                const allComplete = data.every(verification => 
                    verification.facebook_status !== 'pending' && 
                    verification.google_status !== 'pending'
                );
                
                if (allComplete) {
                    stopPolling();
                }
            } else {
                noResultsMessage.style.display = 'flex';
                resultsContainer.innerHTML = '';
            }
        } catch (error) {
            console.error('Error fetching verification status:', error);
        }
    }
    
    // Render verification results
    function renderVerificationResults(verifications) {
        resultsContainer.innerHTML = '';
        
        verifications.forEach(verification => {
            const card = document.createElement('div');
            card.className = 'verification-card';
            
            const hasInstagram = verification.instagram_username && verification.instagram_username.trim() !== '';
            const hasDomain = verification.domain && verification.domain.trim() !== '';
            
            card.innerHTML = `
                <div class="verification-header">
                    <div class="verification-queries">
                        ${hasInstagram ? `<p>Instagram: <span>@${verification.instagram_username}</span></p>` : ''}
                        ${hasDomain ? `<p>Domínio: <span>${verification.domain}</span></p>` : ''}
                    </div>
                </div>
                <div class="verification-results">
                    <div class="platform-result">
                        <div class="platform-icon facebook-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-facebook">
                                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path>
                            </svg>
                        </div>
                        <div class="platform-details">
                            <div class="platform-name">Facebook Ads</div>
                            <div class="status-indicator status-${verification.facebook_status}">
                                <span>${statusLabels[verification.facebook_status]}</span>
                            </div>
                        </div>
                    </div>
                    <div class="platform-result">
                        <div class="platform-icon google-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                        </div>
                        <div class="platform-details">
                            <div class="platform-name">Google Ads</div>
                            <div class="status-indicator status-${verification.google_status}">
                                <span>${statusLabels[verification.google_status]}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            resultsContainer.appendChild(card);
        });
    }
    
    const qsaForm = document.getElementById('qsa-form');
    const qsaButton = document.getElementById('qsa-button');
    const qsaSpinner = qsaButton.querySelector('.spinner');
    const qsaButtonText = qsaButton.querySelector('.btn-text');
    const qsaResults = document.getElementById('qsa-results');
    const qsaItems = document.getElementById('qsa-items');
    const razaoSocial = document.getElementById('razao-social');

    // Format CNPJ as user types
    document.getElementById('cnpj').addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length <= 14) {
            value = value.replace(/^(\d{2})(\d)/, '$1.$2');
            value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
            value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
            value = value.replace(/(\d{4})(\d)/, '$1-$2');
        }
        e.target.value = value;
    });

    qsaForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        const cnpj = document.getElementById('cnpj').value.trim();
        
        if (!cnpj) {
            alert('Por favor, informe o CNPJ');
            return;
        }
        
        // Show loading state
        qsaSpinner.classList.remove('hidden');
        qsaButtonText.textContent = 'Consultando...';
        qsaButton.disabled = true;
        qsaResults.classList.add('hidden');
        
        try {
            const response = await fetch('/api/qsa', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ cnpj })
            });
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Display results
            razaoSocial.textContent = `Razão Social: ${data.razao_social}`;
            
            qsaItems.innerHTML = '';
            data.qsa.forEach(socio => {
                const item = document.createElement('div');
                item.className = 'qsa-item';
                item.innerHTML = `
                    <h4>${socio.nome}</h4>
                    <p><strong>Qualificação:</strong> ${socio.qual}</p>
                `;
                qsaItems.appendChild(item);
            });
            
            qsaResults.classList.remove('hidden');
            
        } catch (error) {
            alert(error.message || 'Ocorreu um erro durante a consulta');
        } finally {
            // Reset button state
            qsaSpinner.classList.add('hidden');
            qsaButtonText.textContent = 'Consultar QSA';
            qsaButton.disabled = false;
        }
    });

    // Add reset functionality
    document.querySelector('.btn-secondary').addEventListener('click', async () => {
        // Reset ad verification form
        verificationForm.reset();
        resultsContainer.innerHTML = '';
        noResultsMessage.style.display = 'flex';

        // Stop polling
        stopPolling();

        // Clear server-side verification history
        try {
            await fetch('/api/status', { method: 'DELETE' });
        } catch (error) {
            console.error('Error clearing verification history:', error);
        }

        // Reset QSA form
        qsaForm.reset();
        qsaResults.classList.add('hidden');
        qsaItems.innerHTML = '';
        razaoSocial.textContent = '';

        // Reset lead form
        document.getElementById('leadForm').reset();
        document.getElementById('resultado').innerHTML = '';
    });
});

// Add lead qualification calculation function
function calcular() {
    const valorInicial = parseFloat(document.getElementById("valorInicial").value || 0);
    const valorAtual = parseFloat(document.getElementById("valorAtual").value || 0);
    const checkboxes = document.querySelectorAll('#leadForm input[type=checkbox]');
    let total = 0;
    
    checkboxes.forEach(c => {
        if (c.checked) total += parseInt(c.value);
    });

    let resultado = document.getElementById('resultado');
    resultado.innerHTML = `
        <div class="score-display">
            <h3>Pontuação total: ${total} pontos</h3>
        </div>
    `;

    let teto = 0;
    if (total >= 130) {
        teto = valorInicial * 1.8;
        resultado.innerHTML += `
            <div class="status-compre">
                🟢 COMPRE JÁ liberado
            </div>
        `;
    } else if (total >= 100) {
        teto = valorInicial * 1.3;
        resultado.innerHTML += `
            <div class="status-acompanhar">
                🟡 Acompanhar até R$ ${teto.toFixed(2)}
            </div>
        `;
    } else if (total >= 80) {
        teto = valorInicial;
        resultado.innerHTML += `
            <div class="status-acompanhar">
                ⚠️ Lance até o valor inicial: R$ ${teto.toFixed(2)}
            </div>
        `;
    } else {
        resultado.innerHTML += `
            <div class="status-descartar">
                🔴 Descartar Lead
            </div>
        `;
    }

    if (valorAtual > teto && total >= 80) {
        resultado.innerHTML += `
            <div class="status-alert">
                ❗ Valor atual de R$ ${valorAtual.toFixed(2)} já ultrapassou o teto sugerido de R$ ${teto.toFixed(2)}. Reavaliar risco!
            </div>
        `;
    }
}