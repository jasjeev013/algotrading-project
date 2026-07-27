from pydantic import BaseModel
from typing import Dict, Any

from data_fetcher import fetch_historical_data
from strategies import SMACrossover, BollingerBands, MLRandomForest
from backtester import run_iterative_backtest
from analytics import calculate_metrics
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

# Create a Pydantic model to validate the incoming JSON payload from the frontend
class BacktestRequest(BaseModel):
    ticker: str
    start_date: str
    end_date: str
    interval: str = "1d"
    strategy: str
    strategy_params: Dict[str, Any] = {}
    initial_capital: float = 10000.0
    commission_pct: float = 0.001

@app.post("/api/backtest")
def run_backtest(request: BacktestRequest):
    try:
        # 1. Fetch Data
        raw_data = fetch_historical_data(
            ticker=request.ticker.upper(),
            start_date=request.start_date,
            end_date=request.end_date,
            interval=request.interval
        )
        
        # 2. Select Strategy and Generate Signals
        strategy_class = None
        if request.strategy == "SMA":
            strategy_class = SMACrossover(raw_data, **request.strategy_params)
        elif request.strategy == "Bollinger":
            strategy_class = BollingerBands(raw_data, **request.strategy_params)
        elif request.strategy == "ML":
            strategy_class = MLRandomForest(raw_data, **request.strategy_params)
        else:
            raise HTTPException(status_code=400, detail="Unknown strategy selected.")
            
        signal_df = strategy_class.generate_signals()
        
        # 3. Run the Backtest Engine
        equity_curve, trade_log = run_iterative_backtest(
            df=signal_df,
            initial_capital=request.initial_capital,
            commission_pct=request.commission_pct
        )
        
        # 4. Calculate Analytics Metrics
        metrics = calculate_metrics(
            equity_curve=equity_curve,
            trade_log=trade_log,
            initial_capital=request.initial_capital
        )
        
        # --- NEW: Extract price data for the frontend chart ---
        price_data = signal_df[['time', 'open', 'high', 'low', 'close']].to_dict(orient='records')
        
        # 5. Return everything nicely packaged!
        return {
            "status": "success",
            "metrics": metrics,
            "equity_curve": equity_curve,
            "trade_log": trade_log[::-1], # Reverse list so newest trades are at top
            "price_data": price_data      # <--- NEW
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))