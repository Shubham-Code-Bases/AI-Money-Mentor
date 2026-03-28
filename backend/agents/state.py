from typing import TypedDict, List, Dict, Any, Optional

class AgentState(TypedDict, total=False):
    # Profile
    income: float
    goals: List[str]
    risk_level: str
    target_retirement_age: int
    current_savings: float

    # Signals
    market_signals: Dict[str, Any]
    news_sentiment: List[Dict[str, Any]]

    # Recommendations
    opportunities: List[Dict[str, Any]]
    
    # Verification
    verified_recommendations: List[Dict[str, Any]]
    alerts: List[Dict[str, Any]]
