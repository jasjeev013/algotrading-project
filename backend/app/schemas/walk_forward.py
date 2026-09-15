from typing import Any, Dict

from pydantic import BaseModel


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
