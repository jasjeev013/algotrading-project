"""
Parity check: run_vectorized_backtest must produce equity_curve/trade_log
numerically equivalent to run_iterative_backtest for the same signals, across
every strategy and both zero and nonzero overnight_financing_pct (the
riskiest case -- see the module docstring in vectorized_backtester.py).

Plain-script style (no pytest), matching test_strategies.py in this repo.
Run with: python test_backtester_parity.py
"""

import numpy as np
import pandas as pd

from datetime import date, timedelta

from app.services.data_fetcher import fetch_historical_data
from app.services.strategies import SMACrossover, BollingerBands, MLRandomForest, StatArbitrageStrategy
from app.services.backtester import run_iterative_backtest
from app.services.vectorized_backtester import run_vectorized_backtest

EQUITY_TOL = 0.02  # dollars, allows for independent rounding paths
PCT_TOL = 0.02


def _assert_close(a, b, tol, label):
    assert abs(a - b) <= tol, f"{label} mismatch: iterative={a} vectorized={b} (tol={tol})"


def _compare(name, signals, **cost_kwargs):
    iter_equity, iter_trades = run_iterative_backtest(signals, **cost_kwargs)
    vec_equity, vec_trades = run_vectorized_backtest(signals, **cost_kwargs)

    assert len(iter_equity) == len(vec_equity), (
        f"[{name}] equity_curve length mismatch: {len(iter_equity)} vs {len(vec_equity)}"
    )
    for i, (a, b) in enumerate(zip(iter_equity, vec_equity)):
        assert a["time"] == b["time"], f"[{name}] equity_curve[{i}] time mismatch: {a['time']} vs {b['time']}"
        _assert_close(a["equity"], b["equity"], EQUITY_TOL, f"[{name}] equity_curve[{i}].equity")

    assert len(iter_trades) == len(vec_trades), (
        f"[{name}] trade_log length mismatch: {len(iter_trades)} vs {len(vec_trades)}\n"
        f"iterative={iter_trades}\nvectorized={vec_trades}"
    )
    for i, (a, b) in enumerate(zip(iter_trades, vec_trades)):
        assert a["type"] == b["type"], f"[{name}] trade[{i}].type mismatch: {a['type']} vs {b['type']}"
        assert str(a["entry_date"]) == str(b["entry_date"]), (
            f"[{name}] trade[{i}].entry_date mismatch: {a['entry_date']} vs {b['entry_date']}"
        )
        assert str(a["exit_date"]) == str(b["exit_date"]), (
            f"[{name}] trade[{i}].exit_date mismatch: {a['exit_date']} vs {b['exit_date']}"
        )
        _assert_close(a["entry_price"], b["entry_price"], EQUITY_TOL, f"[{name}] trade[{i}].entry_price")
        _assert_close(a["exit_price"], b["exit_price"], EQUITY_TOL, f"[{name}] trade[{i}].exit_price")
        _assert_close(a["net_return_pct"], b["net_return_pct"], PCT_TOL, f"[{name}] trade[{i}].net_return_pct")
        _assert_close(a["profit_loss"], b["profit_loss"], EQUITY_TOL, f"[{name}] trade[{i}].profit_loss")
        _assert_close(a["equity_after"], b["equity_after"], EQUITY_TOL, f"[{name}] trade[{i}].equity_after")

    print(f"OK  {name}: {len(iter_trades)} trades, final equity iter={iter_equity[-1]['equity']} vec={vec_equity[-1]['equity']}")


def main():
    aapl = fetch_historical_data("AAPL", "2022-01-01", "2024-01-01", "1d")
    msft = fetch_historical_data("MSFT", "2022-01-01", "2024-01-01", "1d")
    intraday_start = (date.today() - timedelta(days=45)).isoformat()
    intraday_end = (date.today() - timedelta(days=1)).isoformat()
    intraday = fetch_historical_data("AAPL", intraday_start, intraday_end, "15m")

    cost_configs = [
        {"initial_capital": 10000.0, "commission_pct": 0.001, "spread_pct": 0.0002, "slippage_pct": 0.0001, "overnight_financing_pct": 0.0},
        {"initial_capital": 10000.0, "commission_pct": 0.001, "spread_pct": 0.0002, "slippage_pct": 0.0001, "overnight_financing_pct": 0.0005},
    ]

    for costs in cost_configs:
        tag = "zero-financing" if costs["overnight_financing_pct"] == 0 else "nonzero-financing"

        sma_signals = SMACrossover(aapl, short_window=10, long_window=30).generate_signals()
        _compare(f"SMA/{tag}", sma_signals, **costs)

        bb_signals = BollingerBands(aapl, window=20, num_std=2.0).generate_signals()
        _compare(f"Bollinger/{tag}", bb_signals, **costs)

        ml_signals = MLRandomForest(aapl, train_split=0.6).generate_signals()
        _compare(f"ML/{tag}", ml_signals, **costs)

        statarb_signals = StatArbitrageStrategy(
            aapl, pair_data=msft, lookback_window=30, entry_z=1.5, exit_z=0.5
        ).generate_signals()
        _compare(f"StatArb/{tag}", statarb_signals, **costs)

        intraday_signals = SMACrossover(intraday, short_window=5, long_window=15).generate_signals()
        _compare(f"SMA-intraday/{tag}", intraday_signals, **costs)

    print("\nAll parity checks passed.")


if __name__ == "__main__":
    main()
