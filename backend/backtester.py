import pandas as pd


def run_iterative_backtest(
    df: pd.DataFrame, initial_capital: float = 10000.0, commission_pct: float = 0.001
):
    """
    Iterates through the signals row by row.
    commission_pct: 0.001 means 0.1% fee per trade.
    """
    equity = initial_capital
    current_pos = 0  # 1 for Long, -1 for Short, 0 for Cash
    entry_price = 0
    entry_date = None

    trade_log = []
    equity_curve = []

    for i in range(len(df)):
        row = df.iloc[i]
        price = row["close"]
        date = row["time"]
        target_pos = row["position"]

        # 1. Check if we need to execute a trade
        if target_pos != current_pos:

            # Close existing position if we have one
            if current_pos != 0:
                # Calculate gross return
                if current_pos == 1:
                    gross_return = (price - entry_price) / entry_price
                elif current_pos == -1:
                    gross_return = (entry_price - price) / entry_price

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
                        "exit_price": round(price, 2),
                        "net_return_pct": round(net_return * 100, 2),
                        "profit_loss": round(trade_profit, 2),
                        "equity_after": round(equity, 2),
                    }
                )

            # Open new position
            if target_pos != 0:
                entry_price = price
                entry_date = date

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
