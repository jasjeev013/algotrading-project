from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from data_fetcher import fetch_historical_data

app = FastAPI(title="QuantDash API")

# Allow React frontend to talk to FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "success", "message": "QuantDash Backend is running!"}

# NEW ENDPOINT: GET /api/data
@app.get("/api/data")
def get_market_data(
    ticker: str = Query(..., description="Stock ticker symbol (e.g., AAPL)"),
    start_date: str = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: str = Query(..., description="End date (YYYY-MM-DD)"),
    interval: str = Query("1d", description="Data timeframe (e.g., 1d, 1h, 15m)")
):
    """
    API Endpoint to fetch clean historical market data.
    """
    try:
        # Call our data fetcher function
        data = fetch_historical_data(
            ticker=ticker.upper(), 
            start_date=start_date, 
            end_date=end_date, 
            interval=interval
        )
        
        return {
            "status": "success",
            "meta": {
                "ticker": ticker.upper(),
                "start_date": start_date,
                "end_date": end_date,
                "interval": interval,
                "total_records": len(data)
            },
            "data": data
        }
        
    except ValueError as ve:
        # Return a 404 Not Found if the ticker is bad or data is empty
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        # Return a 500 Internal Server Error for everything else
        raise HTTPException(status_code=500, detail=str(e))