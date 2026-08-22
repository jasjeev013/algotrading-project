# Slice 4 — Momentum Strategies: ROC, N-Day, Relative, Price Momentum

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Spec:** `docs/superpowers/specs/2026-08-22-v3-strategy-library-design.md`
**Depends on:** Slices 1–3 complete.

**Goal:** Add four Momentum strategies. None have price-scale overlays.

**Delivers:** ROC, N-Day Momentum, Relative Momentum, Price Momentum all backtest and show buy/sell markers. Params UI for each.

**Note on data requirements:**
- ROC, N-Day, Relative Momentum: work fine with 1–2 years of data
- Price Momentum: needs 273+ bars (252 formation + 21 skip). Test with AAPL 2020-2023.

**Files touched:**
- Modify: `backend/strategies.py`
- Modify: `backend/strategy_registry.py`
- Modify: `backend/tests/test_strategies.py`
- Modify: `frontend/src/components/StrategyParamsFields.jsx`

---

## Task 1 — Implement all four Momentum strategies

- [ ] Add to `backend/tests/test_strategies.py`:

```python
from strategies import ROCStrategy, NDayMomentum, RelativeMomentum, PriceMomentum

def test_roc_signals():
    df = ROCStrategy(_make_data(120), roc_period=10, roc_threshold=0).generate_signals()
    assert "roc" in df.columns
    assert set(df["position"].dropna().unique()).issubset({-1, 0, 1})

def test_nday_momentum_signals():
    df = NDayMomentum(_make_data(120), nday_lookback=20).generate_signals()
    assert set(df["position"].dropna().unique()).issubset({-1, 0, 1})

def test_relative_momentum_signals():
    df = RelativeMomentum(_make_data(300), relMom_period=63, relMom_long_pct=60, relMom_short_pct=40).generate_signals()
    assert set(df["position"].dropna().unique()).issubset({-1, 0, 1})

def test_price_momentum_signals():
    df = PriceMomentum(_make_data(300), price_mom_window=252, price_mom_skip=21).generate_signals()
    assert set(df["position"].dropna().unique()).issubset({-1, 0, 1})
```

- [ ] Run — confirm FAIL, then add all four classes to `backend/strategies.py`:

```python
class ROCStrategy(BaseStrategy):
    """Long when ROC > threshold; Short when ROC < -threshold. Params: roc_period (10), roc_threshold (0)."""

    INDICATOR_COLUMNS = []

    def generate_signals(self) -> pd.DataFrame:
        period    = int(self.params.get("roc_period", 10))
        threshold = float(self.params.get("roc_threshold", 0))
        df = self.data.copy()
        df["roc"]      = (df["close"] / df["close"].shift(period) - 1) * 100
        df["position"] = np.where(df["roc"] > threshold, 1, np.where(df["roc"] < -threshold, -1, 0))
        df.iloc[:period, df.columns.get_loc("position")] = 0
        df["signal"] = df["position"].diff().fillna(0)
        return df


class NDayMomentum(BaseStrategy):
    """Long if close > close N days ago; Short otherwise. Params: nday_lookback (20)."""

    INDICATOR_COLUMNS = []

    def generate_signals(self) -> pd.DataFrame:
        lookback = int(self.params.get("nday_lookback", 20))
        df = self.data.copy()
        df["position"] = np.where(df["close"] > df["close"].shift(lookback), 1, -1).astype(float)
        df.iloc[:lookback, df.columns.get_loc("position")] = 0
        df["signal"] = df["position"].diff().fillna(0)
        return df


class RelativeMomentum(BaseStrategy):
    """
    Long when N-day return ranks above relMom_long_pct percentile of recent history.
    Short when rank below relMom_short_pct. Uses ticker's own return history as benchmark.
    Params: relMom_period (63), relMom_long_pct (60), relMom_short_pct (40).
    """

    INDICATOR_COLUMNS = []

    def generate_signals(self) -> pd.DataFrame:
        period    = int(self.params.get("relMom_period", 63))
        long_pct  = float(self.params.get("relMom_long_pct", 60))
        short_pct = float(self.params.get("relMom_short_pct", 40))
        df = self.data.copy()
        df["ret"] = df["close"].pct_change(periods=period)
        df["rank"] = df["ret"].rolling(252, min_periods=126).apply(
            lambda x: float(pd.Series(x).rank(pct=True).iloc[-1] * 100), raw=False
        )
        df["position"] = np.where(df["rank"] > long_pct, 1,
                         np.where(df["rank"] < short_pct, -1, 0))
        df["position"] = df["position"].fillna(0)
        df["signal"]   = df["position"].diff().fillna(0)
        return df


class PriceMomentum(BaseStrategy):
    """
    Jegadeesh-Titman 12-1 month momentum.
    mom = close.shift(skip) / close.shift(window+skip) - 1
    Long if positive; Short if negative.
    Params: price_mom_window (252), price_mom_skip (21). Needs 273+ bars.
    """

    INDICATOR_COLUMNS = []

    def generate_signals(self) -> pd.DataFrame:
        window = int(self.params.get("price_mom_window", 252))
        skip   = int(self.params.get("price_mom_skip", 21))
        df = self.data.copy()
        df["mom"]      = df["close"].shift(skip) / df["close"].shift(window + skip) - 1
        df["position"] = np.where(df["mom"] > 0, 1.0, -1.0)
        df.iloc[:(window + skip), df.columns.get_loc("position")] = 0
        df["position"] = df["position"].fillna(0)
        df["signal"]   = df["position"].diff().fillna(0)
        return df
```

- [ ] Run tests — confirm PASS

```bash
pytest backend/tests/test_strategies.py -k "roc or nday or relative or price_momentum" -v
```

---

## Task 2 — Register + frontend params UI

- [ ] Update `backend/strategy_registry.py`:

```python
from strategies import (
    SMACrossover, BollingerBands, MLRandomForest, StatArbitrageStrategy,
    EMACrossover, MACDStrategy, ChannelBreakout,
    ROCStrategy, NDayMomentum, RelativeMomentum, PriceMomentum,
)

STRATEGY_REGISTRY = {
    "SMA": SMACrossover, "EMA": EMACrossover, "MACD": MACDStrategy, "Breakout": ChannelBreakout,
    "ROC": ROCStrategy, "NDayMom": NDayMomentum, "RelMom": RelativeMomentum, "PriceMom": PriceMomentum,
    "Bollinger": BollingerBands, "ML": MLRandomForest, "StatArb": StatArbitrageStrategy,
}

LIVE_ELIGIBLE_STRATEGIES = {"SMA", "Bollinger"}
```

- [ ] Add params UI in `StrategyParamsFields.jsx` (before `return null`):

```jsx
if (strategy === "ROC") {
  return (
    <div className="params-box">
      <div className="input-row">
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label>ROC Period</label>
          <input type="number" min="1" value={params.roc_period} onChange={(e) => setParam("roc_period", e.target.value)} />
        </div>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label>Threshold (%)</label>
          <input type="number" step="0.5" value={params.roc_threshold} onChange={(e) => setParam("roc_threshold", e.target.value)} />
        </div>
      </div>
      <p className="params-hint">Long when ROC &gt; threshold; Short when ROC &lt; −threshold.</p>
    </div>
  );
}

if (strategy === "NDayMom") {
  return (
    <div className="params-box">
      <div className="input-group" style={{ marginBottom: 0 }}>
        <label>Lookback (days)</label>
        <input type="number" min="1" value={params.nday_lookback} onChange={(e) => setParam("nday_lookback", e.target.value)} />
        <p className="params-hint">Long if today's price &gt; price {params.nday_lookback} days ago.</p>
      </div>
    </div>
  );
}

if (strategy === "RelMom") {
  return (
    <div className="params-box">
      <div className="input-group">
        <label>Return Period (days)</label>
        <input type="number" min="1" value={params.relMom_period} onChange={(e) => setParam("relMom_period", e.target.value)} />
      </div>
      <div className="input-row">
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label>Long above (%ile)</label>
          <input type="number" min="51" max="99" value={params.relMom_long_pct} onChange={(e) => setParam("relMom_long_pct", e.target.value)} />
        </div>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label>Short below (%ile)</label>
          <input type="number" min="1" max="49" value={params.relMom_short_pct} onChange={(e) => setParam("relMom_short_pct", e.target.value)} />
        </div>
      </div>
    </div>
  );
}

if (strategy === "PriceMom") {
  return (
    <div className="params-box">
      <div className="input-row">
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label>Formation Window</label>
          <input type="number" min="1" value={params.price_mom_window} onChange={(e) => setParam("price_mom_window", e.target.value)} />
        </div>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label>Skip Days</label>
          <input type="number" min="0" value={params.price_mom_skip} onChange={(e) => setParam("price_mom_skip", e.target.value)} />
        </div>
      </div>
      <p className="params-hint">Needs at least {+params.price_mom_window + +params.price_mom_skip} bars of history.</p>
    </div>
  );
}
```

- [ ] Run full test suite

```bash
pytest backend/tests/ -v
```

- [ ] Manual test: run each Momentum strategy with AAPL 2020-2023. Verify metrics display and at least one trade logged. No overlay checkboxes on any of the four.

- [ ] Commit

```bash
git add backend/strategies.py backend/strategy_registry.py backend/tests/test_strategies.py frontend/src/components/StrategyParamsFields.jsx
git commit -m "feat(v3/slice4): ROC, N-Day Momentum, Relative Momentum, Price Momentum"
```
