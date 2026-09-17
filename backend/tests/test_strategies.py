import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import numpy as np
import pytest
from app.services.strategies import (
    BuyAndHold,
    SMACrossover,
    BollingerBands,
    EMACrossover,
    MACDStrategy,
    RSIMeanReversion,
    ContrarianStrategy,
    NDayMomentum,
)

def _make_data(n=120):
    np.random.seed(42)
    close = 100 + np.cumsum(np.random.randn(n) * 0.5)
    rows = []
    for i in range(n):
        rows.append({
            "time": f"2020-{(i // 30 + 1):02d}-{(i % 28 + 1):02d}",
            "open": float(close[i] - 0.1), "high": float(close[i] + 0.2),
            "low": float(close[i] - 0.2),  "close": float(close[i]), "volume": 1000.0,
        })
    return rows

def test_buy_and_hold_stays_long():
    df = BuyAndHold(_make_data()).generate_signals()
    assert (df["position"] == 1).all()
    # Never changes position after bar 0, so signal (position.diff()) is
    # always 0 -- same as every other strategy's untradeable first row.
    assert (df["signal"] == 0).all()

def test_sma_has_indicator_columns():
    keys = [c["key"] for c in SMACrossover.INDICATOR_COLUMNS]
    assert "sma_short" in keys and "sma_long" in keys

def test_bollinger_has_indicator_columns():
    keys = [c["key"] for c in BollingerBands.INDICATOR_COLUMNS]
    assert "bb_middle" in keys and "upper_band" in keys and "lower_band" in keys

def test_sma_signal_df_has_columns():
    df = SMACrossover(_make_data(), short_window=10, long_window=20).generate_signals()
    assert "sma_short" in df.columns and "sma_long" in df.columns

def test_bollinger_signal_df_has_columns():
    df = BollingerBands(_make_data(), window=10, num_std=2.0).generate_signals()
    assert "bb_middle" in df.columns and "upper_band" in df.columns and "lower_band" in df.columns

def test_ema_crossover_signals():
    df = EMACrossover(_make_data(120), ema_short=10, ema_long=20).generate_signals()
    assert "ema_short" in df.columns and "ema_long" in df.columns
    assert set(df["position"].dropna().unique()).issubset({-1, 0, 1})

def test_ema_indicator_columns():
    keys = [c["key"] for c in EMACrossover.INDICATOR_COLUMNS]
    assert "ema_short" in keys and "ema_long" in keys

def test_macd_signals():
    df = MACDStrategy(_make_data(120), macd_fast=12, macd_slow=26, macd_signal_period=9).generate_signals()
    assert "macd_line" in df.columns and "macd_signal_line" in df.columns
    assert set(df["position"].dropna().unique()).issubset({-1, 0, 1})

def test_macd_indicator_columns_are_oscillator_scale():
    keys = [c["key"] for c in MACDStrategy.INDICATOR_COLUMNS]
    assert "macd_line" in keys and "macd_signal_line" in keys
    assert all(c["scale"] == "oscillator" for c in MACDStrategy.INDICATOR_COLUMNS)

def test_rsi_signals():
    df = RSIMeanReversion(_make_data(120), rsi_period=14, rsi_oversold=30, rsi_overbought=70).generate_signals()
    assert "rsi" in df.columns
    assert set(df["position"].dropna().unique()).issubset({-1, 0, 1})

def test_rsi_indicator_columns_are_oscillator_scale():
    keys = [c["key"] for c in RSIMeanReversion.INDICATOR_COLUMNS]
    assert "rsi" in keys
    assert all(c["scale"] == "oscillator" for c in RSIMeanReversion.INDICATOR_COLUMNS)

def test_contrarian_signals():
    df = ContrarianStrategy(_make_data(120), contrarian_lookback=5, contrarian_threshold=0.03).generate_signals()
    assert set(df["position"].dropna().unique()).issubset({-1, 0, 1})

def test_nday_momentum_signals():
    df = NDayMomentum(_make_data(120), nday_lookback=20).generate_signals()
    assert set(df["position"].dropna().unique()).issubset({-1, 0, 1})
