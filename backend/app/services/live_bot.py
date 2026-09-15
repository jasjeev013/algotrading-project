import asyncio
import logging
import os
from datetime import datetime, timezone
from logging.handlers import RotatingFileHandler

from app.config import LIVE_TRADE_UNITS, MIN_ACCOUNT_BALANCE, MAX_OPEN_POSITIONS
from app.database import SessionLocal
from app.services.execution_handler import OandaExecutionHandler, _extract_realized_pl
from app.models import LiveTradeRecord
from app.strategy_registry import STRATEGY_REGISTRY, LIVE_ELIGIBLE_STRATEGIES

# backend/app/services/live_bot.py -> backend/logs (two levels up from here).
LOG_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "logs")

logger = logging.getLogger("live_bot")
if not logger.handlers:
    logger.setLevel(logging.INFO)
    _fmt = logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s")

    _console = logging.StreamHandler()
    _console.setFormatter(_fmt)
    logger.addHandler(_console)

    try:
        os.makedirs(LOG_DIR, exist_ok=True)
        _file = RotatingFileHandler(
            os.path.join(LOG_DIR, "bot.log"), maxBytes=5_000_000, backupCount=5
        )
        _file.setFormatter(_fmt)
        logger.addHandler(_file)
    except OSError as e:
        logger.warning("Could not open logs/bot.log (%s); logging to console only.", e)


def _adapt_candles(raw_candles: list) -> list:
    """
    OANDA's get_live_candles() returns {"complete", "volume", "time", "mid":
    {"o","h","l","c"}} dicts. Strategies expect {time, open, high, low,
    close, volume} with numeric OHLC (the data_fetcher.py shape). Only
    complete candles are kept -- the most recent one is often still forming,
    and reacting to a partial bar would make signals inconsistent tick to tick.
    """
    adapted = []
    for c in raw_candles:
        if not c.get("complete"):
            continue
        mid = c["mid"]
        adapted.append(
            {
                "time": c["time"],
                "open": float(mid["o"]),
                "high": float(mid["h"]),
                "low": float(mid["l"]),
                "close": float(mid["c"]),
                "volume": int(c.get("volume", 0)),
            }
        )
    return adapted


def _position_label(units: float) -> str:
    if units > 0:
        return "long"
    if units < 0:
        return "short"
    return "flat"


def _actual_position(open_positions: list, instrument: str) -> str:
    for pos in open_positions:
        if pos.get("instrument") != instrument:
            continue
        long_units = float(pos.get("long", {}).get("units", 0) or 0)
        short_units = float(pos.get("short", {}).get("units", 0) or 0)
        if long_units > 0:
            return "long"
        if short_units < 0:
            return "short"
    return "flat"


def _desired_position(signal_df) -> str:
    last_position = float(signal_df["position"].iloc[-1])
    if last_position > 0:
        return "long"
    if last_position < 0:
        return "short"
    return "flat"


class LiveBotController:
    """
    Owns the live bot's asyncio task and its start/stop/status lifecycle.
    Bot state is in-memory only -- a server restart requires an explicit
    POST /api/live/start again, by design (no silent auto-resume of live
    paper trading after a crash/restart).
    """

    def __init__(self):
        self._task: asyncio.Task | None = None
        self._stop_event: asyncio.Event | None = None
        self._lock = asyncio.Lock()
        self._handler: OandaExecutionHandler | None = None
        self._risk: dict = {}
        self.state = {
            "running": False,
            "strategy": None,
            "instrument": None,
            "interval_seconds": None,
            "granularity": None,
            "candle_count": None,
            "trade_units": None,
            "min_account_balance": None,
            "max_open_positions": None,
            "last_heartbeat": None,
            "last_action": None,
            "last_error": None,
        }

    def is_running(self) -> bool:
        return self._task is not None and not self._task.done()

    async def start(
        self,
        strategy: str,
        instrument: str,
        interval_seconds: int,
        strategy_params: dict | None = None,
        granularity: str = "M1",
        candle_count: int = 100,
        trade_units: int = LIVE_TRADE_UNITS,
        min_account_balance: float = MIN_ACCOUNT_BALANCE,
        max_open_positions: int = MAX_OPEN_POSITIONS,
    ):
        async with self._lock:
            if self.is_running():
                raise RuntimeError("Live bot is already running.")

            self._stop_event = asyncio.Event()
            self._handler = OandaExecutionHandler()
            self._risk = {
                "trade_units": trade_units,
                "min_account_balance": min_account_balance,
                "max_open_positions": max_open_positions,
            }
            self.state.update(
                {
                    "running": True,
                    "strategy": strategy,
                    "instrument": instrument,
                    "interval_seconds": interval_seconds,
                    "granularity": granularity,
                    "candle_count": candle_count,
                    "trade_units": trade_units,
                    "min_account_balance": min_account_balance,
                    "max_open_positions": max_open_positions,
                    "last_heartbeat": None,
                    "last_action": None,
                    "last_error": None,
                }
            )
            self._task = asyncio.create_task(
                self._run_loop(
                    strategy,
                    instrument,
                    interval_seconds,
                    strategy_params or {},
                    granularity,
                    candle_count,
                )
            )
            logger.info(
                "Live bot started: strategy=%s instrument=%s interval_seconds=%s "
                "granularity=%s trade_units=%s min_balance=%s max_positions=%s",
                strategy,
                instrument,
                interval_seconds,
                granularity,
                trade_units,
                min_account_balance,
                max_open_positions,
            )

    async def stop(self, timeout: float = 60.0):
        async with self._lock:
            if not self.is_running():
                raise RuntimeError("Live bot is not running.")

            self._stop_event.set()
            try:
                await asyncio.wait_for(self._task, timeout=timeout)
            except asyncio.TimeoutError:
                logger.warning(
                    "Live bot stop timed out waiting for in-flight tick; forcing cancel."
                )
                self._task.cancel()
            finally:
                self.state["running"] = False
                logger.info("Live bot stopped.")

    async def _run_loop(
        self, strategy, instrument, interval_seconds, strategy_params, granularity, candle_count
    ):
        try:
            while not self._stop_event.is_set():
                try:
                    await self._tick(strategy, instrument, strategy_params, granularity, candle_count)
                except Exception as e:
                    logger.exception("Live bot tick failed: %s", e)
                    self.state["last_error"] = str(e)
                self.state["last_heartbeat"] = datetime.now(timezone.utc).isoformat()

                try:
                    await asyncio.wait_for(
                        self._stop_event.wait(), timeout=interval_seconds
                    )
                except asyncio.TimeoutError:
                    continue
                else:
                    break
        finally:
            self.state["running"] = False

    async def _tick(
        self,
        strategy_name: str,
        instrument: str,
        strategy_params: dict,
        granularity: str,
        candle_count: int,
    ):
        handler = self._handler
        raw_candles = handler.get_live_candles(instrument, count=candle_count, granularity=granularity)
        candles = _adapt_candles(raw_candles)
        if len(candles) < 2:
            logger.warning("Not enough complete candles for %s this tick; skipping.", instrument)
            return

        strategy_class = STRATEGY_REGISTRY[strategy_name]
        strategy_instance = strategy_class(candles, **strategy_params)
        signal_df = strategy_instance.generate_signals()
        desired = _desired_position(signal_df)

        open_positions = handler.get_open_positions()
        prior = _actual_position(open_positions, instrument)
        signal_time = str(candles[-1]["time"])

        action, units, oanda_response, error_detail, balance_after = self._reconcile(
            handler, instrument, desired, prior
        )

        realized_pl = _extract_realized_pl(oanda_response) if oanda_response else None

        self.state["last_action"] = action
        logger.info(
            "Tick %s: instrument=%s prior=%s desired=%s action=%s pl=%s",
            signal_time,
            instrument,
            prior,
            desired,
            action,
            realized_pl,
        )
        self._log_trade(
            instrument=instrument,
            strategy=strategy_name,
            action=action,
            desired_position=desired,
            prior_position=prior,
            units=units,
            signal_time=signal_time,
            oanda_response=oanda_response,
            error_detail=error_detail,
            account_balance_after=balance_after,
            realized_pl=realized_pl,
        )

    def _reconcile(self, handler, instrument, desired, prior):
        """
        Returns (action, units, oanda_response, error_detail, balance_after).
        Closes/noops are always allowed; opening a new position is gated by
        the risk guard (min balance, max open positions).
        """
        if desired == prior:
            return "noop", None, None, None, None

        if desired == "flat":
            try:
                response = handler.close_position(instrument)
                return "close", None, response, None, None
            except RuntimeError as e:
                return "error", None, None, str(e), None

        # Opening or reversing -- risk guard applies to the opening leg.
        try:
            summary = handler.get_account_summary()
            balance = float(summary.get("balance", 0))
        except RuntimeError as e:
            return "error", None, None, f"Failed to fetch account summary: {e}", None

        min_balance = self._risk.get("min_account_balance", MIN_ACCOUNT_BALANCE)
        if balance < min_balance:
            logger.warning(
                "Risk guard: balance %.2f below min_account_balance=%.2f, skipping open.",
                balance,
                min_balance,
            )
            return "skipped_risk_guard", None, None, "balance below min_account_balance", balance

        try:
            open_positions = handler.get_open_positions()
        except RuntimeError as e:
            return "error", None, None, f"Failed to fetch open positions: {e}", balance

        open_count = sum(
            1
            for pos in open_positions
            if float(pos.get("long", {}).get("units", 0) or 0) != 0
            or float(pos.get("short", {}).get("units", 0) or 0) != 0
        )
        max_positions = self._risk.get("max_open_positions", MAX_OPEN_POSITIONS)
        if open_count >= max_positions:
            logger.warning(
                "Risk guard: %d open positions >= max_open_positions=%d, skipping open.",
                open_count,
                max_positions,
            )
            return "skipped_risk_guard", None, None, "max open positions reached", balance

        # Reversal: close the existing leg first.
        if prior != "flat":
            try:
                handler.close_position(instrument)
            except RuntimeError as e:
                return "error", None, None, f"Failed to close prior position: {e}", balance

        trade_units = self._risk.get("trade_units", LIVE_TRADE_UNITS)
        direction = "buy" if desired == "long" else "sell"
        try:
            response = handler.place_market_order(instrument, trade_units, direction)
            return direction, trade_units, response, None, balance
        except (RuntimeError, ValueError) as e:
            return "error", trade_units, None, str(e), balance

    def _log_trade(self, **kwargs):
        db = SessionLocal()
        try:
            db.add(LiveTradeRecord(**kwargs))
            db.commit()
        finally:
            db.close()


bot_controller = LiveBotController()
