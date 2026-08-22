from pydantic import BaseModel
from typing import Dict, Any
from sqlalchemy.orm import Session

from data_fetcher import fetch_historical_data
from strategy_registry import STRATEGY_REGISTRY, LIVE_ELIGIBLE_STRATEGIES
from backtester import run_iterative_backtest
from vectorized_backtester import run_vectorized_backtest
from walk_forward_engine import run_walk_forward_backtest
from analytics import calculate_metrics
from market_regime import get_current_regime
from database import get_db, init_db
from models import BacktestRun, TradeRecord, WalkForwardRun, LiveTradeRecord
from execution_handler import OandaExecutionHandler
from live_bot import bot_controller, logger as live_bot_logger, _adapt_candles
from config import LIVE_TRADE_UNITS, MIN_ACCOUNT_BALANCE, MAX_OPEN_POSITIONS
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from data_fetcher import fetch_historical_data

ENGINE_REGISTRY = {
    "iterative": run_iterative_backtest,
    "vectorized": run_vectorized_backtest,
}


def _extract_indicator_data(strategy_instance, signal_df) -> dict:
    result = {}
    for col_spec in getattr(strategy_instance, "INDICATOR_COLUMNS", []):
        col = col_spec["key"]
        if col not in signal_df.columns:
            continue
        series = signal_df[["time", col]].dropna(subset=[col])
        result[col] = {
            "label": col_spec["label"],
            "color": col_spec["color"],
            "data": [{"time": str(r["time"]), "value": float(r[col])} for _, r in series.iterrows()],
        }
    return result

app = FastAPI(title="QuantDash API")


@app.on_event("startup")
def on_startup():
    init_db()


@app.on_event("shutdown")
async def on_shutdown():
    if bot_controller.is_running():
        await bot_controller.stop()

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
        indicator_data = _extract_indicator_data(strategy_instance, signal_df)

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
            "price_data": price_data,
            "indicator_data": indicator_data,
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
            "indicator_data": {},
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
# run_type "live" is now populated from LiveTradeRecord (Phase 6).
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# Live Paper Trading (Phase 5 account/kill-switch + Phase 6 bot control).
# ---------------------------------------------------------------------------


@app.get("/api/live/account")
def get_live_account():
    """
    Validate OANDA credentials/connectivity and return the practice account summary.
    """
    try:
        handler = OandaExecutionHandler()
        return {"status": "success", "account": handler.get_account_summary()}
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/live/kill_switch")
async def kill_switch(db: Session = Depends(get_db)):
    """
    Emergency stop: closes every open position on the OANDA account. Stops
    the live bot first (best-effort) so it can't immediately reopen a
    position on its next tick right after the flatten -- the kill switch
    must be authoritative over the bot loop.
    """
    strategy = bot_controller.state.get("strategy") or "manual"
    instrument_hint = bot_controller.state.get("instrument") or "unknown"

    if bot_controller.is_running():
        try:
            await bot_controller.stop()
        except Exception as e:
            live_bot_logger.warning("kill_switch: bot stop failed (%s), flattening anyway.", e)

    try:
        handler = OandaExecutionHandler()
        results = handler.close_all_positions()

        # Log each closed position as a LiveTradeRecord with realized P/L.
        from datetime import datetime, timezone as _tz
        now_str = datetime.now(_tz.utc).isoformat()
        for r in results:
            if r.get("status") == "closed":
                pl = r.get("realized_pl")
                db.add(LiveTradeRecord(
                    instrument=r.get("instrument") or instrument_hint,
                    strategy=strategy,
                    action="close",
                    desired_position="flat",
                    prior_position="open",
                    units=None,
                    signal_time=now_str,
                    oanda_response=None,
                    error_detail="kill_switch",
                    account_balance_after=None,
                    realized_pl=float(pl) if pl is not None else None,
                ))
        db.commit()

        return {"status": "success", "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class LiveBotStartRequest(BaseModel):
    strategy: str
    instrument: str = "EUR_USD"
    interval_seconds: int = 60
    strategy_params: Dict[str, Any] = {}
    granularity: str = "M1"
    candle_count: int = 100
    trade_units: int = LIVE_TRADE_UNITS
    min_account_balance: float = MIN_ACCOUNT_BALANCE
    max_open_positions: int = MAX_OPEN_POSITIONS


@app.post("/api/live/start")
async def start_live_bot(request: LiveBotStartRequest):
    if request.strategy not in LIVE_ELIGIBLE_STRATEGIES:
        raise HTTPException(
            status_code=400,
            detail=f"strategy must be one of {sorted(LIVE_ELIGIBLE_STRATEGIES)}",
        )
    interval = max(10, request.interval_seconds)  # enforce minimum 10 s
    try:
        await bot_controller.start(
            request.strategy,
            request.instrument,
            interval,
            request.strategy_params,
            granularity=request.granularity,
            candle_count=request.candle_count,
            trade_units=request.trade_units,
            min_account_balance=request.min_account_balance,
            max_open_positions=request.max_open_positions,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return {"status": "success", **bot_controller.state}


@app.post("/api/live/stop")
async def stop_live_bot():
    try:
        await bot_controller.stop()
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return {"status": "success", **bot_controller.state}


@app.get("/api/live/status")
def live_bot_status():
    try:
        handler = OandaExecutionHandler()
        open_positions = handler.get_open_positions()
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return {"status": "success", **bot_controller.state, "open_positions": open_positions}


@app.get("/api/live/candles")
def get_live_candles(
    instrument: str = Query("EUR_USD"),
    granularity: str = Query("M15"),
    count: int = Query(100, le=500),
):
    """
    Recent OHLC candles for the Live Paper Trading chart. Reuses the same
    candle adapter the bot's tick loop uses so the chart matches exactly
    what the strategy sees.
    """
    try:
        handler = OandaExecutionHandler()
        raw_candles = handler.get_live_candles(instrument, count=count, granularity=granularity)
        return {"status": "success", "candles": _adapt_candles(raw_candles)}
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))


@app.get("/api/live/trades")
def list_live_trades(db: Session = Depends(get_db)):
    """
    Recent live bot activity (executed trades, noops, and risk-guard skips),
    most recent first -- backs the Live Paper Trading tab's activity feed.
    """
    records = (
        db.query(LiveTradeRecord).order_by(LiveTradeRecord.created_at.desc()).limit(200).all()
    )
    return {
        "status": "success",
        "trades": [
            {
                "id": r.id,
                "instrument": r.instrument,
                "strategy": r.strategy,
                "action": r.action,
                "desired_position": r.desired_position,
                "prior_position": r.prior_position,
                "units": r.units,
                "signal_time": r.signal_time,
                "error_detail": r.error_detail,
                "realized_pl": r.realized_pl,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in records
        ],
    }


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
    # Only include actionable live records (exclude noops / risk-guard skips).
    live_trades = (
        db.query(LiveTradeRecord)
        .filter(LiveTradeRecord.action.notin_(["noop", "skipped_risk_guard"]))
        .order_by(LiveTradeRecord.created_at.desc())
        .limit(50)
        .all()
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
    ] + [
        {
            "run_id": trade.id,
            "run_type": "live",
            # Map instrument → ticker so the HistoryPanel column renders correctly.
            "ticker": trade.instrument,
            "instrument": trade.instrument,
            "strategy": trade.strategy,
            "action": trade.action,
            "start_date": trade.signal_time[:10] if trade.signal_time else None,
            "end_date": trade.signal_time[:10] if trade.signal_time else None,
            "created_at": trade.created_at.isoformat() if trade.created_at else None,
            "metrics": {
                "total_return_pct": trade.realized_pl,
                "sharpe_ratio": None,
            },
        }
        for trade in live_trades
    ]

    normalized.sort(key=lambda row: row["created_at"] or "", reverse=True)

    return {"status": "success", "runs": normalized}
