from pydantic import BaseModel
from typing import Dict, Any
from sqlalchemy.orm import Session

from data_fetcher import fetch_historical_data
from strategies import SMACrossover, BollingerBands, MLRandomForest, StatArbitrageStrategy
from backtester import run_iterative_backtest
from vectorized_backtester import run_vectorized_backtest
from walk_forward_engine import run_walk_forward_backtest
from analytics import calculate_metrics
from market_regime import get_current_regime
from database import get_db, init_db
from models import BacktestRun, TradeRecord, WalkForwardRun
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from data_fetcher import fetch_historical_data

STRATEGY_REGISTRY = {
    "SMA": SMACrossover,
    "Bollinger": BollingerBands,
    "ML": MLRandomForest,
    "StatArb": StatArbitrageStrategy,
}

ENGINE_REGISTRY = {
    "iterative": run_iterative_backtest,
    "vectorized": run_vectorized_backtest,
}

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
    pair_ticker: str | None = None
    initial_capital: float = 10000.0
    commission_pct: float = 0.001
    spread_pct: float = 0.0002
    slippage_pct: float = 0.0001
    overnight_financing_pct: float = 0.0
    engine: str = "iterative"


@app.post("/api/backtest")
def run_backtest(request: BacktestRequest, db: Session = Depends(get_db)):
    try:
        run_engine = ENGINE_REGISTRY.get(request.engine)
        if run_engine is None:
            raise HTTPException(status_code=400, detail="Unknown backtest engine selected.")

        # 1. Fetch Data
        raw_data = fetch_historical_data(
            ticker=request.ticker.upper(),
            start_date=request.start_date,
            end_date=request.end_date,
            interval=request.interval,
        )

        # 2. Select Strategy class
        strategy_class = STRATEGY_REGISTRY.get(request.strategy)
        if strategy_class is None:
            raise HTTPException(status_code=400, detail="Unknown strategy selected.")

        pair_raw_data = None
        if request.strategy == "StatArb":
            if not request.pair_ticker:
                raise HTTPException(
                    status_code=400,
                    detail="StatArb strategy requires a pair_ticker.",
                )
            pair_raw_data = fetch_historical_data(
                ticker=request.pair_ticker.upper(),
                start_date=request.start_date,
                end_date=request.end_date,
                interval=request.interval,
            )

        # 3. Generate Signals (single full-range run — no walk-forward here;
        # see POST /api/walk-forward for rolling train/trade window analysis)
        strategy_kwargs = dict(request.strategy_params)
        if pair_raw_data is not None:
            strategy_kwargs["pair_data"] = pair_raw_data
        strategy_instance = strategy_class(raw_data, **strategy_kwargs)
        signal_df = strategy_instance.generate_signals()

        # 4. Run the Backtest Engine
        equity_curve, trade_log = run_engine(
            df=signal_df,
            initial_capital=request.initial_capital,
            commission_pct=request.commission_pct,
            spread_pct=request.spread_pct,
            slippage_pct=request.slippage_pct,
            overnight_financing_pct=request.overnight_financing_pct,
        )
        feature_importance = getattr(strategy_instance, "last_feature_importance", None)

        # 5. Calculate Analytics Metrics
        metrics = calculate_metrics(
            equity_curve=equity_curve,
            trade_log=trade_log,
            initial_capital=request.initial_capital,
        )

        # --- Extract price data for the frontend chart (from the raw fetched series) ---
        price_data = [
            {
                "time": row["time"],
                "open": row["open"],
                "high": row["high"],
                "low": row["low"],
                "close": row["close"],
            }
            for row in raw_data
        ]

        if request.strategy != "ML":
            feature_importance = None

        # 6. Persist the run and its trades to the DB
        persisted_strategy_params = dict(request.strategy_params)
        if request.pair_ticker:
            persisted_strategy_params["pair_ticker"] = request.pair_ticker.upper()

        run = BacktestRun(
            ticker=request.ticker.upper(),
            strategy=request.strategy,
            interval=request.interval,
            start_date=request.start_date,
            end_date=request.end_date,
            initial_capital=request.initial_capital,
            commission_pct=request.commission_pct,
            spread_pct=request.spread_pct,
            slippage_pct=request.slippage_pct,
            overnight_financing_pct=request.overnight_financing_pct,
            engine=request.engine,
            strategy_params=persisted_strategy_params,
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

        # 7. Return everything nicely packaged!
        return {
            "status": "success",
            "run_id": run.id,
            "engine": request.engine,
            "metrics": metrics,
            "equity_curve": equity_curve,
            "trade_log": trade_log[::-1],  # Reverse list so newest trades are at top
            "price_data": price_data,  # <--- NEW
            "feature_importance": feature_importance,
        }

    except HTTPException:
        raise
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
                "engine": run.engine,
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
        "strategy_params": run.strategy_params,
        "interval": run.interval,
        "start_date": run.start_date,
        "end_date": run.end_date,
        "initial_capital": run.initial_capital,
        "commission_pct": run.commission_pct,
        "spread_pct": run.spread_pct,
        "slippage_pct": run.slippage_pct,
        "overnight_financing_pct": run.overnight_financing_pct,
        "engine": run.engine,
        "metrics": run.metrics,
        "trade_log": trade_log[::-1],
    }


# ---------------------------------------------------------------------------
# Walk-Forward mode: a strategy-agnostic rolling train/trade window analysis,
# kept as a separate endpoint + DB table from the plain single-run backtest
# above. Any strategy in STRATEGY_REGISTRY can be run through it.
# ---------------------------------------------------------------------------


class WalkForwardRequest(BaseModel):
    ticker: str
    start_date: str
    end_date: str
    interval: str = "1d"
    strategy: str
    strategy_params: Dict[str, Any] = {}
    pair_ticker: str | None = None
    initial_capital: float = 10000.0
    commission_pct: float = 0.001
    spread_pct: float = 0.0002
    slippage_pct: float = 0.0001
    overnight_financing_pct: float = 0.0
    train_months: int = 12
    trade_months: int = 3
    step_months: int | None = None
    warmup_bars: int | None = None


@app.post("/api/walk-forward")
def run_walk_forward(request: WalkForwardRequest, db: Session = Depends(get_db)):
    try:
        strategy_class = STRATEGY_REGISTRY.get(request.strategy)
        if strategy_class is None:
            raise HTTPException(status_code=400, detail="Unknown strategy selected.")

        raw_data = fetch_historical_data(
            ticker=request.ticker.upper(),
            start_date=request.start_date,
            end_date=request.end_date,
            interval=request.interval,
        )

        pair_raw_data = None
        if request.strategy == "StatArb":
            if not request.pair_ticker:
                raise HTTPException(
                    status_code=400,
                    detail="StatArb strategy requires a pair_ticker.",
                )
            pair_raw_data = fetch_historical_data(
                ticker=request.pair_ticker.upper(),
                start_date=request.start_date,
                end_date=request.end_date,
                interval=request.interval,
            )

        strategy_params = dict(request.strategy_params)
        if request.warmup_bars is not None:
            strategy_params.setdefault("warmup_bars", request.warmup_bars)

        wfo_result = run_walk_forward_backtest(
            raw_data=raw_data,
            strategy_class=strategy_class,
            strategy_params=strategy_params,
            train_months=request.train_months,
            trade_months=request.trade_months,
            step_months=request.step_months,
            initial_capital=request.initial_capital,
            commission_pct=request.commission_pct,
            spread_pct=request.spread_pct,
            slippage_pct=request.slippage_pct,
            overnight_financing_pct=request.overnight_financing_pct,
            pair_raw_data=pair_raw_data,
        )

        metrics = calculate_metrics(
            equity_curve=wfo_result["equity_curve"],
            trade_log=wfo_result["trade_log"],
            initial_capital=request.initial_capital,
        )

        price_data = [
            {
                "time": row["time"],
                "open": row["open"],
                "high": row["high"],
                "low": row["low"],
                "close": row["close"],
            }
            for row in raw_data
        ]

        persisted_strategy_params = dict(request.strategy_params)
        if request.pair_ticker:
            persisted_strategy_params["pair_ticker"] = request.pair_ticker.upper()

        step_months_resolved = request.step_months or request.trade_months

        run = WalkForwardRun(
            ticker=request.ticker.upper(),
            strategy=request.strategy,
            interval=request.interval,
            start_date=request.start_date,
            end_date=request.end_date,
            initial_capital=request.initial_capital,
            commission_pct=request.commission_pct,
            spread_pct=request.spread_pct,
            slippage_pct=request.slippage_pct,
            overnight_financing_pct=request.overnight_financing_pct,
            train_months=request.train_months,
            trade_months=request.trade_months,
            step_months=step_months_resolved,
            strategy_params=persisted_strategy_params,
            metrics=metrics,
            window_metrics=wfo_result["window_metrics"],
            trade_log=wfo_result["trade_log"],
        )
        db.add(run)
        db.commit()
        db.refresh(run)

        return {
            "status": "success",
            "run_id": run.id,
            "metrics": metrics,
            "equity_curve": wfo_result["equity_curve"],
            "trade_log": wfo_result["trade_log"][::-1],
            "price_data": price_data,
            "feature_importance": wfo_result["feature_importance"],
            "walk_forward": {
                "enabled": True,
                "train_months": request.train_months,
                "trade_months": request.trade_months,
                "step_months": step_months_resolved,
                "window_metrics": wfo_result["window_metrics"],
            },
        }

    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/walk-forward-runs")
def list_walk_forward_runs(db: Session = Depends(get_db)):
    """
    List past walk-forward runs, most recent first.
    """
    runs = (
        db.query(WalkForwardRun).order_by(WalkForwardRun.created_at.desc()).all()
    )
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
                "train_months": run.train_months,
                "trade_months": run.trade_months,
                "step_months": run.step_months,
                "created_at": run.created_at.isoformat() if run.created_at else None,
                "metrics": run.metrics,
            }
            for run in runs
        ],
    }


@app.get("/api/walk-forward-runs/{run_id}")
def get_walk_forward_run(run_id: int, db: Session = Depends(get_db)):
    """
    Fetch a single past walk-forward run, reshaped to match the POST
    /api/walk-forward response envelope (minus equity_curve/price_data,
    which are not persisted).
    """
    run = db.query(WalkForwardRun).filter(WalkForwardRun.id == run_id).first()
    if run is None:
        raise HTTPException(status_code=404, detail="Walk-forward run not found.")

    return {
        "status": "success",
        "run_id": run.id,
        "ticker": run.ticker,
        "strategy": run.strategy,
        "strategy_params": run.strategy_params,
        "interval": run.interval,
        "start_date": run.start_date,
        "end_date": run.end_date,
        "initial_capital": run.initial_capital,
        "commission_pct": run.commission_pct,
        "spread_pct": run.spread_pct,
        "slippage_pct": run.slippage_pct,
        "overnight_financing_pct": run.overnight_financing_pct,
        "train_months": run.train_months,
        "trade_months": run.trade_months,
        "step_months": run.step_months,
        "metrics": run.metrics,
        "trade_log": list(reversed(run.trade_log or [])),
        "walk_forward": {
            "enabled": True,
            "train_months": run.train_months,
            "trade_months": run.trade_months,
            "step_months": run.step_months,
            "window_metrics": run.window_metrics,
        },
    }


# ---------------------------------------------------------------------------
# Unified History: a read-time merge over BacktestRun + WalkForwardRun, not a
# physical table -- avoids dual-writing on every POST /api/backtest and
# POST /api/walk-forward for what's fundamentally a presentational concern.
# run_type "live" is reserved (unpopulated) so a future live-trades table
# can be unioned in here later without changing this endpoint's contract.
# ---------------------------------------------------------------------------


@app.get("/api/history")
def list_history(db: Session = Depends(get_db)):
    """
    Unified, chronological list of everything run so far -- backtests and
    walk-forward runs today, live paper trades reserved for later.
    """
    backtest_runs = db.query(BacktestRun).order_by(BacktestRun.created_at.desc()).all()
    walk_forward_runs = (
        db.query(WalkForwardRun).order_by(WalkForwardRun.created_at.desc()).all()
    )

    normalized = [
        {
            "run_id": run.id,
            "run_type": "backtest",
            "ticker": run.ticker,
            "strategy": run.strategy,
            "interval": run.interval,
            "start_date": run.start_date,
            "end_date": run.end_date,
            "engine": run.engine,
            "created_at": run.created_at.isoformat() if run.created_at else None,
            "metrics": run.metrics,
        }
        for run in backtest_runs
    ] + [
        {
            "run_id": run.id,
            "run_type": "walkforward",
            "ticker": run.ticker,
            "strategy": run.strategy,
            "interval": run.interval,
            "start_date": run.start_date,
            "end_date": run.end_date,
            "train_months": run.train_months,
            "trade_months": run.trade_months,
            "step_months": run.step_months,
            "created_at": run.created_at.isoformat() if run.created_at else None,
            "metrics": run.metrics,
        }
        for run in walk_forward_runs
    ]

    normalized.sort(key=lambda row: row["created_at"] or "", reverse=True)

    return {"status": "success", "runs": normalized}
