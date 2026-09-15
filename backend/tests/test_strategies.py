import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import numpy as np
import pytest
from app.services.strategies import SMACrossover, BollingerBands

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
