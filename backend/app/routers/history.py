from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import BacktestRun, LiveTradeRecord, WalkForwardRun

# ---------------------------------------------------------------------------
# Unified History: a read-time merge over BacktestRun + WalkForwardRun, not a
# physical table -- avoids dual-writing on every POST /api/backtest and
# POST /api/walk-forward for what's fundamentally a presentational concern.
# run_type "live" is populated from LiveTradeRecord (Phase 6).
# ---------------------------------------------------------------------------

router = APIRouter()


@router.get("/api/history")
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
