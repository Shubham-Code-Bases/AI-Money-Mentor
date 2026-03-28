from .state import AgentState

def verification_node(state: AgentState):
    print("--- Verification Agent ---")
    
    opportunities = state.get("opportunities", [])
    verified_recommendations = []
    user_risk = state.get("risk_level", "Moderate")
    
    for opp in opportunities:
        opp_risk = opp.get("risk", "Moderate")
        
        # Risk validation
        verified = True
        if user_risk == "Low" and opp_risk == "High":
             verified = False
             
        # Create output object
        verified_item = {
            "sector": opp.get("sector"),
            "stock": opp.get("stock"),
            "reason": opp.get("reason"),
            "risk": opp.get("risk"),
            "confidence": opp.get("confidence"),
            "verified": verified,
            "disclaimer": "This is an AI-generated investment suggestion, not financial advice."
        }
        verified_recommendations.append(verified_item)

    return {"verified_recommendations": verified_recommendations}
