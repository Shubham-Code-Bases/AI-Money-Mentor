from .state import AgentState
import logging

def portfolio_analytics_node(state: AgentState):
    """
    Computes XIRR, expense drag, and overlap according to the doc.
    Uses mock calculations for Hackathon Demo speed unless external APIs injected.
    """
    logging.info("Agent [Portfolio Analytics]: Running Fund metrics & overlapping matrix...")
    
    parsed = state.get("parsed_data", {})
    # For demo, using static representations that mimic the calculations of an AMFI API
    
    result = {
        "xirr": "11.5%",
        "total_invested": parsed.get("total_invested", 5300000),
        "current_value": parsed.get("current_value", 7730000),
        "absolute_gain": "45.8%",
        "overlap": "35% Large Cap Overlap between 2 funds",
        "expense_ratio_avg": "1.57%",
        "expense_drag_annual": 63000,
        "benchmark_comparison": "Portfolio XIRR vs Nifty 50: 11.5% vs 12.8%",
        "risk_concentration": "High Exposure in Tech Sector (25%)"
    }

    return {"portfolio_analytics": result}
