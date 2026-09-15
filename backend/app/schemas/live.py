from typing import Any, Dict

from pydantic import BaseModel

from app.config import LIVE_TRADE_UNITS, MIN_ACCOUNT_BALANCE, MAX_OPEN_POSITIONS


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
