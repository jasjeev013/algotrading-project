# Slice 5 — Mean Reversion Strategies: RSI, Z-Score, Contrarian

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Spec:** `docs/superpowers/specs/2026-08-22-v3-strategy-library-design.md`
**Depends on:** Slices 1–4 complete.

**Goal:** Add three Mean Reversion strategies alongside the existing Bollinger Bands.

**Delivers:** RSI, Z-Score Reversion, and Contrarian backtest successfully. Z-Score shows three price-scale band overlays (mean, upper, lower).

**Files touched:**
- Modify: `backend/strategies.py`
- Modify: `backend/strategy_registry.py`
- Modify: `backend/tests/test_strategies.py`
- Modify: `frontend/src/components/StrategyParamsFields.jsx`

---

## Task 1 — Implement RSI Mean Reversion, Z-Score Reversion, Contrarian

- [ ] Add to `backend/tests/test_strategies.py`:

```python
from strategies import RSIMeanReversion, ZScoreReversion, ContrarianStrategy

def test_rsi_signals():
    df = RSIMeanReversion(_make_data(120), rsi_period=14, rsi_oversold=30, rsi_overbought=70).generate_signals()
    assert "rsi" in df.columns
    assert set(df["position"].dropna().unique()).issubset({-1, 0, 1})

def test_zscore_signals():
    df = ZScoreReversion(_make_data(120), zscore_window=20, zscore_entry=2.0, zscore_exit=0.5).generate_signals()
    assert "zscore_mean" in df.columns and "zscore_upper" in df.columns and "zscore_lower" in df.columns
    assert set(df["position"].dropna().unique()).issubset({-1, 0, 1})

def test_zscore_indicator_columns():
    keys = [c["key"] for c in ZScoreReversion.INDICATOR_COLUMNS]
    assert set(keys) == {"zscore_mean", "zscore_upper", "zscore_lower"}

def test_contrarian_signals():
    df = ContrarianStrategy(_make_data(120), contrarian_lookback=5, contrarian_threshold=0.03).generate_signals()
    assert set(df["position"].dropna().unique()).issubset({-1, 0, 1})
```

- [ ] Run — confirm FAIL, then add a module-level RSI helper and all three classes to `backend/strategies.py`:

```python
def _compute_rsi(close: pd.Series, period: int = 14) -> pd.Series:
    delta    = close.diff()
    avg_gain = delta.clip(lower=0).ewm(alpha=1 / period, min_periods=period, adjust=False).mean()
    avg_loss = (-delta.clip(upper=0)).ewm(alpha=1 / period, min_periods=period, adjust=False).mean()
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


class RSIMeanReversion(BaseStrategy):
    """Long when RSI < oversold; Short when RSI > overbought. Holds until opposite signal fires.
    Params: rsi_period (14), rsi_oversold (30), rsi_overbought (70)."""

    INDICATOR_COLUMNS = []

    def generate_signals(self) -> pd.DataFrame:
        period     = int(self.params.get("rsi_period", 14))
        oversold   = float(self.params.get("rsi_oversold", 30))
        overbought = float(self.params.get("rsi_overbought", 70))
        df = self.data.copy()
        df["rsi"]      = _compute_rsi(df["close"], period)
        df["position"] = np.nan
        df.loc[df["rsi"] < oversold,   "position"] = 1
        df.loc[df["rsi"] > overbought, "position"] = -1
        df["position"] = df["position"].ffill().fillna(0)
        df.iloc[:period, df.columns.get_loc("position")] = 0
        df["signal"] = df["position"].diff().fillna(0)
        return df


class ZScoreReversion(BaseStrategy):
    """
    Rolling z-score of price vs its own mean.
    Long when z < -entry_z; Short when z > entry_z; flat when |z| < exit_z.
    Returns price-scale bands as overlays.
    Params: zscore_window (20), zscore_entry (2.0), zscore_exit (0.5).
    """

    INDICATOR_COLUMNS = [
        {"key": "zscore_mean",  "label": "Z Mean",  "color": "#9E9E9E"},
        {"key": "zscore_upper", "label": "Z Upper", "color": "#f44336"},
        {"key": "zscore_lower", "label": "Z Lower", "color": "#4CAF50"},
    ]

    def generate_signals(self) -> pd.DataFrame:
        window  = int(self.params.get("zscore_window", 20))
        entry_z = float(self.params.get("zscore_entry", 2.0))
        exit_z  = float(self.params.get("zscore_exit", 0.5))
        df = self.data.copy()
        rmean = df["close"].rolling(window).mean()
        rstd  = df["close"].rolling(window).std()
        df["zscore_mean"]  = rmean
        df["zscore_upper"] = rmean + entry_z * rstd
        df["zscore_lower"] = rmean - entry_z * rstd
        z = (df["close"] - rmean) / rstd
        df["position"] = np.nan
        df.loc[z < -entry_z,     "position"] = 1
        df.loc[z >  entry_z,     "position"] = -1
        df.loc[z.abs() < exit_z, "position"] = 0
        df["position"] = df["position"].ffill().fillna(0)
        df.iloc[:window, df.columns.get_loc("position")] = 0
        df["signal"] = df["position"].diff().fillna(0)
        return df


class ContrarianStrategy(BaseStrategy):
    """Buy recent drops; short recent rallies. Params: contrarian_lookback (5), contrarian_threshold (0.03 = 3%)."""

    INDICATOR_COLUMNS = []

    def generate_signals(self) -> pd.DataFrame:
        lookback  = int(self.params.get("contrarian_lookback", 5))
        threshold = float(self.params.get("contrarian_threshold", 0.03))
        df = self.data.copy()
        df["ret_n"]    = df["close"].pct_change(periods=lookback)
        df["position"] = np.nan
        df.loc[df["ret_n"] < -threshold, "position"] = 1
        df.loc[df["ret_n"] >  threshold, "position"] = -1
        df["position"] = df["position"].ffill().fillna(0)
        df.iloc[:lookback, df.columns.get_loc("position")] = 0
        df["signal"] = df["position"].diff().fillna(0)
        return df
```

- [ ] Run tests — confirm PASS

```bash
pytest backend/tests/test_strategies.py -k "rsi or zscore or contrarian" -v
```

---

## Task 2 — Register + frontend params UI

- [ ] Update `backend/strategy_registry.py`:

```python
from strategies import (
    SMACrossover, BollingerBands, MLRandomForest, StatArbitrageStrategy,
    EMACrossover, MACDStrategy, ChannelBreakout,
    ROCStrategy, NDayMomentum, RelativeMomentum, PriceMomentum,
    RSIMeanReversion, ZScoreReversion, ContrarianStrategy,
)

STRATEGY_REGISTRY = {
    "SMA": SMACrossover, "EMA": EMACrossover, "MACD": MACDStrategy, "Breakout": ChannelBreakout,
    "ROC": ROCStrategy, "NDayMom": NDayMomentum, "RelMom": RelativeMomentum, "PriceMom": PriceMomentum,
    "Bollinger": BollingerBands, "RSI": RSIMeanReversion, "ZScore": ZScoreReversion, "Contrarian": ContrarianStrategy,
    "ML": MLRandomForest, "StatArb": StatArbitrageStrategy,
}

LIVE_ELIGIBLE_STRATEGIES = {"SMA", "Bollinger"}
```

- [ ] Add params UI in `StrategyParamsFields.jsx` (before `return null`):

```jsx
if (strategy === "RSI") {
  return (
    <div className="params-box">
      <div className="input-group">
        <label>RSI Period</label>
        <input type="number" min="2" value={params.rsi_period} onChange={(e) => setParam("rsi_period", e.target.value)} />
      </div>
      <div className="input-row">
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label>Oversold</label>
          <input type="number" min="1" max="49" value={params.rsi_oversold} onChange={(e) => setParam("rsi_oversold", e.target.value)} />
        </div>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label>Overbought</label>
          <input type="number" min="51" max="99" value={params.rsi_overbought} onChange={(e) => setParam("rsi_overbought", e.target.value)} />
        </div>
      </div>
    </div>
  );
}

if (strategy === "ZScore") {
  return (
    <div className="params-box">
      <div className="input-group">
        <label>Rolling Window</label>
        <input type="number" min="5" value={params.zscore_window} onChange={(e) => setParam("zscore_window", e.target.value)} />
      </div>
      <div className="input-row">
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label>Entry Z-Score</label>
          <input type="number" step="0.1" min="0.5" value={params.zscore_entry} onChange={(e) => setParam("zscore_entry", e.target.value)} />
        </div>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label>Exit Z-Score</label>
          <input type="number" step="0.1" min="0" value={params.zscore_exit} onChange={(e) => setParam("zscore_exit", e.target.value)} />
        </div>
      </div>
    </div>
  );
}

if (strategy === "Contrarian") {
  return (
    <div className="params-box">
      <div className="input-row">
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label>Lookback (days)</label>
          <input type="number" min="1" value={params.contrarian_lookback} onChange={(e) => setParam("contrarian_lookback", e.target.value)} />
        </div>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label>Threshold (%)</label>
          <input type="number" step="0.5" min="0" value={(params.contrarian_threshold * 100).toFixed(1)}
            onChange={(e) => setParam("contrarian_threshold", parseFloat(e.target.value) / 100)} />
        </div>
      </div>
      <p className="params-hint">Buy when {params.contrarian_lookback}-day return &lt; −{(params.contrarian_threshold * 100).toFixed(1)}%.</p>
    </div>
  );
}
```

- [ ] Run full test suite

```bash
pytest backend/tests/ -v
```

- [ ] Manual test: run RSI, Z-Score, Contrarian with AAPL 2022-2023. Z-Score must show grey mean + red upper + green lower bands with three checkboxes.

- [ ] Commit

```bash
git add backend/strategies.py backend/strategy_registry.py backend/tests/test_strategies.py frontend/src/components/StrategyParamsFields.jsx
git commit -m "feat(v3/slice5): RSI Mean Reversion, Z-Score Reversion, Contrarian"
```
