from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import BacktestRun, TradeRecord
from app.schemas.backtest import BacktestRequest
from app.services.analytics import calculate_metrics
from app.services.backtester import run_iterative_backtest
from app.services.data_fetcher import fetch_historical_data
from app.services.vectorized_backtester import run_vectorized_backtest
from app.strategy_registry import STRATEGY_REGISTRY
from app.utils.indicators import extract_indicator_data

ENGINE_REGISTRY = {
    "iterative": run_iterative_backtest,
    "vectorized": run_vectorized_backtest,
}

router = APIRouter()


@router.post("/api/backtest")
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
        indicator_data = extract_indicator_data(strategy_instance, signal_df)

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


@router.get("/api/backtests")
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


@router.get("/api/backtests/{run_id}")
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
