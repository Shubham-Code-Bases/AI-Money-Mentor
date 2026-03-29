from .state import AgentState
import logging
import os

def recommendation_node(state: AgentState):
    """
    Takes the output from either Tax Computation or Portfolio Analytics
    and generates an LLM-based action plan using Gemini Flash 1.5.
    If no API key provided, it gracefully falls back gracefully.
    """
    logging.info("Agent [Recommendation]: Formulating personalized action plan...")
    
    intent = state.get("intent", "UNKNOWN")
    profile = state.get("profile", {})
    risk = profile.get("risk_level", "Moderate")
    
    # Try Gemini, Fallback to deterministic rules if missing key
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        logging.warning("No API key, returning mock LLM recommendations")
        if intent == "TAX_ANALYSIS":
            return {"recommendations": f"**Tax Action Plan for {risk} Profile:**\n- Maximize 80C by investing in ELSS (e.g. Parag Parikh Tax Saver).\n- Start ₹50k NPS to utilize 80CCD(1B).\n- Use Health Insurance (80D) if not covered by employer."}
        else:
            return {"recommendations": f"**Portfolio Plan for {risk} Profile:**\n- Consolidate large cap funds to reduce 35% overlap.\n- Switch regular plans to direct to save ₹63k/yr.\n- Maintain aggressive SIPs to meet retirement goal."}
            
    import google.generativeai as genai
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")
    
    ctx_data = state.get("tax_computation") if intent == "TAX_ANALYSIS" else state.get("portfolio_analytics")
    
    prompt = f"""
    You are the AI-MoneyMentor Recommendation Agent.
    User Profile: Risk: {risk}, Income: {profile.get('income', 0)}
    Analysis Data: {ctx_data}
    
    Based on the above, write a concise, bulleted 3-part action plan (under 150 words).
    Suggest specific categories of Indian financial instruments (e.g., ELSS, NPS, Nifty 50 Index).
    """
    
    try:
        response = model.generate_content(prompt)
        rec = response.text
    except Exception as e:
        rec = f"Failed to generate LLM text: {str(e)}"
        
    return {"recommendations": rec}
