import pandas as pd

from app.services.cost_model import apply_fill_costs as _apply_fill_costs


def run_iterative_backtest(
    df: pd.DataFrame,
    initial_capital: float = 10000.0,
    commission_pct: float = 0.001,
    spread_pct: float = 0.0002,
    slippage_pct: float = 0.0001,
    overnight_financing_pct: float = 0.0,
):
    """
    Iterates through the signals row by row.
    commission_pct: 0.001 means 0.1% fee per trade.
    spread_pct: bid/ask spread applied to each fill (half-spread per side).
    slippage_pct: additional adverse fill-price move applied to each order.
    overnight_financing_pct: daily fee charged on equity for each calendar day
        a position is held across a bar-to-bar boundary (e.g. Forex swap rate).
    """
    equity = initial_capital
    current_pos = 0  # 1 for Long, -1 for Short, 0 for Cash
    entry_price = 0
    entry_date = None
    last_charged_date = None

    trade_log = []
    equity_curve = []

    for i in range(len(df)):
        row = df.iloc[i]
        price = row["close"]
        date = row["time"]
        target_pos = row["position"]
        row_date = pd.to_datetime(date).date()

        # 0. Charge overnight financing for calendar days the current
        # position was already held into this bar.
        if current_pos != 0 and last_charged_date is not None:
            elapsed_days = (row_date - last_charged_date).days
            if elapsed_days > 0:
                equity -= equity * overnight_financing_pct * elapsed_days
        if current_pos != 0:
            last_charged_date = row_date

        # 1. Check if we need to execute a trade
        if target_pos != current_pos:

            # Close existing position if we have one
            if current_pos != 0:
                # Closing a LONG = selling; closing a SHORT = buying (covering)
                exit_side = "sell" if current_pos == 1 else "buy"
                exit_price = _apply_fill_costs(
                    price, exit_side, spread_pct, slippage_pct
                )

                # Calculate gross return
                if current_pos == 1:
                    gross_return = (exit_price - entry_price) / entry_price
                elif current_pos == -1:
                    gross_return = (entry_price - exit_price) / entry_price

                # Apply transaction costs (fee for entry + fee for exit)
                net_return = gross_return - (2 * commission_pct)

                # Update Equity
                trade_profit = equity * net_return
                equity += trade_profit

                # Log the trade
                trade_log.append(
                    {
                        "type": "LONG" if current_pos == 1 else "SHORT",
                        "entry_date": entry_date,
                        "exit_date": date,
                        "entry_price": round(entry_price, 2),
                        "exit_price": round(exit_price, 2),
                        "net_return_pct": round(net_return * 100, 2),
                        "profit_loss": round(trade_profit, 2),
                        "equity_after": round(equity, 2),
                    }
                )

            # Open new position
            if target_pos != 0:
                # Opening a LONG = buying; opening a SHORT = selling
                entry_side = "buy" if target_pos == 1 else "sell"
                entry_price = _apply_fill_costs(
                    price, entry_side, spread_pct, slippage_pct
                )
                entry_date = date
                last_charged_date = row_date

            current_pos = target_pos

        # 2. Track daily equity (approximating unrealized gains for the chart)
        if current_pos == 1:
            unrealized = (price - entry_price) / entry_price
        elif current_pos == -1:
            unrealized = (entry_price - price) / entry_price
        else:
            unrealized = 0

        current_equity = equity * (1 + unrealized)

        equity_curve.append({"time": date, "equity": round(current_equity, 2)})

    return equity_curve, trade_log
