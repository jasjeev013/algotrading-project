# Strategy Execution Flow — Frontend Click to Backend

How a strategy actually runs in QuantDash, traced end to end for the three
execution modes: **Backtesting**, **Walk-Forward testing**, and **Live mode**.

All three modes share the same strategy classes in `backend/strategies.py`. What
differs is *how much data* each strategy sees at once, *how often* it is asked
for signals, and *what happens* to the signal it produces.

---

## Shared building blocks

These pieces are used by every mode, so they are described once here.

| Component | File | Role |
|-----------|------|------|
| `STRATEGY_REGISTRY` | `backend/strategy_registry.py` | Maps the string the frontend sends (`"SMA"`, `"Bollinger"`, `"ML"`, `"StatArb"`) to a strategy class. |
| `BaseStrategy` (ABC) | `backend/strategies.py:8` | Every strategy takes a list of OHLCV dicts + `**kwargs` params, and implements `generate_signals() -> DataFrame` returning `time, open, high, low, close, position` (1 long / -1 short / 0 flat) and `signal` (`position.diff()`). |
| `fetch_historical_data` | `backend/data_fetcher.py:6` | yfinance wrapper → cleaned list of OHLCV dicts. |
| `apply_fill_costs` | `backend/cost_model.py:5` | Adjusts a fill price for half-spread + slippage (`buy` fills higher, `sell` lower). |
| `run_iterative_backtest` | `backend/backtester.py:6` | Row-by-row simulation loop. Consumes a signal DataFrame, produces `equity_curve` + `trade_log`. Applies commission, spread, slippage, overnight financing. |
| `calculate_metrics` | `backend/analytics.py` | Total Return, CAGR, Max Drawdown, Win Rate, Sharpe, trade count. |
| `STRATEGY_REGISTRY` params | frontend `App.jsx:193` `buildParamsForStrategy()` | The frontend only sends the params that matter for the chosen strategy. |

The frontend base URL is `http://localhost:8000` (`App.jsx:42`); CORS on the
backend is pinned to `http://localhost:5173` (`main.py:57`).

---

## Part 1 — Backtesting

**One strategy instance sees the entire date range at once.** Fast, but the
strategy is fit and evaluated on the same data (except `ML`, which does an
internal split — see below).

### 1. Frontend click

- Tab: **Backtest** (`mode === "backtest"`), sidebar is `BacktestSidebar`.
- User sets ticker, start/end date, interval, strategy, initial capital, engine
  (`iterative` or `vectorized`), and strategy params.
- Clicking **Run Backtest** calls `runBacktest()` in `App.jsx:252`.
- It validates inputs (`validateCommonInputs`), builds the params for the chosen
  strategy (`buildParamsForStrategy`, `App.jsx:193`), and converts cost
  percentages from "percent" to "fraction" (`commissionPct / 100`, etc.).
- `axios.post("/api/backtest", payload)` — payload shape is `BacktestRequest`
  (`main.py:133`).

### 2. Backend: `POST /api/backtest` (`main.py:149`)

1. **Pick the engine** — `ENGINE_REGISTRY[request.engine]` → `run_iterative_backtest`
   or `run_vectorized_backtest`.
2. **Fetch data** — `fetch_historical_data(ticker, start, end, interval)` returns
   the full OHLCV list for the whole window.
3. **Select strategy class** — `STRATEGY_REGISTRY[request.strategy]`. For
   `StatArb`, a second `pair_ticker` series is also fetched and passed as
   `pair_data`.
4. **Generate signals (single full-range pass)** —
   `strategy_instance = strategy_class(raw_data, **strategy_params)` then
   `signal_df = strategy_instance.generate_signals()`. This is one call over the
   entire window. Example: `SMACrossover.generate_signals()`
   (`strategies.py:56`) computes `sma_short`/`sma_long` over the full series and
   sets `position = 1` where short > long, else `-1`.
5. **Extract indicator overlays** — `_extract_indicator_data` (`main.py:27`)
   reads each strategy's `INDICATOR_COLUMNS` (e.g. SMA lines, Bollinger bands) so
   the frontend can draw them on the chart.
6. **Run the engine** — `run_engine(df=signal_df, initial_capital, commission_pct,
   spread_pct, slippage_pct, overnight_financing_pct)`. The iterative loop
   (`backtester.py:31`) walks each row:
   - charges overnight financing for elapsed calendar days,
   - when `target_pos != current_pos`, closes the open trade (gross return −
     `2 * commission_pct`, fill price via `apply_fill_costs`) and opens the new
     one,
   - appends a mark-to-market point to `equity_curve` every row.
   - Returns `(equity_curve, trade_log)`.
7. **Metrics** — `calculate_metrics(equity_curve, trade_log, initial_capital)`.
8. **Persist** — a `BacktestRun` row plus one `TradeRecord` per trade
   (`main.py:230`), committed to the DB.
9. **Respond** — JSON envelope: `run_id, engine, metrics, equity_curve,
   trade_log` (reversed, newest first), `price_data`, `indicator_data`,
   `feature_importance` (ML only).

### 3. Back in the frontend

`setResults(response.data)` → the Backtest pane renders metric cards,
`TradingChart` (candles + trade markers + indicator overlays), `EquityCurveChart`,
`FeatureImportancePanel` (ML), and the trade log table (`App.jsx:604`).

Past runs: **History** tab → `GET /api/history` → click a row →
`GET /api/backtests/{run_id}` repopulates the sidebar and shows stored metrics +
trade log (equity/price charts are not persisted).

---

## Part 2 — Walk-Forward testing

**The strategy is re-fit on a rolling "train" window and only traded on the
"trade" window that immediately follows it**, then the traded segments are
stitched into one continuous out-of-sample equity curve. This is the honest
test — no strategy ever trades on data it was fit on.

### 1. Frontend click

- Tab: **Walk-Forward** (`mode === "walkforward"`), sidebar is
  `WalkForwardSidebar`.
- Same shared inputs as backtest, plus: `train_months` (default 12),
  `trade_months` (default 3), optional `step_months`, and `warmup_bars`
  (default 60) — the last only for non-fitting strategies (`SMA`, `Bollinger`,
  listed in `NON_FITTING_STRATEGIES`, `App.jsx:56`).
- Clicking **Run Walk-Forward** calls `runWalkForward()` (`App.jsx:345`) →
  `axios.post("/api/walk-forward", payload)` — payload shape is
  `WalkForwardRequest` (`main.py:360`).

### 2. Backend: `POST /api/walk-forward` (`main.py:379`)

1. Resolve strategy class, fetch full `raw_data` (and pair data for `StatArb`).
2. Call `run_walk_forward_backtest(...)` in `backend/walk_forward_engine.py:50`.

### 3. Inside `run_walk_forward_backtest`

1. **Build the windows** — `generate_windows(dates, train_months, trade_months,
   step_months)` (`walk_forward_engine.py:9`). Anchored to calendar months, each
   window is `(train_start, train_end, trade_start, trade_end)` with
   `train_end == trade_start` (no gap, no overlap). The window start advances by
   `step_months` (defaults to `trade_months`). Capped at `MAX_WINDOWS = 100`.
2. **For each window:**
   - Slice `train_df` = rows in `[train_start, train_end)`, `trade_df` = rows in
     `[trade_start, trade_end)`.
   - Instantiate the strategy on `trade_df`, attach `train_df`, and call
     **`generate_signals_for_window(train_df, trade_df)`** — this is the key
     method that differs per strategy:
     - **SMA / Bollinger** — `BaseStrategy.generate_signals_for_window`
       (`strategies.py:23`): prepends the last `warmup_bars` rows of `train_df`
       as context so rolling indicators aren't NaN at the trade-window start,
       runs `generate_signals()` on the combined slice, then **trims the result
       back to only the trade window**. Nothing is "fit" — the warm-up just
       primes the moving averages.
     - **ML** — `MLRandomForest.generate_signals_for_window` (`strategies.py:234`):
       fits a **fresh `RandomForestClassifier` on `train_df` only**, then predicts
       positions on the trade slice. Feature importances are captured per window.
     - **StatArb** — `StatArbitrageStrategy.generate_signals_for_window`
       (`strategies.py:371`): fits the hedge ratio + runs the cointegration test
       **on train data only**, then applies that fixed hedge ratio to the trade
       window's spread z-score.
   - Run `run_iterative_backtest` on that window's signals, seeding
     `initial_capital` with the **equity carried forward** from the previous
     window (`walk_forward_engine.py:122`).
   - Append the window's equity curve and trades to the combined lists; record
     per-window metrics via `calculate_metrics`.
3. Return `equity_curve` (stitched), `trade_log` (combined), `window_metrics`
   (one entry per window with its own metrics), and averaged `feature_importance`.

### 4. Backend endpoint wrap-up

`calculate_metrics` over the stitched curve → persist a `WalkForwardRun` row
(includes `window_metrics` and the full `trade_log` as JSON) → respond with the
same envelope as backtest **plus** a `walk_forward` block
(`enabled, train_months, trade_months, step_months, window_metrics`).

### 5. Frontend

`setWfResults(...)` → Walk-Forward pane renders the metric cards, the stitched
`EquityCurveChart`, `WalkForwardTable` (per-window breakdown), feature importance,
and trade log (`App.jsx:707`).

---

## Part 3 — Live mode (paper trading)

**The strategy is recomputed from scratch on every tick against a small window of
fresh OANDA candles**, and the resulting target position is reconciled against
the real account position by placing market orders. Paper account only
(OANDA "practice" environment).

Only stateless strategies are allowed live: `LIVE_ELIGIBLE_STRATEGIES = {"SMA",
"Bollinger"}` (`strategy_registry.py:14`). `ML` (needs a train/test split that is
meaningless on one live bar) and `StatArb` (needs a second live feed) are
deferred.

### 1. Frontend click

- Tab: **Live** (`mode === "live"`), sidebar is `LiveSidebar`.
- User picks strategy (`SMA` / `Bollinger`) and instrument (e.g. `EUR_USD`).
  Poll interval, granularity, candle count, trade units, and risk guards come
  from **Advanced Settings → Live Bot Defaults** (`startPayload` in `App.jsx:568`).
- Clicking **Start Bot** → `handleStart()` in `LiveSidebar.jsx:21` →
  `axios.post("/api/live/start", { strategy, instrument, ...startPayload })` —
  payload shape is `LiveBotStartRequest` (`main.py:641`).
- While the Live tab is open, `App.jsx` polls `/api/live/account`,
  `/api/live/status`, `/api/live/candles`, and `/api/live/trades` on timers
  (`App.jsx:117` and `App.jsx:151`) to keep the panel live.

### 2. Backend: `POST /api/live/start` (`main.py:653`)

1. Reject any strategy not in `LIVE_ELIGIBLE_STRATEGIES` (400).
2. Clamp `interval_seconds` to a minimum of 10 s.
3. `await bot_controller.start(...)` — `bot_controller` is a module-level
   singleton `LiveBotController` (`live_bot.py:354`). If a bot is already
   running it raises → 409.
4. `start()` (`live_bot.py:123`) creates an `OandaExecutionHandler`, stores the
   risk config (`trade_units`, `min_account_balance`, `max_open_positions`),
   updates `state`, and spins up an asyncio task running `_run_loop`.

### 3. The tick loop (`LiveBotController._run_loop` → `_tick`)

`_run_loop` (`live_bot.py:201`) runs until a stop event is set: call `_tick`,
record a heartbeat, then `await` the stop event with a timeout of
`interval_seconds` (so it either wakes to tick again or exits cleanly on stop).

**Each `_tick` (`live_bot.py:224`):**

1. **Pull candles** — `handler.get_live_candles(instrument, count=candle_count,
   granularity=granularity)` → `_adapt_candles` (`live_bot.py:35`) keeps only
   **complete** candles and reshapes them to the `data_fetcher` OHLCV shape.
   Skip the tick if fewer than 2 complete candles.
2. **Generate signals** — `strategy_class(candles, **strategy_params)` then
   `generate_signals()` over that small candle window. Exactly the same method
   as backtest mode — just a much shorter series.
3. **Desired position** — `_desired_position(signal_df)` reads the **last row's**
   `position` → `"long"` / `"short"` / `"flat"`.
4. **Actual position** — `handler.get_open_positions()` →
   `_actual_position(open_positions, instrument)`.
5. **Reconcile** — `_reconcile(handler, instrument, desired, prior)`
   (`live_bot.py:278`):
   - `desired == prior` → `"noop"`, nothing sent.
   - `desired == "flat"` → `handler.close_position(instrument)`.
   - Opening/reversing → **risk guard** first: fetch account balance, skip
     (`"skipped_risk_guard"`) if balance < `min_account_balance` or open
     positions ≥ `max_open_positions`. If reversing, close the existing leg
     first, then `handler.place_market_order(instrument, trade_units, "buy"|"sell")`
     (market order, FOK, via `oandapyV20`, `execution_handler.py:40`).
6. **Log** — realized P/L is extracted from the OANDA fill response
   (`_extract_realized_pl`) and a `LiveTradeRecord` row is written for every tick
   outcome (executed order, `noop`, or `skipped_risk_guard`).

### 4. Stopping / kill switch

- **Stop Bot** → `POST /api/live/stop` → `bot_controller.stop()` sets the stop
  event and awaits the task (force-cancels after 60 s). Open positions stay
  open.
- **Stop & Liquidate / Kill switch** → `POST /api/live/kill_switch`
  (`main.py:594`): stops the bot first (best-effort, so it can't reopen on the
  next tick), then `handler.close_all_positions()` flattens every open position,
  logging each as a `LiveTradeRecord` with realized P/L. The kill switch is
  authoritative over the bot loop.
- Bot state is **in-memory only** — a server restart does not auto-resume live
  trading; an explicit `POST /api/live/start` is required again
  (`live_bot.py:91` docstring).

### 5. Frontend display

`LivePanel` shows the live candle chart, bot status (state / strategy / last
heartbeat / last action), open positions, and the activity feed from
`/api/live/trades`. Live trades also appear in the unified **History** tab
(`run_type: "live"`, `main.py:795`).

---

## Side-by-side summary

| | Backtesting | Walk-Forward | Live |
|---|---|---|---|
| Endpoint | `POST /api/backtest` | `POST /api/walk-forward` | `POST /api/live/start` (+ tick loop) |
| Data source | yfinance, full range | yfinance, full range sliced into windows | OANDA live candles, rolling small window |
| Strategy call | `generate_signals()` once | `generate_signals_for_window(train, trade)` per window | `generate_signals()` every tick |
| Fit vs. eval | Same data (ML: internal 70/30 split) | Fit on train window, trade next window only | No fit (SMA/Bollinger only) |
| Engine | `run_iterative_backtest` / vectorized | `run_iterative_backtest` per window, equity carried forward | `_reconcile` → real OANDA market orders |
| Output | `equity_curve`, `trade_log`, `metrics` | Stitched `equity_curve` + `window_metrics` | `LiveTradeRecord` rows, real positions |
| Persistence | `BacktestRun` + `TradeRecord` | `WalkForwardRun` | `LiveTradeRecord` |
| Strategies | SMA, Bollinger, ML, StatArb | SMA, Bollinger, ML, StatArb | SMA, Bollinger only |
