# Slice 6 — Volatility Strategies: ATR Breakout, BB Width Squeeze, Vol Regime Switch

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Spec:** `docs/superpowers/specs/2026-08-22-v3-strategy-library-design.md`
**Depends on:** Slices 1–5 complete.

**Goal:** Add three Volatility strategies. ATR Breakout has price-scale channel overlays.

**Delivers:** All 14 strategies in the library working end-to-end. ATR Breakout shows two channel lines. Full V3 manual test checklist passes.

**Files touched:**
- Modify: `backend/strategies.py`
- Modify: `backend/strategy_registry.py`
- Modify: `backend/tests/test_strategies.py`
- Modify: `frontend/src/components/StrategyParamsFields.jsx`

---

## Task 1 — Implement ATR Breakout, BB Width Squeeze, Vol Regime Switch

- [ ] Add to `backend/tests/test_strategies.py`:

```python
from strategies import ATRBreakout, BBWidthSqueeze, VolRegimeSwitch

def test_atr_breakout_signals():
    df = ATRBreakout(_make_data(120), atr_period=14, atr_multiplier=2.0, atr_lookback=20).generate_signals()
    assert "atr_upper" in df.columns and "atr_lower" in df.columns
    assert set(df["position"].dropna().unique()).issubset({-1, 0, 1})

def test_atr_indicator_columns():
    keys = [c["key"] for c in ATRBreakout.INDICATOR_COLUMNS]
    assert "atr_upper" in keys and "atr_lower" in keys

def test_bbwidth_signals():
    df = BBWidthSqueeze(_make_data(200), bbwidth_window=20, bbwidth_std=2.0, bbwidth_squeeze_pct=25).generate_signals()
    assert set(df["position"].dropna().unique()).issubset({-1, 0, 1})

def test_vol_regime_signals():
    df = VolRegimeSwitch(_make_data(120), vol_window=20, vol_threshold=0.015).generate_signals()
    assert set(df["position"].dropna().unique()).issubset({-1, 0, 1})
```

- [ ] Run — confirm FAIL, then add a module-level ATR helper and all three classes to `backend/strategies.py`:

```python
def _compute_atr(df: pd.DataFrame, period: int) -> pd.Series:
    prev_close = df["close"].shift(1)
    true_range = pd.concat([
        df["high"] - df["low"],
        (df["high"] - prev_close).abs(),
        (df["low"]  - prev_close).abs(),
    ], axis=1).max(axis=1)
    return true_range.ewm(alpha=1 / period, min_periods=period, adjust=False).mean()


class ATRBreakout(BaseStrategy):
    """
    ATR-based channel breakout.
    Channel = rolling_mean ± atr_multiplier × ATR(period).
    Long when price breaks above upper channel; Short when below lower.
    Params: atr_period (14), atr_multiplier (2.0), atr_lookback (20).
    """

    INDICATOR_COLUMNS = [
        {"key": "atr_upper", "label": "ATR Upper", "color": "#E91E63"},
        {"key": "atr_lower", "label": "ATR Lower", "color": "#00BCD4"},
    ]

    def generate_signals(self) -> pd.DataFrame:
        atr_period = int(self.params.get("atr_period", 14))
        multiplier = float(self.params.get("atr_multiplier", 2.0))
        lookback   = int(self.params.get("atr_lookback", 20))
        df = self.data.copy()
        atr = _compute_atr(df, atr_period)
        mid = df["close"].rolling(window=lookback).mean()
        df["atr_upper"] = mid + multiplier * atr
        df["atr_lower"] = mid - multiplier * atr
        df["position"]  = np.nan
        df.loc[df["close"] > df["atr_upper"], "position"] = 1
        df.loc[df["close"] < df["atr_lower"], "position"] = -1
        df["position"] = df["position"].ffill().fillna(0)
        df.iloc[:lookback, df.columns.get_loc("position")] = 0
        df["signal"] = df["position"].diff().fillna(0)
        return df


class BBWidthSqueeze(BaseStrategy):
    """
    Bollinger Band Width squeeze strategy.
    Waits for BBW to contract into a squeeze (below rolling Nth percentile),
    then trades the direction of expansion when price exits the bands.
    Params: bbwidth_window (20), bbwidth_std (2.0), bbwidth_squeeze_pct (25).
    """

    INDICATOR_COLUMNS = []

    def generate_signals(self) -> pd.DataFrame:
        window      = int(self.params.get("bbwidth_window", 20))
        num_std     = float(self.params.get("bbwidth_std", 2.0))
        squeeze_pct = float(self.params.get("bbwidth_squeeze_pct", 25))
        df = self.data.copy()
        mid   = df["close"].rolling(window).mean()
        std   = df["close"].rolling(window).std()
        upper = mid + num_std * std
        lower = mid - num_std * std
        bbw   = (upper - lower) / mid
        squeeze_threshold = bbw.rolling(window * 5, min_periods=window).quantile(squeeze_pct / 100)
        in_squeeze = bbw < squeeze_threshold
        df["position"] = np.nan
        df.loc[(~in_squeeze) & (df["close"] > upper), "position"] = 1
        df.loc[(~in_squeeze) & (df["close"] < lower), "position"] = -1
        df["position"] = df["position"].ffill().fillna(0)
        df.iloc[:window, df.columns.get_loc("position")] = 0
        df["signal"] = df["position"].diff().fillna(0)
        return df


class VolRegimeSwitch(BaseStrategy):
    """
    Meta-strategy: switches between trend-following and mean-reversion based on realised volatility.
    High vol (vol > threshold): mean-revert (fade moves).
    Low vol (vol <= threshold): trend-follow (go with price direction vs rolling mean).
    Params: vol_window (20), vol_threshold (0.015).
    """

    INDICATOR_COLUMNS = []

    def generate_signals(self) -> pd.DataFrame:
        window    = int(self.params.get("vol_window", 20))
        threshold = float(self.params.get("vol_threshold", 0.015))
        df = self.data.copy()
        df["returns"]      = df["close"].pct_change()
        df["realised_vol"] = df["returns"].rolling(window).std()
        rmean = df["close"].rolling(window).mean()
        high_vol   = df["realised_vol"] > threshold
        above_mean = df["close"] > rmean
        df["position"] = np.where(high_vol,
            np.where(above_mean, -1.0, 1.0),   # mean-revert
            np.where(above_mean,  1.0, -1.0),  # trend-follow
        )
        df.iloc[:window, df.columns.get_loc("position")] = 0
        df["position"] = df["position"].fillna(0)
        df["signal"]   = df["position"].diff().fillna(0)
        return df
```

- [ ] Run tests — confirm PASS

```bash
pytest backend/tests/test_strategies.py -k "atr or bbwidth or vol_regime" -v
```

---

## Task 2 — Register + frontend params UI

- [ ] Final `backend/strategy_registry.py`:

```python
from strategies import (
    SMACrossover, BollingerBands, MLRandomForest, StatArbitrageStrategy,
    EMACrossover, MACDStrategy, ChannelBreakout,
    ROCStrategy, NDayMomentum, RelativeMomentum, PriceMomentum,
    RSIMeanReversion, ZScoreReversion, ContrarianStrategy,
    ATRBreakout, BBWidthSqueeze, VolRegimeSwitch,
)

STRATEGY_REGISTRY = {
    # Trend
    "SMA": SMACrossover, "EMA": EMACrossover, "MACD": MACDStrategy, "Breakout": ChannelBreakout,
    # Momentum
    "ROC": ROCStrategy, "NDayMom": NDayMomentum, "RelMom": RelativeMomentum, "PriceMom": PriceMomentum,
    # Mean Reversion
    "Bollinger": BollingerBands, "RSI": RSIMeanReversion, "ZScore": ZScoreReversion, "Contrarian": ContrarianStrategy,
    # Volatility
    "ATRBreakout": ATRBreakout, "BBWidth": BBWidthSqueeze, "VolRegime": VolRegimeSwitch,
    # Statistical / ML
    "ML": MLRandomForest, "StatArb": StatArbitrageStrategy,
}

LIVE_ELIGIBLE_STRATEGIES = {"SMA", "Bollinger"}
```

- [ ] Add params UI in `StrategyParamsFields.jsx` (before `return null`):

```jsx
if (strategy === "ATRBreakout") {
  return (
    <div className="params-box">
      <div className="input-row">
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label>ATR Period</label>
          <input type="number" min="1" value={params.atr_period} onChange={(e) => setParam("atr_period", e.target.value)} />
        </div>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label>ATR Multiplier</label>
          <input type="number" step="0.1" min="0.1" value={params.atr_multiplier} onChange={(e) => setParam("atr_multiplier", e.target.value)} />
        </div>
      </div>
      <div className="input-group">
        <label>Channel Lookback</label>
        <input type="number" min="2" value={params.atr_lookback} onChange={(e) => setParam("atr_lookback", e.target.value)} />
      </div>
    </div>
  );
}

if (strategy === "BBWidth") {
  return (
    <div className="params-box">
      <div className="input-row">
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label>BB Window</label>
          <input type="number" min="5" value={params.bbwidth_window} onChange={(e) => setParam("bbwidth_window", e.target.value)} />
        </div>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label>Std Dev</label>
          <input type="number" step="0.1" min="0.5" value={params.bbwidth_std} onChange={(e) => setParam("bbwidth_std", e.target.value)} />
        </div>
      </div>
      <div className="input-group">
        <label>Squeeze Percentile</label>
        <input type="number" min="5" max="49" value={params.bbwidth_squeeze_pct} onChange={(e) => setParam("bbwidth_squeeze_pct", e.target.value)} />
        <p className="params-hint">Trades when BBW expands above its {params.bbwidth_squeeze_pct}th-percentile squeeze threshold.</p>
      </div>
    </div>
  );
}

if (strategy === "VolRegime") {
  return (
    <div className="params-box">
      <div className="input-row">
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label>Vol Window (days)</label>
          <input type="number" min="5" value={params.vol_window} onChange={(e) => setParam("vol_window", e.target.value)} />
        </div>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label>Vol Threshold</label>
          <input type="number" step="0.001" min="0.001" value={params.vol_threshold} onChange={(e) => setParam("vol_threshold", e.target.value)} />
        </div>
      </div>
      <p className="params-hint">High vol (&gt; {params.vol_threshold}): mean-revert. Low vol: trend-follow.</p>
    </div>
  );
}
```

- [ ] Run full test suite

```bash
pytest backend/tests/ -v
```

---

## Task 3 — Final V3 Manual Test Checklist

- [ ] **Strategy dropdown** — all 17 strategies visible in 5 grouped sections

**Overlay lines appear (with checkboxes):**
- [ ] SMA → blue SMA Short + orange SMA Long
- [ ] EMA → cyan EMA Short + purple EMA Long
- [ ] Breakout → pink Channel High + cyan Channel Low
- [ ] Bollinger → grey middle + red upper + green lower bands
- [ ] Z-Score → grey mean + red upper + green lower
- [ ] ATR Breakout → pink ATR Upper + cyan ATR Lower

**No overlays (only buy/sell markers — correct):**
- [ ] MACD, ROC, N-Day Mom, Relative Mom, Price Mom — no checkboxes
- [ ] RSI, Contrarian — no checkboxes
- [ ] BB Width, Vol Regime — no checkboxes
- [ ] ML, StatArb — no checkboxes

**Toggle behaviour:**
- [ ] SMA: uncheck "SMA Long" → orange line disappears. Re-check → reappears.

**Walk-forward compatibility:**
- [ ] EMA Crossover on Walk-Forward tab → no error, equity curve shown

- [ ] Commit

```bash
git add backend/strategies.py backend/strategy_registry.py backend/tests/test_strategies.py frontend/src/components/StrategyParamsFields.jsx
git commit -m "feat(v3/slice6): ATR Breakout, BB Width Squeeze, Vol Regime Switch — V3 complete"
```
