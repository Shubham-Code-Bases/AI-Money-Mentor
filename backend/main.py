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

def _compute_tax(data: TaxInput) -> Dict:
    basic     = data.basic
    hra_recv  = data.hra
    special   = data.special
    lta       = data.lta
    sec80c    = min(data.sec80c, 150000)
    sec80d    = min(data.sec80d, 25000)
    nps       = min(data.nps, 50000)
    home_loan = min(data.home_loan, 200000)
    rent_paid = data.rent_paid

    gross = basic + hra_recv + special + lta

    # HRA exemption (metro: 50% of basic)
    hra_exempt = 0.0
    if rent_paid > 0:
        hra_exempt = max(0, min(hra_recv, rent_paid - basic * 0.1, basic * 0.5))

    # OLD REGIME
    deductions_old = 50000 + sec80c + sec80d + nps + home_loan + hra_exempt
    taxable_old    = max(0.0, gross - deductions_old)

    def old_tax(t):
        if t <= 250000: return 0
        if t <= 500000: tax = (t - 250000) * 0.05
        elif t <= 1000000: tax = 12500 + (t - 500000) * 0.20
        else: tax = 112500 + (t - 1000000) * 0.30
        if t <= 500000: tax = 0  # 87A rebate
        return max(0, tax)

    tax_old_final = round(old_tax(taxable_old) * 1.04)  # +4% cess

    # NEW REGIME (FY 2024-25 slabs)
    def new_tax(t):
        slabs = [(300000,0),(600000,0.05),(900000,0.10),
                 (1200000,0.15),(1500000,0.20),(float('inf'),0.30)]
        tax, prev = 0.0, 0
        for limit, rate in slabs:
            if t <= prev: break
            tax += (min(t, limit) - prev) * rate
            prev = limit
        if t <= 700000: tax = 0  # 87A rebate new regime
        return max(0, tax)

    taxable_new    = max(0.0, gross - 75000)  # std deduction FY24-25
    tax_new_final  = round(new_tax(taxable_new) * 1.04)

    recommended = "Old Regime" if tax_old_final < tax_new_final else "New Regime"
    savings_amt = abs(tax_old_final - tax_new_final)

    return {
        "gross_income": gross,
        "old_regime": {
            "total_deductions": deductions_old,
            "taxable_income": taxable_old,
            "tax_payable": tax_old_final,
        },
        "new_regime": {
            "taxable_income": taxable_new,
            "tax_payable": tax_new_final,
        },
        "recommended": recommended,
        "savings": savings_amt,
        "missing_deductions": {
            "nps_unused":   int(50000  - nps),
            "sec80c_unused": int(150000 - sec80c),
            "sec80d_unused": int(25000  - sec80d),
        },
    }


@app.get("/tax")
async def tax_get():
    """GET /tax - returns analysis with default sample salary"""
    return _compute_tax(TaxInput())


@app.post("/tax")
async def tax_post(data: TaxInput):
    """POST /tax - returns analysis for provided salary structure"""
    return _compute_tax(data)

# ----------------------------------------
# MF PORTFOLIO X-RAY
# ----------------------------------------

@app.get("/portfolio-xray")
async def portfolio_xray():
    return {
        "xirr": "11.5%",
        "total_invested": 5300000,
        "current_value": 7730000,
        "absolute_gain": "45.8%",
        "overlap": "35% Large Cap Overlap between 2 funds",
        "expense_ratio_avg": "1.57%",
        "expense_drag_annual": 63000,
        "benchmark_comparison": "Portfolio XIRR vs Nifty 50: 11.5% vs 12.8%",
        "rebalancing": [
            {"action": "sell",   "fund": "Mirae Asset Large Cap",  "reason": "35% overlap with PPFAS Flexi Cap"},
            {"action": "buy",    "fund": "Mid Cap Index Fund",      "reason": "Under-allocated vs risk profile"},
            {"action": "switch", "fund": "All Regular funds ? Direct", "reason": "Save ?63,000/year"},
        ],
    }

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
