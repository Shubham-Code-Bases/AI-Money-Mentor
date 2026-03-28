import asyncio
from fastapi import FastAPI, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
import logging
from dotenv import load_dotenv
import json

from sqlalchemy.orm import Session
from database import get_db, UserProfile, DB_AVAILABLE
from dotenv import load_dotenv

# Load env variables (like OPENAI_API_KEY, NEWS_API_KEY)
load_dotenv()

from agents.supervisor import app_graph
from agents.monitor_agent import monitor_loop, global_alerts

app = FastAPI(title="AI Money Mentor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ProfileInput(BaseModel):
    name: Optional[str] = "User"
    income: float = 2400000
    goals: List[str] = ["Retirement", "Home Purchase"]
    risk_level: str = "Moderate"
    target_retirement_age: int = 50
    current_savings: float = 1800000

# Global memory state dict
db_state = {}

@app.on_event("startup")
async def startup_event():
    # Start monitor agent as background loop
    asyncio.create_task(monitor_loop())

@app.post("/profile")
async def store_profile(profile: ProfileInput, db: Session = Depends(get_db)):
    db_state["profile"] = profile.dict()
    
    # Save to mysql if available
    if DB_AVAILABLE and db:
        try:
            # We'll just overwrite an existing "first" profile or create one for demo purposes
            db_profile = db.query(UserProfile).first()
            if not db_profile:
                db_profile = UserProfile()
                db.add(db_profile)
                
            db_profile.name = profile.name
            db_profile.income = profile.income
            db_profile.goals = json.dumps(profile.goals)
            db_profile.risk_level = profile.risk_level
            db_profile.target_retirement_age = profile.target_retirement_age
            db_profile.current_savings = profile.current_savings
            db.commit()
        except Exception as e:
            logging.error(f"Failed to save profile to MySQL: {e}")
            
    return {"status": "success", "message": "Profile saved."}

@app.get("/scan")
async def scan_market():
    # Run a dummy state through the graph up to scanner node
    initial_state = db_state.get("profile", {})
    # LangGraph invoke outputs the final state across all nodes up to END by default.
    # We can just fetch the state through compile:
    result = app_graph.invoke(initial_state)
    return {"market_signals": result.get("market_signals"), "news_sentiment": result.get("news_sentiment")}

@app.get("/recommend")
async def recommend():
    initial_state = db_state.get("profile", {})
    try:
        result = app_graph.invoke(initial_state)
        # Store latest verified in memory
        db_state["latest_verified"] = result.get("verified_recommendations", [])
        return result.get("verified_recommendations", [])
    except Exception as e:
        logging.error(f"Error in graph execution: {e}")
        return [{"error": str(e)}]

@app.get("/monitor")
async def monitor():
    return {"alerts": global_alerts}

@app.get("/portfolio-xray")
async def portfolio_xray():
    return {
        "xirr": "11.5%",
        "overlap": "35% Large Cap Overlap",
        "expense_ratio": "1.8% Higher than Direct Plans",
        "suggestion": "Shift from Large Cap Fund A to Mid Cap B"
    }

@app.get("/tax")
async def tax_optimization():
    return {
        "old_regime": {"tax_payable": 213600},
        "new_regime": {"tax_payable": 204000},
        "recommended": "Switch to New Regime",
        "savings": 9600
    }
