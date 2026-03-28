import yfinance as yf
import requests
import os
from .state import AgentState
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate

def scanner_node(state: AgentState):
    print("--- Scenario Scanner Agent ---")
    
    stocks_to_check = ["TATAPOWER.NS", "RELIANCE.NS", "HDFCBANK.NS"]
    market_signals = {}
    
    # 1. Fetch market data (YFinance)
    for ticker in stocks_to_check:
        try:
            stock = yf.Ticker(ticker)
            data = stock.history(period="5d")
            
            if not data.empty and len(data) >= 2:
                current_price = float(data['Close'].iloc[-1])
                prev_price = float(data['Close'].iloc[-2])
                pct_change = ((current_price - prev_price) / prev_price) * 100
                info = stock.info if hasattr(stock, "info") else {}
                sector = info.get("sector", "Unknown Sector") if isinstance(info, dict) else "Unknown Sector"
                
                market_signals[ticker] = {
                    "price": current_price,
                    "change_pct": pct_change,
                    "sector": sector
                }
            else:
                market_signals[ticker] = {"price": 100, "change_pct": 2.5, "sector": "Fallback Sector"}
        except Exception as e:
            print(f"Error fetching {ticker}: {e}")
            market_signals[ticker] = {"price": 150, "change_pct": 1.5, "sector": "Energy"}

    # 2. Fetch News Data
    news_api_key = os.environ.get("NEWS_API_KEY")
    articles = []
    
    if news_api_key and news_api_key.strip():
        try:
            url = f"https://newsapi.org/v2/top-headlines?country=in&category=business&apiKey={news_api_key}"
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                articles = response.json().get("articles", [])[:5]
            else:
                print("NewsAPI error, using mock fallback")
        except Exception as e:
            print("NewsAPI connection error:", e)

    if not articles:
        # Fallback mock news
        articles = [
            {"title": "Govt announces massive solar subsidy and renewable energy push", "description": "Boosts renewable energy sector significantly."},
            {"title": "RBI cuts repo rate unexpectedly", "description": "Banking sector sees surge in lending outlook."},
            {"title": "New tax regime modifications attract huge traction", "description": "Retail investors flocking to equities."}
        ]

    # 3. Sentiment Analysis via LLM
    news_sentiment = []
    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    llm = None
    
    if gemini_api_key and gemini_api_key.strip() and gemini_api_key != "your_gemini_api_key_here":
        try:
            llm = ChatGoogleGenerativeAI(temperature=0, model="gemini-1.5-flash", google_api_key=gemini_api_key)
            prompt = PromptTemplate.from_template("Classify the financial sentiment of this news headline as Positive, Negative, or Neutral. Reply with just the word: {title}")
            chain = prompt | llm
        except Exception as e:
            print("LLM init failed:", e)

    for item in articles:
        title = item.get("title", "")
        sentiment = "Neutral"
        if llm:
            try:
                res = chain.invoke({"title": title})
                sentiment = res.content.strip()
            except Exception as e:
                print("LLM invoke failed:", e)
        else:
            title_lower = title.lower()
            if "solar" in title_lower or "cut" in title_lower or "boost" in title_lower:
                sentiment = "Positive"

        news_sentiment.append({"title": title, "sentiment": sentiment})
        
    return {
        "market_signals": market_signals,
        "news_sentiment": news_sentiment
    }
