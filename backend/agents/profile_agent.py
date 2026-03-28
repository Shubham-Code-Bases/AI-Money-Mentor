from .state import AgentState

def profile_node(state: AgentState):
    print("--- Profile Agent ---")
    
    # Ensure sane defaults
    goals = state.get("goals")
    if not goals or len(goals) == 0:
        goals = ["Retirement", "Wealth Building"]
        
    risk_level = state.get("risk_level")
    if not risk_level:
        risk_level = "Moderate"
        
    return {
        "goals": goals,
        "risk_level": risk_level
    }
