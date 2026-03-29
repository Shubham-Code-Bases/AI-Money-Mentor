import asyncio
import os
import json
import logging
import hashlib
import time
from typing import Dict, Any, List, Optional

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from sqlalchemy.orm import Session
from database import get_db, DB_AVAILABLE

# Import agents (graceful fallback if unavailable)
try:
    from agents.supervisor import app_graph
    from agents.monitor_agent import monitor_loop, global_alerts
    AGENTS_AVAILABLE = True
except Exception as e:
    logging.warning(f"Agent import failed: {e}")
    AGENTS_AVAILABLE = False
    global_alerts = []

# -- App --
app = FastAPI(title="AI-MoneyMentor API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -- Serve Frontend at /frontend/* --
_frontend_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
if os.path.isdir(_frontend_path):
    app.mount("/frontend", StaticFiles(directory=_frontend_path, html=True), name="frontend")

# -- In-Memory State --
db_state: Dict = {}
user_sessions: Dict = {}

# ----------------------------------------
# PYDANTIC MODELS
# ----------------------------------------

class ProfileInput(BaseModel):
    name: Optional[str] = "User"
    income: float = 2400000
    goals: List[str] = ["Retirement"]
    risk_level: str = "Moderate"
    target_retirement_age: int = 50
    current_savings: float = 1800000

class RegisterInput(BaseModel):
    name: str
    email: str
    password: str
    income: float = 2400000
    savings: float = 1800000
    risk_level: str = "Moderate"
    target_retirement_age: int = 50
    goals: List[str] = []

class LoginInput(BaseModel):
    email: str
    password: str

class TaxInput(BaseModel):
    basic: float = 1200000
    hra: float = 360000
    special: float = 480000
    lta: float = 100000
    sec80c: float = 100000
    sec80d: float = 15000
    nps: float = 0
    home_loan: float = 0
    rent_paid: float = 180000

class ChatInput(BaseModel):
    message: str
    context: Optional[Dict] = {}

# ----------------------------------------
# STARTUP
# ----------------------------------------

@app.on_event("startup")
async def startup_event():
    if AGENTS_AVAILABLE:
        asyncio.create_task(monitor_loop())
    logging.info("AI-MoneyMentor API v2.0 started")

# ----------------------------------------
# ROOT / HEALTH
# ----------------------------------------

@app.get("/")
async def root():
    return {
        "app": "AI-MoneyMentor API",
        "version": "2.0.0",
        "status": "running",
        "agents": AGENTS_AVAILABLE,
        "frontend": f"http://localhost:8000/frontend/index.html",
        "docs": "http://localhost:8000/docs",
    }

# ----------------------------------------
# AUTH ROUTES
# ----------------------------------------

@app.post("/auth/register")
async def register(data: RegisterInput, db: Session = Depends(get_db)):
    email = data.email.lower()
    if email in user_sessions:
        raise HTTPException(status_code=400, detail="Email already registered")

    pwd_hash = hashlib.sha256(data.password.encode()).hexdigest()
    user_data = {
        "name": data.name,
        "email": email,
        "password_hash": pwd_hash,
        "income": data.income,
        "savings": data.savings,
        "risk_level": data.risk_level,
        "target_retirement_age": data.target_retirement_age,
        "goals": data.goals,
    }
    user_sessions[email] = user_data
    db_state["profile"] = user_data

    return {
        "status": "success",
        "message": "Account created successfully",
        "user": {k: v for k, v in user_data.items() if k != "password_hash"},
    }


@app.post("/auth/login")
async def login(data: LoginInput):
    email = data.email.lower()
    user = user_sessions.get(email)
    if not user:
        raise HTTPException(status_code=401, detail="Email not registered")

    pwd_hash = hashlib.sha256(data.password.encode()).hexdigest()
    if user["password_hash"] != pwd_hash:
        raise HTTPException(status_code=401, detail="Incorrect password")

    token = f"wp_{email}_{int(time.time())}"
    return {
        "status": "success",
        "token": token,
        "user": {k: v for k, v in user.items() if k != "password_hash"},
    }

# ----------------------------------------
# PROFILE
# ----------------------------------------

@app.post("/profile")
async def store_profile(profile: ProfileInput, db: Session = Depends(get_db)):
    db_state["profile"] = profile.dict()
    return {"status": "success"}

@app.get("/profile")
async def get_profile():
    return db_state.get("profile", {})

# ----------------------------------------
# DASHBOARD INSIGHTS
# ----------------------------------------

@app.get("/dashboard-insights")
async def dashboard_insights():
    return {
        "insights": [
            "Tax Wizard found ?52,000 in unclaimed NPS + 80D deductions",
            "Your FIRE corpus is ?8,200/month short - boost SIP",
            "2 mutual funds have >40% large cap overlap - consolidate",
        ]
    }

# ----------------------------------------
# TAX WIZARD  (GET = defaults, POST = custom body)
# ----------------------------------------

@app.get("/tax")
async def tax_get():
    """GET /tax - returns analysis with default sample salary via LangGraph Agents"""
    if not AGENTS_AVAILABLE:
        raise HTTPException(status_code=500, detail="Agents offline")
        
    init_state = {
        "intent": "TAX_ANALYSIS",
        "profile": db_state.get("profile", {}),
        "raw_input": TaxInput().dict()
    }
    result = app_graph.invoke(init_state)
    return result.get("final_output", {})

@app.post("/tax")
async def tax_post(data: TaxInput):
    """POST /tax - returns analysis for provided salary structure via LangGraph Agents"""
    if not AGENTS_AVAILABLE:
        raise HTTPException(status_code=500, detail="Agents offline")
        
    init_state = {
        "intent": "TAX_ANALYSIS",
        "profile": db_state.get("profile", {}),
        "raw_input": data.dict()
    }
    result = app_graph.invoke(init_state)
    return result.get("final_output", {})

# ----------------------------------------
# MF PORTFOLIO X-RAY
# ----------------------------------------

@app.get("/portfolio-xray")
async def portfolio_xray():
    """GET /portfolio-xray - runs the multi-agent X-Ray flow"""
    if not AGENTS_AVAILABLE:
        raise HTTPException(status_code=500, detail="Agents offline")
        
    init_state = {
        "intent": "MF_PORTFOLIO_XRAY",
        "profile": db_state.get("profile", {}),
        "raw_input": {}  # Defaults injected in Document Parser
    }
    result = app_graph.invoke(init_state)
    return result.get("final_output", {})

# ----------------------------------------
# FIRE PLANNER
# ----------------------------------------

@app.get("/fire-plan")
async def fire_plan():
    profile  = db_state.get("profile", {})
    income   = profile.get("income", 2400000)
    savings  = profile.get("current_savings", profile.get("savings", 1800000))
    ret_age  = profile.get("target_retirement_age", 50)
    years    = max(1, ret_age - 30)

    monthly_exp   = income / 12 * 0.6
    inflation_adj = monthly_exp * (1.06 ** years)
    fire_corpus   = inflation_adj * 12 * 25

    mr = 0.12 / 12
    n  = years * 12
    fv_savings = savings * (1.12 ** years)
    remaining  = max(0, fire_corpus - fv_savings)
    sip_needed = remaining * mr / ((1 + mr) ** n - 1) if remaining > 0 else 0

    return {
        "fire_corpus_required": round(fire_corpus),
        "current_savings": savings,
        "years_to_fire": years,
        "monthly_sip_needed": round(sip_needed),
        "scenarios": {
            "lean_fire":    round(fire_corpus * 0.80),
            "barista_fire": round(fire_corpus * 0.70),
            "fat_fire":     round(fire_corpus * 1.35),
        },
    }

# ----------------------------------------
# STOCK / MARKET ROUTES (existing agents)
# ----------------------------------------

@app.get("/scan")
async def scan_market():
    if not AGENTS_AVAILABLE:
        return {
            "market_signals": [{"signal": "Bullish", "sector": "Renewable Energy", "strength": "Strong"}],
            "news_sentiment": [
                {"title": "Govt announces ?2Tr solar push", "sentiment": "Positive"},
                {"title": "RBI cuts repo rate by 25bps",    "sentiment": "Positive"},
                {"title": "New EV policy details released",  "sentiment": "Neutral"},
            ],
        }
    try:
        result = app_graph.invoke(db_state.get("profile", {}))
        return {
            "market_signals":  result.get("market_signals"),
            "news_sentiment":  result.get("news_sentiment"),
        }
    except Exception as e:
        return {"market_signals": [], "news_sentiment": [], "error": str(e)}


@app.get("/recommend")
async def recommend():
    if not AGENTS_AVAILABLE:
        return [
            {"sector": "Renewable Energy", "stock": "Tata Power",  "reason": "Govt solar push + EV charging", "risk": "Moderate", "confidence": 87, "disclaimer": "AI suggestion. Not financial advice."},
            {"sector": "Technology",        "stock": "Infosys",     "reason": "AI deal pipeline +40% YoY",    "risk": "Low",      "confidence": 82, "disclaimer": "AI suggestion. Not financial advice."},
        ]
    try:
        result = app_graph.invoke(db_state.get("profile", {}))
        db_state["latest_verified"] = result.get("verified_recommendations", [])
        return result.get("verified_recommendations", [])
    except Exception as e:
        logging.error(f"Graph error: {e}")
        return [{"error": str(e)}]


@app.get("/monitor")
async def monitor():
    return {"alerts": global_alerts}

# ----------------------------------------
# AI CHAT  (Gemini 1.5 Flash)
# ----------------------------------------

@app.post("/chat")
async def chat(data: ChatInput):
    import google.generativeai as genai

    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Gemini API key not configured in .env")

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")

    ctx = data.context or {}
    goals_str = ", ".join(ctx.get("goals", ["Retirement"])) or "general wealth building"

    system_prompt = f"""You are AI-MoneyMentor AI Mentor - a knowledgeable, friendly Indian financial advisor.

User Profile:
- Name: {ctx.get('name', 'User')}
- Annual Income: ?{ctx.get('income', 2400000):,.0f}
- Current Savings: ?{ctx.get('savings', 1800000):,.0f}
- Risk Profile: {ctx.get('risk_level', 'Moderate')}
- Target Retirement Age: {ctx.get('target_retirement_age', 50)}
- Financial Goals: {goals_str}

Guidelines:
1. Tailor advice to the user's specific income, risk level, and goals
2. Use Indian instruments: MF, SIP, NPS, PPF, ELSS, EPF, FD, etc.
3. Reference SEBI, RBI, Income Tax Act sections when relevant
4. Be specific with numbers calculated from their profile
5. Keep responses clear and concise (max 5 short paragraphs)
6. Use markdown: **bold**, bullet points (-), ? arrows

Always end with: "?? This is for educational purposes only. Consult a SEBI-registered advisor before investing."
"""

    try:
        response = model.generate_content(system_prompt + f"\n\nUser question: {data.message}")
        return {"response": response.text}
    except Exception as e:
        logging.error(f"Gemini API error: {e}")
        raise HTTPException(status_code=500, detail=f"AI response failed: {str(e)}")
