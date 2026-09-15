from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import WalkForwardRun
from app.schemas.walk_forward import WalkForwardRequest
from app.services.analytics import calculate_metrics
from app.services.data_fetcher import fetch_historical_data
from app.services.walk_forward_engine import run_walk_forward_backtest
from app.strategy_registry import STRATEGY_REGISTRY

# ---------------------------------------------------------------------------
# Walk-Forward mode: a strategy-agnostic rolling train/trade window analysis,
# kept as a separate endpoint + DB table from the plain single-run backtest.
# Any strategy in STRATEGY_REGISTRY can be run through it.
# ---------------------------------------------------------------------------

router = APIRouter()


@router.post("/api/walk-forward")
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


@router.get("/api/walk-forward-runs")
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


@router.get("/api/walk-forward-runs/{run_id}")
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
