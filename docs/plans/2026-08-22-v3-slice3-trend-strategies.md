# Slice 3 — Trend Strategies: EMA, MACD, Channel Breakout

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Spec:** `docs/superpowers/specs/2026-08-22-v3-strategy-library-design.md`
**Depends on:** Slices 1 and 2 complete.

**Goal:** Add three Trend strategies to the backend and wire up their params UI on the frontend.

**Delivers:** EMA Crossover, MACD Strategy, and Channel Breakout all backtest successfully. EMA and Breakout show indicator overlays.

**Files touched:**
- Modify: `backend/strategies.py`
- Modify: `backend/strategy_registry.py`
- Modify: `backend/tests/test_strategies.py`
- Modify: `frontend/src/components/StrategyParamsFields.jsx`

---

## Task 1 — Implement EMA Crossover

- [ ] Add to `backend/tests/test_strategies.py`:

```python
from strategies import EMACrossover

def test_ema_crossover_signals():
    df = EMACrossover(_make_data(120), ema_short=10, ema_long=20).generate_signals()
    assert "ema_short" in df.columns and "ema_long" in df.columns
    assert set(df["position"].dropna().unique()).issubset({-1, 0, 1})

def test_ema_indicator_columns():
    keys = [c["key"] for c in EMACrossover.INDICATOR_COLUMNS]
    assert "ema_short" in keys and "ema_long" in keys
```

- [ ] Run — confirm FAIL, then add to `backend/strategies.py` after `SMACrossover`:

```python
class EMACrossover(BaseStrategy):
    """Long when fast EMA > slow EMA. Params: ema_short (12), ema_long (26)."""

    INDICATOR_COLUMNS = [
        {"key": "ema_short", "label": "EMA Short", "color": "#00BCD4"},
        {"key": "ema_long",  "label": "EMA Long",  "color": "#9C27B0"},
    ]

    def generate_signals(self) -> pd.DataFrame:
        ema_short = int(self.params.get("ema_short", 12))
        ema_long  = int(self.params.get("ema_long", 26))
        df = self.data.copy()
        df["ema_short"] = df["close"].ewm(span=ema_short, adjust=False).mean()
        df["ema_long"]  = df["close"].ewm(span=ema_long,  adjust=False).mean()
        df["position"]  = np.where(df["ema_short"] > df["ema_long"], 1, -1)
        df.iloc[:ema_long, df.columns.get_loc("position")] = 0
        df["signal"] = df["position"].diff().fillna(0)
        return df
```

- [ ] Run tests — confirm PASS

```bash
pytest backend/tests/test_strategies.py::test_ema_crossover_signals backend/tests/test_strategies.py::test_ema_indicator_columns -v
```

---

## Task 2 — Implement MACD Strategy

- [ ] Add to test file:

```python
from strategies import MACDStrategy

def test_macd_signals():
    df = MACDStrategy(_make_data(120), macd_fast=12, macd_slow=26, macd_signal_period=9).generate_signals()
    assert "macd_line" in df.columns and "macd_signal_line" in df.columns
    assert set(df["position"].dropna().unique()).issubset({-1, 0, 1})
```

- [ ] Run — confirm FAIL, then add to `strategies.py` after `EMACrossover`:

```python
class MACDStrategy(BaseStrategy):
    """Long when MACD line > signal line. No price-scale overlays. Params: macd_fast (12), macd_slow (26), macd_signal_period (9)."""

    INDICATOR_COLUMNS = []

    def generate_signals(self) -> pd.DataFrame:
        fast   = int(self.params.get("macd_fast", 12))
        slow   = int(self.params.get("macd_slow", 26))
        signal = int(self.params.get("macd_signal_period", 9))
        df = self.data.copy()
        df["macd_line"]        = df["close"].ewm(span=fast, adjust=False).mean() - df["close"].ewm(span=slow, adjust=False).mean()
        df["macd_signal_line"] = df["macd_line"].ewm(span=signal, adjust=False).mean()
        df["position"] = np.where(df["macd_line"] > df["macd_signal_line"], 1, -1)
        df.iloc[:slow, df.columns.get_loc("position")] = 0
        df["signal"] = df["position"].diff().fillna(0)
        return df
```

- [ ] Run tests — confirm PASS

```bash
pytest backend/tests/test_strategies.py::test_macd_signals -v
```

---

## Task 3 — Implement Channel Breakout

- [ ] Add to test file:

```python
from strategies import ChannelBreakout

def test_channel_breakout_signals():
    df = ChannelBreakout(_make_data(120), breakout_lookback=20).generate_signals()
    assert "breakout_high" in df.columns and "breakout_low" in df.columns
    assert set(df["position"].dropna().unique()).issubset({-1, 0, 1})

def test_breakout_indicator_columns():
    keys = [c["key"] for c in ChannelBreakout.INDICATOR_COLUMNS]
    assert "breakout_high" in keys and "breakout_low" in keys
```

- [ ] Run — confirm FAIL, then add to `strategies.py`:

```python
class ChannelBreakout(BaseStrategy):
    """Donchian channel breakout. Long above N-day high; Short below N-day low. Params: breakout_lookback (20)."""

    INDICATOR_COLUMNS = [
        {"key": "breakout_high", "label": "Channel High", "color": "#E91E63"},
        {"key": "breakout_low",  "label": "Channel Low",  "color": "#00BCD4"},
    ]

    def generate_signals(self) -> pd.DataFrame:
        lookback = int(self.params.get("breakout_lookback", 20))
        df = self.data.copy()
        df["breakout_high"] = df["high"].shift(1).rolling(window=lookback).max()
        df["breakout_low"]  = df["low"].shift(1).rolling(window=lookback).min()
        df["position"] = np.nan
        df.loc[df["close"] > df["breakout_high"], "position"] = 1
        df.loc[df["close"] < df["breakout_low"],  "position"] = -1
        df["position"] = df["position"].ffill().fillna(0)
        df.iloc[:lookback, df.columns.get_loc("position")] = 0
        df["signal"] = df["position"].diff().fillna(0)
        return df
```

- [ ] Run tests — confirm PASS

```bash
pytest backend/tests/test_strategies.py::test_channel_breakout_signals backend/tests/test_strategies.py::test_breakout_indicator_columns -v
```

---

## Task 4 — Register + frontend params UI

- [ ] Update `backend/strategy_registry.py` (add EMA, MACD, Breakout to imports and dict):

```python
from strategies import (
    SMACrossover, BollingerBands, MLRandomForest, StatArbitrageStrategy,
    EMACrossover, MACDStrategy, ChannelBreakout,
)

STRATEGY_REGISTRY = {
    "SMA": SMACrossover, "EMA": EMACrossover, "MACD": MACDStrategy, "Breakout": ChannelBreakout,
    "Bollinger": BollingerBands, "ML": MLRandomForest, "StatArb": StatArbitrageStrategy,
}

LIVE_ELIGIBLE_STRATEGIES = {"SMA", "Bollinger"}
```

- [ ] Add to `frontend/src/components/StrategyParamsFields.jsx` (before `return null`):

```jsx
if (strategy === "EMA") {
  return (
    <div className="params-box">
      <div className="input-row">
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label>Short EMA</label>
          <input type="number" min="1" value={params.ema_short} onChange={(e) => setParam("ema_short", e.target.value)} />
        </div>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label>Long EMA</label>
          <input type="number" min="1" value={params.ema_long} onChange={(e) => setParam("ema_long", e.target.value)} />
        </div>
      </div>
    </div>
  );
}

if (strategy === "MACD") {
  return (
    <div className="params-box">
      <div className="input-row">
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label>Fast Period</label>
          <input type="number" min="1" value={params.macd_fast} onChange={(e) => setParam("macd_fast", e.target.value)} />
        </div>
        <div className="input-group" style={{ marginBottom: 0 }}>
          <label>Slow Period</label>
          <input type="number" min="1" value={params.macd_slow} onChange={(e) => setParam("macd_slow", e.target.value)} />
        </div>
      </div>
      <div className="input-group">
        <label>Signal Period</label>
        <input type="number" min="1" value={params.macd_signal_period} onChange={(e) => setParam("macd_signal_period", e.target.value)} />
      </div>
    </div>
  );
}

if (strategy === "Breakout") {
  return (
    <div className="params-box">
      <div className="input-group" style={{ marginBottom: 0 }}>
        <label>Lookback Window</label>
        <input type="number" min="2" value={params.breakout_lookback} onChange={(e) => setParam("breakout_lookback", e.target.value)} />
        <p className="params-hint">Long above {params.breakout_lookback}-day high; Short below {params.breakout_lookback}-day low.</p>
      </div>
    </div>
  );
}
```

- [ ] Run full test suite

```bash
pytest backend/tests/ -v
```

- [ ] Manual test: run each new strategy (AAPL 2022-2023). EMA → 2 overlay lines. MACD → no overlays. Breakout → 2 channel lines.

- [ ] Commit

```bash
git add backend/strategies.py backend/strategy_registry.py backend/tests/test_strategies.py frontend/src/components/StrategyParamsFields.jsx
git commit -m "feat(v3/slice3): EMA Crossover, MACD Strategy, Channel Breakout"
```
