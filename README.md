# AI Money Mentor

A full-stack AI-powered personal finance advisor applying multi-agent workflow via LangGraph, along with a sleek and responsive UI dashboard.

## Overview
- **Backend**: FastAPI, `langgraph`, `yfinance`, OpenAI (ChatOpenAI wrapper) for sentiment tracking and reasoning.
- **Frontend**: Vanilla HTML/JS/CSS with Chart.js using modern dashboard aesthetics.

## Folder Structure
- `backend/`: FastAPI application (`main.py`) + LangGraph definitions inside `agents/`.
- `frontend/`: The User Interface (`index.html`, `style.css`, `app.js`).

## Prerequisites
- Python 3.9+
- OpenAI and NewsAPI Account (keys can be mocked for local development).

## Setup Instructions

1. **Environment Setup**
    ```sh
    cp .env.example .env
    # Edit .env and supply your OPENAI_API_KEY & NEWS_API_KEY
    ```

2. **Backend Setup**
    ```sh
    cd backend
    pip install -r requirements.txt
    uvicorn main:app --reload
    ```
    The FastAPI backend will start at `http://localhost:8000`.

3. **Frontend Setup**
    - Simply open `frontend/index.html` in your favorite browser. 
    - E.g., via simple static server: `python -m http.server 3000` from the `frontend` dir.

## Agent Architecture
1. **Supervisor**: Master graph node routing steps.
2. **Profile Agent**: Compiles user intents (goals, income, risk matching).
3. **Scenario Scanner**: Plugs into `yfinance` to detect arbitrary market variations. Calls NewsAPI and uses LLM constraint prompts to assess sentiment.
4. **Opportunity Finder**: Proposes top investment vectors matching context.
5. **Verification Agent**: Security/Constraint node validating the choices and appending SEBI-style disclaimers. 
6. **Monitor Agent**: Runs continuously in an asyncio background worker to stream changes to local-cache states.
