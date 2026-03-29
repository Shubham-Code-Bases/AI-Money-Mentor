# AI-MoneyMentor — ET AI Hackathon 2026 (PS9)

**AI-MoneyMentor** is a conversational, AI-powered financial planning system designed for the **ET AI Hackathon 2026 (Problem Statement 9)**. It acts as an AI Chartered Accountant and Financial Co-Pilot, delivering deep analytical insights via a multi-agent backend architecture tailored specifically for Indian retail investors and salaried individuals.

---

## 🎯 Architecture & Impact (PS9 Overview)

This system is built to democratize elite financial planning by replacing human advisor hours with an orchestration of highly specialized AI agents. Traditional financial advisors charge premium fees and often miss micro-optimizations. AI-MoneyMentor instantly identifies unclaimed tax deductions and portfolio expense drags at zero marginal cost per user.

### Core Features Focus:
1. **Tax Wizard**: Models Old vs. New tax regimes, calculates savings, and identifies missing deductions (80C, 80D, NPS, HRA) based on current Income Tax slab rules.
2. **MF Portfolio X-Ray**: Calculates true XIRR, analyzes portfolio overlap, uncovers regular-to-direct plan expense ratio drags, and benchmarks against broad indices (like Nifty 50).

---

## 🧠 Multi-Agent LangGraph Architecture

The backend is driven by **LangGraph**, orchestrating the flow of financial data across six specialized nodes. The agents communicate via a shared `AgentState` payload to ensure loose coupling and fast execution.

### The Agents:
1. **Supervisor Agent** (Orchestrator)
   - Evaluates user intent (e.g., `TAX_ANALYSIS` vs `MF_PORTFOLIO_XRAY`) and conditionally routes the payload to the appropriate downstream computation nodes.
2. **Document Parser Agent**
   - Simulates OCR and data extraction from Form 16 / CAMS/KFintech statements to normalize data into structured JSON.
3. **Tax Computation Agent**
   - Applies current Indian IT rules. Runs a dual-regime deterministic pipeline to calculate exact tax payloads.
4. **Portfolio Analytics Agent**
   - Computes XIRR, builds an overlap matrix from underlying fund assets, and calculates absolute rupee drag from high expense ratios (TER).
5. **Recommendation Agent** (LLM Generative)
   - Ingests the raw mathematical outputs and uses **Google Gemini 1.5 Flash** to generate a personalized, risk-adjusted, bullet-point action plan.
6. **Compliance Guard Agent**
   - The final safety net. Flag checks against specific equity stock-picking boundaries and forcefully injects SEBI/educational disclaimers before yielding the payload to the user interface.


## 💻 Tech Stack

- **Backend AI Pipeline:** Python, FastAPI, LangGraph, Google Gemini API 1.5
- **Frontend / UI:** HTML5, Vanilla JavaScript, CSS3 (Premium Dark Glassmorphism), Chart.js
- **State Management:** In-memory context dicts (Backend), LocalStorage (Frontend)

---

## 🚀 How to Run the Project Locally

### 1. Prerequisites
- Python 3.9+
- A Google API Key (for Gemini LLM recommendations)

### 2. Setup Instructions

Clone the repository and spin up the backend:

```bash
# 1. Clone the repo
git clone https://github.com/Shubham-Code-Bases/AI-Money-Mentor.git
cd AI-Money-Mentor

# 2. Configure Environment Variables
# Copy the example file and add your Gemini API Key
cp .env.example .env

# 3. Install Python Dependencies
cd backend
pip install -r requirements.txt

# 4. Start the FastAPI Server
python -m uvicorn main:app --reload --port 8000
```

### 3. Accessing the App

Once the server is running, open your browser and navigate to the locally served frontend:

👉 **[http://localhost:8000/frontend/auth.html](http://localhost:8000/frontend/auth.html)**

---

Architecture Document: https://docs.google.com/document/d/1D4C0g-EU5iNpd5uwDFHP7mjlvt6-Vhfl/edit?usp=sharing&ouid=103123507258677323978&rtpof=true&sd=true



