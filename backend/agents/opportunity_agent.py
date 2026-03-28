import json
import os
from .state import AgentState
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate

def opportunity_node(state: AgentState):
    print("--- Opportunity Finder Agent ---")
    
    risk = state.get("risk_level", "Moderate")
    market = state.get("market_signals", {})
    news = state.get("news_sentiment", [])
    
    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    opportunities = []

    # Use LLM to generate ranking if key provided
    if gemini_api_key and gemini_api_key.strip() and gemini_api_key != "your_gemini_api_key_here":
        try:
            llm = ChatGoogleGenerativeAI(temperature=0.2, model="gemini-1.5-flash", google_api_key=gemini_api_key)
            prompt = PromptTemplate.from_template("""
            Given the user's risk level: {risk}
            Market signals: {market}
            News sentiment: {news}
            
            Identify top 2 investment opportunities. Return JSON matching exactly:
            {{"opportunities": [
                {{"sector": "...", "stock": "...", "reason": "...", "risk": "...", "confidence": 0-100}}
            ]}}
            """)
            chain = prompt | llm
            res = chain.invoke({"risk": risk, "market": json.dumps(market), "news": json.dumps(news)})
            content = res.content.strip()
            if content.startswith("```json"):
                content = content[7:-3].strip()
            parsed = json.loads(content)
            opportunities = parsed.get("opportunities", [])
        except Exception as e:
            print(f"LLM Generation failed: {e}")

    # Fallback if no LLM or it failed
    if not opportunities:
        reason_solar = "Govt solar push + positive news"
        if any("solar" in n.get("title","").lower() for n in news):
            reason_solar = "Direct match with recent govt solar subsidy news"
            
        opportunities = [
            {
                "sector": "Renewable Energy",
                "stock": "Tata Power",
                "reason": reason_solar,
                "risk": "Moderate",
                "confidence": 85
            },
            {
                "sector": "Banking",
                "stock": "HDFC Bank",
                "reason": "Stable growth despite minor price fluctuations",
                "risk": "Low",
                "confidence": 75
            }
        ]

    return {"opportunities": opportunities}
