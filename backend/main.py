from pydantic import BaseModel
from typing import Dict, Any
from sqlalchemy.orm import Session

from data_fetcher import fetch_historical_data
from strategies import SMACrossover, BollingerBands, MLRandomForest
from backtester import run_iterative_backtest
from analytics import calculate_metrics
from market_regime import get_current_regime
from database import get_db, init_db
from models import BacktestRun, TradeRecord
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from data_fetcher import fetch_historical_data

app = FastAPI(title="QuantDash API")


@app.on_event("startup")
def on_startup():
    init_db()

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
    interval: str = Query("1d", description="Data timeframe (e.g., 1d, 1h, 15m)"),
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
            interval=interval,
        )

        return {
            "status": "success",
            "meta": {
                "ticker": ticker.upper(),
                "start_date": start_date,
                "end_date": end_date,
                "interval": interval,
                "total_records": len(data),
            },
            "data": data,
        }

    except ValueError as ve:
        # Return a 404 Not Found if the ticker is bad or data is empty
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        # Return a 500 Internal Server Error for everything else
        raise HTTPException(status_code=500, detail=str(e))


# NEW ENDPOINT: GET /api/regime
class RegimeResponse(BaseModel):
    regime: str
    spy_price: float
    spy_daily_change_pct: float
    spy_trend: str
    vix_level: float
    as_of: str


@app.get("/api/regime", response_model=RegimeResponse)
def get_market_regime():
    """
    API Endpoint to fetch current market regime (SPY trend + VIX level classification).
    """
    try:
        return get_current_regime()
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
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
def run_backtest(request: BacktestRequest, db: Session = Depends(get_db)):
    try:
        # 1. Fetch Data
        raw_data = fetch_historical_data(
            ticker=request.ticker.upper(),
            start_date=request.start_date,
            end_date=request.end_date,
            interval=request.interval,
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
            commission_pct=request.commission_pct,
        )

        # 4. Calculate Analytics Metrics
        metrics = calculate_metrics(
            equity_curve=equity_curve,
            trade_log=trade_log,
            initial_capital=request.initial_capital,
        )

        # --- NEW: Extract price data for the frontend chart ---
        price_data = signal_df[["time", "open", "high", "low", "close"]].to_dict(
            orient="records"
        )

        # 5. Persist the run and its trades to the DB
        run = BacktestRun(
            ticker=request.ticker.upper(),
            strategy=request.strategy,
            interval=request.interval,
            start_date=request.start_date,
            end_date=request.end_date,
            initial_capital=request.initial_capital,
            commission_pct=request.commission_pct,
            strategy_params=request.strategy_params,
            metrics=metrics,
        )
        db.add(run)
        db.flush()  # populate run.id before creating trades

        for trade in trade_log:
            db.add(
                TradeRecord(
                    backtest_run_id=run.id,
                    type=trade["type"],
                    entry_date=str(trade["entry_date"]),
                    exit_date=str(trade["exit_date"]),
                    entry_price=trade["entry_price"],
                    exit_price=trade["exit_price"],
                    profit_loss=trade["profit_loss"],
                    net_return_pct=trade["net_return_pct"],
                    equity_after=trade["equity_after"],
                )
            )
        db.commit()

        # 6. Return everything nicely packaged!
        return {
            "status": "success",
            "run_id": run.id,
            "metrics": metrics,
            "equity_curve": equity_curve,
            "trade_log": trade_log[::-1],  # Reverse list so newest trades are at top
            "price_data": price_data,  # <--- NEW
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/backtests")
def list_backtests(db: Session = Depends(get_db)):
    """
    List past backtest runs, most recent first.
    """
    runs = db.query(BacktestRun).order_by(BacktestRun.created_at.desc()).all()
    return {
        "status": "success",
        "runs": [
            {
                "run_id": run.id,
                "ticker": run.ticker,
                "strategy": run.strategy,
                "interval": run.interval,
                "start_date": run.start_date,
                "end_date": run.end_date,
                "created_at": run.created_at.isoformat() if run.created_at else None,
                "metrics": run.metrics,
            }
            for run in runs
        ],
    }


@app.get("/api/backtests/{run_id}")
def get_backtest(run_id: int, db: Session = Depends(get_db)):
    """
    Fetch a single past backtest run and its trades, reshaped to match
    the POST /api/backtest response envelope (minus equity_curve/price_data,
    which are not persisted).
    """
    run = db.query(BacktestRun).filter(BacktestRun.id == run_id).first()
    if run is None:
        raise HTTPException(status_code=404, detail="Backtest run not found.")

    trade_log = [
        {
            "type": trade.type,
            "entry_date": trade.entry_date,
            "exit_date": trade.exit_date,
            "entry_price": trade.entry_price,
            "exit_price": trade.exit_price,
            "profit_loss": trade.profit_loss,
            "net_return_pct": trade.net_return_pct,
            "equity_after": trade.equity_after,
        }
        for trade in run.trades
    ]

    return {
        "status": "success",
        "run_id": run.id,
        "ticker": run.ticker,
        "strategy": run.strategy,
        "metrics": run.metrics,
        "trade_log": trade_log[::-1],
    }
