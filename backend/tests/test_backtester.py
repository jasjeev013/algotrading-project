import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pandas as pd

from app.services.backtester import run_iterative_backtest


def _signals_df(positions, prices):
    return pd.DataFrame(
        {
            "time": [f"2020-01-{i + 1:02d}" for i in range(len(positions))],
            "close": prices,
            "position": positions,
        }
    )


def test_open_position_left_dangling_by_default():
    # Long the whole way through, never flattened -- no closing trade is
    # logged, and the final equity point is only mark-to-market.
    df = _signals_df([1, 1, 1], [100.0, 101.0, 105.0])
    equity_curve, trade_log = run_iterative_backtest(df, initial_capital=10000.0)

    assert trade_log == []
    assert equity_curve[-1]["equity"] > 10000.0  # unrealized gain reflected


def test_force_close_at_end_logs_exit_and_realizes_pnl():
    df = _signals_df([1, 1, 1], [100.0, 101.0, 105.0])
    equity_curve, trade_log = run_iterative_backtest(
        df, initial_capital=10000.0, force_close_at_end=True
    )

    assert len(trade_log) == 1
    closed_trade = trade_log[0]
    assert closed_trade["type"] == "LONG"
    assert closed_trade["forced_close"] is True
    assert closed_trade["exit_date"] == "2020-01-03"
    # The forced close applies exit costs (commission/spread/slippage) that a
    # pure mark-to-market close never charged, so realized equity should be
    # slightly below (or equal to, with zero costs) the unrealized figure.
    assert equity_curve[-1]["equity"] == closed_trade["equity_after"]


def test_force_close_at_end_is_noop_when_already_flat():
    df = _signals_df([1, 0, 0], [100.0, 101.0, 105.0])
    equity_curve, trade_log = run_iterative_backtest(
        df, initial_capital=10000.0, force_close_at_end=True
    )

    assert len(trade_log) == 1
    assert trade_log[0].get("forced_close") is None
