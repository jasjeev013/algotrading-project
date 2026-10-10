# Slice 2 — Strategy Categorisation in UI

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans.

**Spec:** `docs/superpowers/specs/2026-08-22-v3-strategy-library-design.md`
**Depends on:** Slice 1 complete.

**Goal:** Strategy dropdown shows strategies grouped by category. App.jsx extended with defaults and param builders for all future strategies.

**Delivers:** Dropdown with 5 optgroup sections; no broken state when selecting a strategy not yet implemented.

**Files touched:**
- Modify: `frontend/src/components/BacktestSidebar.jsx`
- Modify: `frontend/src/components/WalkForwardSidebar.jsx`
- Modify: `frontend/src/App.jsx`

---

## Task 1 — Add `<optgroup>` to both sidebars

- [ ] In `BacktestSidebar.jsx`, replace the flat strategy `<select>` with:

```jsx
<select value={strategy} onChange={(e) => setStrategy(e.target.value)}>
  <optgroup label="Trend">
    <option value="SMA">SMA Crossover</option>
    <option value="EMA">EMA Crossover</option>
    <option value="MACD">MACD Strategy</option>
    <option value="Breakout">Channel Breakout</option>
  </optgroup>
  <optgroup label="Momentum">
    <option value="ROC">Rate of Change (ROC)</option>
    <option value="NDayMom">N-Day Momentum</option>
    <option value="RelMom">Relative Momentum</option>
    <option value="PriceMom">Price Momentum</option>
  </optgroup>
  <optgroup label="Mean Reversion">
    <option value="Bollinger">Bollinger Bands</option>
    <option value="RSI">RSI Mean Reversion</option>
    <option value="ZScore">Z-Score Reversion</option>
    <option value="Contrarian">Contrarian</option>
  </optgroup>
  <optgroup label="Volatility">
    <option value="ATRBreakout">ATR Breakout</option>
    <option value="BBWidth">BB Width Squeeze</option>
    <option value="VolRegime">Vol Regime Switch</option>
  </optgroup>
  <optgroup label="Statistical / ML">
    <option value="ML">Machine Learning (RF)</option>
    <option value="StatArb">Pairs Trading (StatArb)</option>
  </optgroup>
</select>
```

- [ ] Apply the **identical `<select>` block** to `WalkForwardSidebar.jsx`.

---

## Task 2 — Extend DEFAULT\_PARAMS and buildParamsForStrategy in App.jsx

- [ ] Replace `DEFAULT_PARAMS` constant in `App.jsx` with:

```jsx
const DEFAULT_PARAMS = {
  // Trend
  short_window: 20, long_window: 50,
  ema_short: 12, ema_long: 26,
  macd_fast: 12, macd_slow: 26, macd_signal_period: 9,
  breakout_lookback: 20,
  // Momentum
  roc_period: 10, roc_threshold: 0,
  nday_lookback: 20,
  relMom_period: 63, relMom_long_pct: 60, relMom_short_pct: 40,
  price_mom_window: 252, price_mom_skip: 21,
  // Mean Reversion
  window: 20, num_std: 2.0,
  rsi_period: 14, rsi_oversold: 30, rsi_overbought: 70,
  zscore_window: 20, zscore_entry: 2.0, zscore_exit: 0.5,
  contrarian_lookback: 5, contrarian_threshold: 0.03,
  // Volatility
  atr_period: 14, atr_multiplier: 2.0, atr_lookback: 20,
  bbwidth_window: 20, bbwidth_std: 2.0, bbwidth_squeeze_pct: 25,
  vol_window: 20, vol_threshold: 0.015,
  // Statistical / ML (existing)
  train_split: 0.7,
  lookback_window: 30, entry_z: 2.0, exit_z: 0.5, coint_pvalue_threshold: 0.05,
};
```

- [ ] Replace `buildParamsForStrategy` in `App.jsx` with the switch version:

```jsx
const buildParamsForStrategy = () => {
  const p = strategyParams;
  switch (strategy) {
    case "SMA":      return { short_window: +p.short_window, long_window: +p.long_window };
    case "EMA":      return { ema_short: +p.ema_short, ema_long: +p.ema_long };
    case "MACD":     return { macd_fast: +p.macd_fast, macd_slow: +p.macd_slow, macd_signal_period: +p.macd_signal_period };
    case "Breakout": return { breakout_lookback: +p.breakout_lookback };
    case "ROC":      return { roc_period: +p.roc_period, roc_threshold: +p.roc_threshold };
    case "NDayMom":  return { nday_lookback: +p.nday_lookback };
    case "RelMom":   return { relMom_period: +p.relMom_period, relMom_long_pct: +p.relMom_long_pct, relMom_short_pct: +p.relMom_short_pct };
    case "PriceMom": return { price_mom_window: +p.price_mom_window, price_mom_skip: +p.price_mom_skip };
    case "Bollinger": return { window: +p.window, num_std: +p.num_std };
    case "RSI":      return { rsi_period: +p.rsi_period, rsi_oversold: +p.rsi_oversold, rsi_overbought: +p.rsi_overbought };
    case "ZScore":   return { zscore_window: +p.zscore_window, zscore_entry: +p.zscore_entry, zscore_exit: +p.zscore_exit };
    case "Contrarian": return { contrarian_lookback: +p.contrarian_lookback, contrarian_threshold: +p.contrarian_threshold };
    case "ATRBreakout": return { atr_period: +p.atr_period, atr_multiplier: +p.atr_multiplier, atr_lookback: +p.atr_lookback };
    case "BBWidth":  return { bbwidth_window: +p.bbwidth_window, bbwidth_std: +p.bbwidth_std, bbwidth_squeeze_pct: +p.bbwidth_squeeze_pct };
    case "VolRegime": return { vol_window: +p.vol_window, vol_threshold: +p.vol_threshold };
    case "ML":       return { train_split: +p.train_split };
    case "StatArb":  return { lookback_window: +p.lookback_window, entry_z: +p.entry_z, exit_z: +p.exit_z, coint_pvalue_threshold: +p.coint_pvalue_threshold };
    default:         return {};
  }
};
```

---

## Task 3 — Manual test + commit

- [ ] Open the app — verify dropdown shows 5 grouped sections

- [ ] Select EMA Crossover → no params shown (StrategyParamsFields returns null — correct, comes in Slice 3)

- [ ] Select SMA and Bollinger → params still show correctly

- [ ] No JS errors in console when cycling through all strategies

- [ ] Commit

```bash
git add frontend/src/components/BacktestSidebar.jsx frontend/src/components/WalkForwardSidebar.jsx frontend/src/App.jsx
git commit -m "feat(v3/slice2): grouped strategy dropdown and extended DEFAULT_PARAMS"
```
