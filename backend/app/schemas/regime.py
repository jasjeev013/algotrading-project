from pydantic import BaseModel


class RegimeResponse(BaseModel):
    regime: str
    spy_price: float
    spy_daily_change_pct: float
    spy_trend: str
    vix_level: float
    as_of: str
