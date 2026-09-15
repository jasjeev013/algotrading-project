from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import LiveTradeRecord
from app.schemas.live import LiveBotStartRequest
from app.services.execution_handler import OandaExecutionHandler
from app.services.live_bot import bot_controller, logger as live_bot_logger, _adapt_candles
from app.strategy_registry import LIVE_ELIGIBLE_STRATEGIES

# ---------------------------------------------------------------------------
# Live Paper Trading (Phase 5 account/kill-switch + Phase 6 bot control).
# ---------------------------------------------------------------------------

router = APIRouter()


@router.get("/api/live/account")
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


@router.post("/api/live/kill_switch")
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
        now_str = datetime.now(timezone.utc).isoformat()
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


@router.post("/api/live/start")
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


@router.post("/api/live/stop")
async def stop_live_bot():
    try:
        await bot_controller.stop()
    except RuntimeError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return {"status": "success", **bot_controller.state}


@router.get("/api/live/status")
def live_bot_status():
    try:
        handler = OandaExecutionHandler()
        open_positions = handler.get_open_positions()
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return {"status": "success", **bot_controller.state, "open_positions": open_positions}


@router.get("/api/live/candles")
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


@router.get("/api/live/trades")
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
