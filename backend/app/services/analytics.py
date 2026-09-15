import numpy as np
import pandas as pd


def calculate_metrics(
    equity_curve: list, trade_log: list, initial_capital: float
) -> dict:
    """
    Calculates standard FDA (Financial Data Analysis) metrics.
    """
    if not equity_curve:
        return {}

    # Total Return
    final_equity = equity_curve[-1]["equity"]
    total_return = (final_equity - initial_capital) / initial_capital

    # CAGR (Compound Annual Growth Rate)
    # Assuming daily data, calculate how many years the backtest ran
    start_date = pd.to_datetime(equity_curve[0]["time"])
    end_date = pd.to_datetime(equity_curve[-1]["time"])
    days_elapsed = (end_date - start_date).days
    years = days_elapsed / 365.25 if days_elapsed > 0 else 1

    # Protect against negative final equity for CAGR math
    cagr = (
        ((final_equity / initial_capital) ** (1 / years)) - 1 if final_equity > 0 else 0
    )

    # Max Drawdown
    equity_df = pd.DataFrame(equity_curve)
    equity_df["peak"] = equity_df["equity"].cummax()
    equity_df["drawdown"] = (equity_df["equity"] - equity_df["peak"]) / equity_df[
        "peak"
    ]
    max_drawdown = equity_df["drawdown"].min()

    # Win Rate — undefined (not 0%) when there are no closed trades to grade,
    # e.g. Buy & Hold or any strategy still holding a position when the
    # backtest window ends.
    if len(trade_log) > 0:
        winning_trades = len([t for t in trade_log if t["profit_loss"] > 0])
        win_rate = winning_trades / len(trade_log)
    else:
        win_rate = None

    # Sharpe Ratio (Simplified Daily)
    equity_df["daily_return"] = equity_df["equity"].pct_change()
    mean_return = equity_df["daily_return"].mean()
    std_return = equity_df["daily_return"].std()

    if std_return > 0:
        # Annualized Sharpe (Assuming 252 trading days)
        sharpe_ratio = (mean_return / std_return) * np.sqrt(252)
    else:
        sharpe_ratio = 0.0

    return {
        "initial_capital": round(initial_capital, 2),
        "final_equity": round(final_equity, 2),
        "total_return_pct": round(total_return * 100, 2),
        "cagr_pct": round(cagr * 100, 2),
        "max_drawdown_pct": round(max_drawdown * 100, 2),
        "win_rate_pct": round(win_rate * 100, 2) if win_rate is not None else None,
        "sharpe_ratio": round(sharpe_ratio, 2),
        "total_trades": len(trade_log),
    }
