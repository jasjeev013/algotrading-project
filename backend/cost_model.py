import numpy as np
import pandas as pd


def apply_fill_costs(price: float, side: str, spread_pct: float, slippage_pct: float) -> float:
    """
    Adjusts a raw close price for bid/ask spread and slippage.
    side: "buy" fills above the raw price, "sell" fills below it.
    """
    if side == "buy":
        return price * (1 + spread_pct / 2 + slippage_pct)
    return price * (1 - spread_pct / 2 - slippage_pct)


def apply_fill_costs_vectorized(
    price: pd.Series, side: pd.Series, spread_pct: float, slippage_pct: float
) -> pd.Series:
    """
    Vectorized counterpart of apply_fill_costs for array/Series inputs.
    side: Series of "buy"/"sell" strings, same length as price.
    """
    buy_price = price * (1 + spread_pct / 2 + slippage_pct)
    sell_price = price * (1 - spread_pct / 2 - slippage_pct)
    return pd.Series(np.where(side == "buy", buy_price, sell_price), index=price.index)
