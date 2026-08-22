# Slice 1 — Indicator Data Pipeline + Chart Overlays

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Spec:** `docs/superpowers/specs/2026-08-22-v3-strategy-library-design.md`

**Goal:** Backend computes indicator columns and returns them in the API response. TradingChart renders them as toggleable line overlays.

**Delivers:** SMA and Bollinger overlays visible on the chart with checkboxes to show/hide each line.

**Files touched:**
- Modify: `backend/strategies.py`
- Modify: `backend/main.py`
- Modify: `frontend/src/components/TradingChart.jsx`
- Modify: `frontend/src/App.jsx`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/test_strategies.py`

---

## Task 1 — Add `INDICATOR_COLUMNS` to SMACrossover and BollingerBands

- [ ] Create `backend/tests/__init__.py` (empty file)

- [ ] Create `backend/tests/test_strategies.py` with:

```python
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import numpy as np
import pytest
from strategies import SMACrossover, BollingerBands

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
```

- [ ] Run tests — confirm FAIL: `AttributeError: 'SMACrossover' has no attribute 'INDICATOR_COLUMNS'`

```bash
cd backend && source venv/bin/activate
pytest tests/test_strategies.py -v
```

- [ ] In `backend/strategies.py`, add class attribute to `SMACrossover` (above `generate_signals`):

```python
INDICATOR_COLUMNS = [
    {"key": "sma_short", "label": "SMA Short", "color": "#2196F3"},
    {"key": "sma_long",  "label": "SMA Long",  "color": "#FF9800"},
]
```

- [ ] Add class attribute to `BollingerBands` (above `generate_signals`):

```python
INDICATOR_COLUMNS = [
    {"key": "bb_middle",  "label": "BB Middle",     "color": "#9E9E9E"},
    {"key": "upper_band", "label": "BB Upper Band", "color": "#f44336"},
    {"key": "lower_band", "label": "BB Lower Band", "color": "#4CAF50"},
]
```

- [ ] In `BollingerBands.generate_signals()`, rename `"sma"` column to `"bb_middle"`:

```python
# Change this line:
df["sma"] = df["close"].rolling(window=window).mean()
# To:
df["bb_middle"] = df["close"].rolling(window=window).mean()
# Then update the two lines that reference df["sma"]:
df["upper_band"] = df["bb_middle"] + (df["std"] * num_std)
df["lower_band"] = df["bb_middle"] - (df["std"] * num_std)
```

- [ ] Run tests — confirm PASS

```bash
pytest tests/test_strategies.py -v
```

- [ ] Commit

```bash
git add backend/strategies.py backend/tests/
git commit -m "feat(v3/slice1): add INDICATOR_COLUMNS to SMA and Bollinger"
```

---

## Task 2 — Return `indicator_data` from the API

- [ ] Add helper function in `backend/main.py` (after imports, before the endpoints):

```python
def _extract_indicator_data(strategy_instance, signal_df) -> dict:
    result = {}
    for col_spec in getattr(strategy_instance, "INDICATOR_COLUMNS", []):
        col = col_spec["key"]
        if col not in signal_df.columns:
            continue
        series = signal_df[["time", col]].dropna(subset=[col])
        result[col] = {
            "label": col_spec["label"],
            "color": col_spec["color"],
            "data": [{"time": str(r["time"]), "value": float(r[col])} for _, r in series.iterrows()],
        }
    return result
```

- [ ] In the `POST /api/backtest` handler, add right after `signal_df = strategy_instance.generate_signals()`:

```python
indicator_data = _extract_indicator_data(strategy_instance, signal_df)
```

- [ ] Add `"indicator_data": indicator_data` to the backtest return dict (alongside `"price_data"`).

- [ ] Add `"indicator_data": {}` to the walk-forward return dict (walk-forward overlays deferred).

- [ ] Smoke test with curl:

```bash
uvicorn main:app --reload  # in one terminal

curl -s -X POST http://localhost:8000/api/backtest \
  -H "Content-Type: application/json" \
  -d '{"ticker":"AAPL","start_date":"2022-01-01","end_date":"2023-01-01","strategy":"SMA","strategy_params":{"short_window":20,"long_window":50},"initial_capital":10000}' \
  | python3 -m json.tool | grep -A 5 '"indicator_data"'
```

Expected: `sma_short` and `sma_long` keys present with `data` arrays.

- [ ] Commit

```bash
git add backend/main.py
git commit -m "feat(v3/slice1): return indicator_data from /api/backtest"
```

---

## Task 3 — Render overlays in TradingChart with toggle checkboxes

- [ ] Replace the entire contents of `frontend/src/components/TradingChart.jsx` with:

```jsx
import { useEffect, useRef, useState } from "react";
import {
  createChart, CrosshairMode, CandlestickSeries, LineSeries, createSeriesMarkers,
} from "lightweight-charts";

const TradingChart = ({ priceData, tradeLog, indicatorData = {} }) => {
  const chartContainerRef = useRef();
  const lineSeriesRefs = useRef({});
  const [visible, setVisible] = useState({});

  // Reset visibility when indicator set changes (new strategy selected)
  useEffect(() => {
    const initial = {};
    for (const key of Object.keys(indicatorData)) initial[key] = true;
    setVisible(initial);
  }, [Object.keys(indicatorData).join(",")]);

  // Build chart
  useEffect(() => {
    if (!priceData || priceData.length === 0) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: { background: { color: "transparent" }, textColor: "#92a0b8" },
      grid: { vertLines: { color: "#1b212c" }, horzLines: { color: "#1b212c" } },
      crosshair: { mode: CrosshairMode.Normal },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: "#232a38" },
      rightPriceScale: { borderColor: "#232a38" },
    });
    lineSeriesRefs.current = {};

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#4CAF50", downColor: "#f44336",
      borderVisible: false, wickUpColor: "#4CAF50", wickDownColor: "#f44336",
    });
    candleSeries.setData(priceData);

    for (const [key, spec] of Object.entries(indicatorData)) {
      const ls = chart.addSeries(LineSeries, {
        color: spec.color, lineWidth: 1.5,
        priceLineVisible: false, lastValueVisible: false,
      });
      ls.setData(spec.data);
      lineSeriesRefs.current[key] = { series: ls, data: spec.data };
    }

    const markers = [];
    tradeLog.forEach((trade) => {
      markers.push({ time: trade.entry_date, position: trade.type === "LONG" ? "belowBar" : "aboveBar",
        color: trade.type === "LONG" ? "#4CAF50" : "#f44336",
        shape: trade.type === "LONG" ? "arrowUp" : "arrowDown", text: `Entry ${trade.type}` });
      markers.push({ time: trade.exit_date, position: trade.type === "LONG" ? "aboveBar" : "belowBar",
        color: "#FF9800", shape: trade.type === "LONG" ? "arrowDown" : "arrowUp", text: "Exit" });
    });
    markers.sort((a, b) => new Date(a.time) - new Date(b.time));
    createSeriesMarkers(candleSeries, markers);

    const handleResize = () => chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    window.addEventListener("resize", handleResize);
    return () => { window.removeEventListener("resize", handleResize); chart.remove(); };
  }, [priceData, tradeLog, indicatorData]);

  // Toggle visibility without rebuilding the chart
  useEffect(() => {
    for (const [key, ref] of Object.entries(lineSeriesRefs.current)) {
      ref.series.setData(visible[key] !== false ? ref.data : []);
    }
  }, [visible]);

  return (
    <div>
      {Object.keys(indicatorData).length > 0 && (
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "8px" }}>
          {Object.entries(indicatorData).map(([key, spec]) => (
            <label key={key} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px", color: "#92a0b8" }}>
              <input type="checkbox" checked={visible[key] !== false}
                onChange={(e) => setVisible((p) => ({ ...p, [key]: e.target.checked }))} />
              <span style={{ display: "inline-block", width: 12, height: 2, background: spec.color, verticalAlign: "middle" }} />
              {spec.label}
            </label>
          ))}
        </div>
      )}
      <div ref={chartContainerRef} style={{ position: "relative", width: "100%", border: "1px solid #1b212c", borderRadius: "10px", overflow: "hidden" }} />
    </div>
  );
};

export default TradingChart;
```

- [ ] In `frontend/src/App.jsx`, add `indicatorData` prop to both `<TradingChart>` usages:

```jsx
// Backtest mode (~line 648)
<TradingChart priceData={results.price_data} tradeLog={results.trade_log}
  indicatorData={results.indicator_data || {}} />

// Walk-forward mode (~line 751)
<TradingChart priceData={wfResults.price_data} tradeLog={wfResults.trade_log}
  indicatorData={wfResults.indicator_data || {}} />
```

- [ ] Manual test:

1. Start backend + frontend
2. Run SMA Crossover backtest (AAPL 2022-2023)
3. Verify blue + orange lines appear on chart with two checkboxes above
4. Uncheck "SMA Long" → orange line disappears; re-check → reappears
5. Run Bollinger Bands → three lines + three checkboxes
6. Run ML → no checkboxes (correct)

- [ ] Commit

```bash
git add frontend/src/components/TradingChart.jsx frontend/src/App.jsx
git commit -m "feat(v3/slice1): chart overlay lines with toggle checkboxes"
```
