# Ad Verification Tool

A modern web application for verifying active advertisements on Facebook and Google platforms.

## Features

- Verify if Instagram accounts have active Facebook ads
- Check if domains have active Google ads
- Beautiful, responsive interface with white and red color scheme
- Real-time verification status updates
- History of previous verifications

## Technology Stack

- **Backend**: Python with Flask, CrewAI, and Playwright
- **Frontend**: HTML, CSS, and JavaScript
- **APIs**: Facebook Ads Library and Google Ads Transparency Center

## Setup and Installation

1. Clone the repository
2. Install dependencies:
   ```
   pip install flask crewai playwright
   ```
3. Initialize Playwright:
   ```
   playwright install
   ```
4. Run the application:
   ```
   python app.py
   ```
5. Access the application at `http://localhost:5000`

## API Endpoints

- `GET /`: Main application interface
- `POST /api/verify`: Start a new ad verification
- `GET /api/status`: Get status of all verifications

## Environment Variables

Make sure to set your OpenAI API key in the `app.py` file or as an environment variable.