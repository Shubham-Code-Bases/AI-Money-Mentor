import asyncio
import yfinance as yf

# In-memory alerts store
global_alerts = []

async def monitor_loop():
    print("--- Starting Monitor Agent Loop ---")
    stocks_to_track = ["TATAPOWER.NS", "RELIANCE.NS"]
    
    while True:
        try:
            for ticker in stocks_to_track:
                stock = yf.Ticker(ticker)
                data = stock.history(period="1d", interval="1m")
                if not data.empty and len(data) >= 2:
                    current_price = data['Close'].iloc[-1]
                    global_alerts.append({
                        "type": "PRICE_UPDATE",
                        "message": f"Real-time update: {ticker} traded at {current_price:.2f}"
                    })
                    
            # Keep list manageable
            if len(global_alerts) > 10:
                global_alerts.pop(0)
                
        except Exception as e:
            print(f"Monitor error: {e}")
            
        await asyncio.sleep(60) # check every 1 min
