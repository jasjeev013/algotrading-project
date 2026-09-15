import numpy as np
import pandas as pd

from cost_model import apply_fill_costs_vectorized


def run_vectorized_backtest(
    df: pd.DataFrame,
    initial_capital: float = 10000.0,
    commission_pct: float = 0.001,
    spread_pct: float = 0.0002,
    slippage_pct: float = 0.0001,
    overnight_financing_pct: float = 0.0,
):
    """
    Vectorized counterpart to run_iterative_backtest (backtester.py) with
    identical fill-cost, commission, and overnight-financing semantics --
    verified bar-for-bar and trade-for-trade by test_backtester_parity.py.
    No per-bar Python loop: contiguous position segments are identified via
    (position != position.shift()).cumsum(), and fills/P&L/equity are
    computed with pandas/numpy array ops over the full frame at once.

    Financing detail: run_iterative_backtest charges financing once per
    elapsed calendar day between consecutive bars while a position was
    ALREADY held entering that bar (never on the bar it's opened) --
    including the bar a position closes, since that bar's financing charge
    (based on the OLD position) happens before the close executes. This
    reduces to a pure row-to-row relationship (each bar's charge depends
    only on whether the previous bar's position was nonzero), so it doesn't
    need special-casing at segment boundaries -- it falls out naturally from
    comparing each row to prev_pos = position.shift(1).
    """
    n = len(df)
    if n == 0:
        return [], []

    df = df.reset_index(drop=True)
    price = df["close"].astype(float)
    pos = df["position"].astype(float)
    raw_time = df["time"]

    # Calendar-day (time-of-day stripped) dates, so intraday bars only ever
    # accrue financing across a day boundary, never between same-day bars --
    # matching run_iterative_backtest's use of pd.to_datetime(date).date().
    cal_date = pd.to_datetime(raw_time).dt.normalize()
    elapsed_days = (cal_date - cal_date.shift()).dt.days.fillna(0).to_numpy()

    prev_pos = pos.shift(1).fillna(0.0).to_numpy()
    pos_arr = pos.to_numpy()

    # --- Segment identification: contiguous runs of equal target position ---
    seg_id = (pos != pos.shift()).cumsum()
    seg_start_price = price.groupby(seg_id).first()
    seg_position = pos.groupby(seg_id).first()
    seg_entry_side = pd.Series(
        np.where(seg_position.to_numpy() == 1, "buy", "sell"), index=seg_position.index
    )
    # Entry price per segment. Flat (position == 0) segments get a bogus
    # "sell"-side value here too, but it's never read (only consumed where
    # pos/prev_pos != 0 below), so no need to special-case it away.
    seg_entry_price = apply_fill_costs_vectorized(
        seg_start_price, seg_entry_side, spread_pct, slippage_pct
    )
    seg_entry_date = raw_time.groupby(seg_id).first()

    # Each row's own segment (for mark-to-market) vs. the segment being
    # CLOSED at this row (the previous row's segment).
    own_entry_price = seg_id.map(seg_entry_price).to_numpy()
    closing_seg = seg_id.shift(1).fillna(-1).astype(int)
    closed_entry_price = closing_seg.map(seg_entry_price).to_numpy()
    closed_entry_date = closing_seg.map(seg_entry_date).to_numpy()

    close_mask = (pos_arr != prev_pos) & (prev_pos != 0)

    exit_side = np.where(prev_pos == 1, "sell", "buy")
    exit_price_all = apply_fill_costs_vectorized(
        price, pd.Series(exit_side, index=price.index), spread_pct, slippage_pct
    ).to_numpy()

    gross_return = np.where(
        prev_pos == 1,
        (exit_price_all - closed_entry_price) / closed_entry_price,
        np.where(
            prev_pos == -1,
            (closed_entry_price - exit_price_all) / closed_entry_price,
            0.0,
        ),
    )
    net_return = gross_return - 2 * commission_pct
    trade_mult = np.where(close_mask, 1 + net_return, 1.0)

    financing_mask = prev_pos != 0
    financing_mult = np.where(financing_mask, 1 - overnight_financing_pct * elapsed_days, 1.0)

    # Financing (if any) and this bar's trade close (if any) both apply
    # sequentially to the same equity value within the bar, in that order --
    # multiplication is commutative so combining them into one per-bar
    # factor before cumprod is equivalent to applying them one after another.
    bar_mult = financing_mult * trade_mult
    equity_realized = initial_capital * np.cumprod(bar_mult)
    equity_prev = np.concatenate(([initial_capital], equity_realized[:-1]))
    equity_pretrade = equity_prev * financing_mult  # after financing, before this bar's close

    price_arr = price.to_numpy()
    unrealized = np.where(
        pos_arr == 1,
        (price_arr - own_entry_price) / own_entry_price,
        np.where(
            pos_arr == -1,
            (own_entry_price - price_arr) / own_entry_price,
            0.0,
        ),
    )
    equity_curve_values = equity_realized * (1 + unrealized)

    equity_curve = pd.DataFrame(
        {"time": raw_time.to_numpy(), "equity": np.round(equity_curve_values, 2)}
    ).to_dict("records")

    trades_df = pd.DataFrame(
        {
            "type": np.where(prev_pos == 1, "LONG", "SHORT"),
            "entry_date": closed_entry_date,
            "exit_date": raw_time.to_numpy(),
            "entry_price": np.round(closed_entry_price, 2),
            "exit_price": np.round(exit_price_all, 2),
            "net_return_pct": np.round(net_return * 100, 2),
            "profit_loss": np.round(equity_pretrade * net_return, 2),
            "equity_after": np.round(equity_realized, 2),
        }
    )[close_mask]
    trade_log = trades_df.to_dict("records")

    return equity_curve, trade_log
