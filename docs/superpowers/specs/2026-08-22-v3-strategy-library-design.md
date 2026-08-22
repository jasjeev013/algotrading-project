# QuantDash V3 — Strategy Library & Chart Overlays Design Spec

## Goal

Expand the backtesting platform from 4 strategies to 14, organised into 4 categories. Add indicator overlay lines to the price chart with per-indicator toggle checkboxes. Make the strategy selector grouped by category.

---

## What We're Building

### Strategy Categories

| Category | Strategies | Overlays on chart? |
|----------|-----------|-------------------|
| **Trend** | SMA *(existing)*, EMA, MACD, Channel Breakout | SMA, EMA, Breakout channel lines |
| **Momentum** | ROC, N-Day Momentum, Relative Momentum, Price Momentum | None (oscillators) |
| **Mean Reversion** | Bollinger *(existing)*, RSI, Z-Score, Contrarian | Bollinger bands, Z-Score bands |
| **Volatility** | ATR Breakout, BB Width Squeeze, Vol Regime Switch | ATR channel lines |
| **Statistical/ML** | ML RF *(existing)*, StatArb *(existing)* | None |

### Indicator Overlay System

Strategies that produce price-scale indicators (SMA lines, bands, channels) expose a `INDICATOR_COLUMNS` class attribute. The backend extracts those columns from the signal DataFrame and returns them in the API response as `indicator_data`. The frontend renders a coloured line series per indicator and shows a checkbox to toggle each one.

Oscillator-type indicators (MACD, RSI, ROC) are **not** overlaid on the price chart — they operate on a different scale. They still generate buy/sell markers.

---

## Architecture

### Data Flow (indicator pipeline)

```
strategies.py          INDICATOR_COLUMNS = [{key, label, color}, ...]
    ↓
main.py                signal_df = strategy.generate_signals()
                       indicator_data = _extract_indicator_data(strategy, signal_df)
    ↓
API response           { ..., "indicator_data": { "sma_short": { label, color, data: [{time, value}] } } }
    ↓
App.jsx                passes indicator_data → TradingChart
    ↓
TradingChart.jsx       addSeries(LineSeries) per key; checkbox toggles visibility
```

### Backend Changes

- `strategies.py` — add `INDICATOR_COLUMNS` to SMA + Bollinger; add 10 new strategy classes
- `strategy_registry.py` — register all new strategy keys
- `main.py` — add `_extract_indicator_data()` helper; include `indicator_data` in backtest response

### Frontend Changes

- `TradingChart.jsx` — accept `indicatorData` prop; render line series; checkbox row above chart
- `StrategyParamsFields.jsx` — add params UI for every new strategy
- `BacktestSidebar.jsx` + `WalkForwardSidebar.jsx` — `<optgroup>` grouped strategy dropdown
- `App.jsx` — extend `DEFAULT_PARAMS` and `buildParamsForStrategy()` for all new keys

---

## Strategy Designs

### Trend

**EMA Crossover** — Same logic as SMA but uses exponential weighting. Long when `ema_short > ema_long`. Params: `ema_short` (12), `ema_long` (26). Overlays: `ema_short` (cyan), `ema_long` (purple).

**MACD Strategy** — Long when MACD line crosses above signal line. Params: `macd_fast` (12), `macd_slow` (26), `macd_signal_period` (9). No overlays (oscillator).

**Channel Breakout (Donchian)** — Long when close breaks above N-day high; Short when below N-day low. Uses `shift(1)` to avoid look-ahead. Params: `breakout_lookback` (20). Overlays: `breakout_high` (pink), `breakout_low` (cyan).

### Momentum

**ROC** — Long when `(close/close.shift(N) - 1) * 100 > threshold`. Short when `< -threshold`. Params: `roc_period` (10), `roc_threshold` (0).

**N-Day Momentum** — Long if `close > close.shift(N)`. Short otherwise. Params: `nday_lookback` (20).

**Relative Momentum** — Computes rolling percentile rank of N-day return. Long if rank > `relMom_long_pct`. Short if rank < `relMom_short_pct`. Params: `relMom_period` (63), `relMom_long_pct` (60), `relMom_short_pct` (40).

**Price Momentum (Jegadeesh-Titman)** — `mom = close.shift(skip) / close.shift(window+skip) - 1`. Long if positive, short if negative. Params: `price_mom_window` (252), `price_mom_skip` (21). Needs 273+ bars of history.

### Mean Reversion

**RSI Mean Reversion** — Long when RSI < oversold; Short when RSI > overbought. Holds until opposite signal. Params: `rsi_period` (14), `rsi_oversold` (30), `rsi_overbought` (70). No overlays.

**Z-Score Reversion** — Computes `z = (close - rolling_mean) / rolling_std`. Long when `z < -entry_z`; Short when `z > entry_z`; flat when `|z| < exit_z`. Params: `zscore_window` (20), `zscore_entry` (2.0), `zscore_exit` (0.5). Overlays: mean (grey), upper band (red), lower band (green).

**Contrarian** — Long when N-day return < `-threshold`; Short when > `+threshold`. Params: `contrarian_lookback` (5), `contrarian_threshold` (0.03).

### Volatility

**ATR Breakout** — Channel = `rolling_mean ± atr_multiplier × ATR`. Long when price breaks above; Short below. Params: `atr_period` (14), `atr_multiplier` (2.0), `atr_lookback` (20). Overlays: `atr_upper` (pink), `atr_lower` (cyan).

**BB Width Squeeze** — When BBW contracts below its Nth-percentile threshold (squeeze), waits for expansion. Trades direction of first close outside the bands. Params: `bbwidth_window` (20), `bbwidth_std` (2.0), `bbwidth_squeeze_pct` (25).

**Vol Regime Switch** — Computes rolling realised vol. High vol: mean-revert (sell above mean, buy below). Low vol: trend-follow (buy above mean, sell below). Params: `vol_window` (20), `vol_threshold` (0.015).

---

## API Contract

`POST /api/backtest` response gains:

```json
{
  "indicator_data": {
    "sma_short": { "label": "SMA Short", "color": "#2196F3", "data": [{"time": "2022-01-03", "value": 182.5}] },
    "sma_long":  { "label": "SMA Long",  "color": "#FF9800", "data": [...] }
  }
}
```

Walk-forward endpoint returns `"indicator_data": {}` for now (walk-forward signal_df is not surfaced by the engine — deferred).

---

## Indicator Colour Palette

| Indicator | Colour |
|-----------|--------|
| sma_short / ema_short | `#2196F3` blue / `#00BCD4` cyan |
| sma_long / ema_long | `#FF9800` orange / `#9C27B0` purple |
| bb_middle / zscore_mean | `#9E9E9E` grey |
| upper bands | `#f44336` red |
| lower bands | `#4CAF50` green |
| channel high / atr_upper | `#E91E63` pink |
| channel low / atr_lower | `#00BCD4` cyan |

---

## Constraints

- `generate_signals()` must return a DataFrame with: `time`, `close`, `open`, `high`, `low`, `position` (1/−1/0), `signal` (diff of position)
- All new strategies inherit `BaseStrategy.generate_signals_for_window()` — no override needed unless the strategy fits a model
- Strategy keys must match `strategy_registry.py` exactly: `"EMA"`, `"MACD"`, `"Breakout"`, `"ROC"`, `"NDayMom"`, `"RelMom"`, `"PriceMom"`, `"RSI"`, `"ZScore"`, `"Contrarian"`, `"ATRBreakout"`, `"BBWidth"`, `"VolRegime"`
- lightweight-charts v5 API: `chart.addSeries(LineSeries, options)` — not the v4 `addLineSeries()`

---

## Delivery Phases

| Phase | Slices | Focus |
|-------|--------|-------|
| A | 1–2 | Refine existing strategies; build infrastructure |
| B | 3–6 | Add new strategies category by category |

Implementation plans: `docs/superpowers/plans/2026-08-22-v3-slice{N}-*.md`
