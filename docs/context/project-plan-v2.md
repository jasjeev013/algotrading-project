# Project Master Plan: QuantDash MVP 2.0

## 1. Project Vision
Evolve QuantDash from a static, end-of-day backtesting tool into a **live-execution, event-driven algorithmic trading bot**. MVP 2.0 bridges the gap between theoretical profitability and real-world execution by introducing realistic market friction, rigorous walk-forward validation, and live paper-trading via the OANDA API.

---

## 2. Core Upgrades & The "Why"

| Upgrade | Why It Matters |
|---------|---------------|
| **Walk-Forward Testing** | Prevents ML strategies from "seeing the future" (overfitting). Strategies must prove they work on unseen data before going live. |
| **Market Microstructure** | A flat 0.1% commission isn't realistic. Bid/ask spread, slippage, and overnight financing fees significantly erode real returns. |
| **OANDA Paper API** | Backtests are simulations. OANDA paper trading proves the execution pipeline works before risking real capital. |
| **Event-Driven Architecture** | Live markets emit events (new candle, price tick). The system must react to events rather than batch-processing all data at once. |
| **Persistence (DB)** | In-memory results are lost on server crash. Mid-trade crashes without a DB mean unknown position state — dangerous for live execution. |
| **Intraday Data** | Daily candles are too slow for most strategies. Moving to `15m` intervals dramatically increases signal frequency and realism. |

---

## 3. Architecture Evolution

### V1 Architecture (Current)
```
for row in historical_data:          ← simple for-loop, all data known upfront
    strategy.generate_signals()
    backtest.simulate()
```

### V2 Target Architecture (Event-Driven)
```
while bot is running:
    wait for MarketEvent (new candle arrives every 15 min)
        → run Strategy → generate SignalEvent
        → if signal: run RiskManager → generate OrderEvent
        → send OrderEvent to OANDA ExecutionHandler
        → log everything to DB
```

The key difference: in V2, the system **doesn't know future data**. Each cycle processes only what has arrived so far, which is identical to how live trading works.

---

## 4. Phase Breakdown & Task List

### Phase 0: Pre-Flight Fixes (V1 Cleanup) ✅ COMPLETE
These are known V1 bugs that must be fixed before building on top of them.

- [x] **0.1 Fix ML data leakage** — `MLRandomForest` currently trains on the entire backtest window. Add a simple time-based train/test split (e.g., train on first 70%, predict on last 30%) so signals on the test set reflect only past data. This is a prerequisite for Phase 3 (WFO).
- [x] **0.2 Add Equity Curve chart** — The backend already returns `equity_curve` data. Add a `lightweight-charts` LineSeries in the frontend below the candlestick chart to visualise portfolio value over time.
- [x] **0.3 Add dynamic strategy params UI** — The frontend currently hardcodes `short_window=20, long_window=50` in every payload regardless of strategy. Add conditional inputs that appear based on the selected strategy dropdown.

---

### Phase 1: Data Depth & Market Regime ✅ COMPLETE

- [x] **1.1 Intraday support** — `data_fetcher.py` already accepts `interval` parameter but the frontend hardcodes `"1d"`. Expose an interval dropdown in the UI and test `5m`/`15m` fetches. Note: yfinance only returns 60 days of intraday history — document this limitation clearly.
- [x] **1.2 Market Regime module** — Create `market_regime.py`. Fetch SPY and VIX data alongside the primary ticker. Classify the current regime: Trending (VIX < 20, SPY trending), Volatile (VIX > 30), or Sideways. Expose as a helper function so strategies can query current regime as a filter.
- [x] **1.3 Regime mini-dashboard** — Add a compact header section to the frontend showing: SPY price + daily change, VIX level (with colour coding: green/yellow/red), and current regime label. This sets context before running a backtest.

---

### Phase 2: Persistence (Database) ✅ COMPLETE

> This phase is deliberately placed before live trading. If the bot crashes mid-trade without a DB, you won't know your position state.

- [x] **2.1 Choose and set up DB** — Use **SQLite** for local development (no server required), with `SQLAlchemy` as the ORM. Create a `database.py` module with engine setup and session management.
- [x] **2.2 Define models** — Create `models.py` with two tables:
  - `BacktestRun`: id, ticker, strategy, start/end dates, params (JSON), run timestamp, metrics (JSON)
  - `TradeRecord`: id, backtest_run_id (FK), type, entry_date, exit_date, entry_price, exit_price, pnl, net_return_pct
- [x] **2.3 Persist backtest results** — After each `POST /api/backtest` call, save the run and its trades to the DB. Return a `run_id` in the API response.
- [x] **2.4 History endpoint** — Add `GET /api/backtests` to list past runs and `GET /api/backtests/{run_id}` to replay a specific result. This enables comparing strategy runs without re-running them.

---

### Phase 3: Realistic Market Costs ✅ COMPLETE

- [x] **3.1 Bid/Ask Spread** — Modify `backtester.py` to accept a `spread_pct` parameter. When buying, add half the spread to the fill price; when selling, subtract half. Default: `0.0002` (2 pips, realistic for liquid Forex).
- [x] **3.2 Slippage Model** — Add a `slippage_pct` parameter. On each order, the fill price moves against you by this fraction (buys fill higher, sells fill lower). Default: `0.0001`.
- [x] **3.3 Overnight Financing Fee** — Add a per-position daily fee (OANDA swap rate) applied on each overnight hold. Store swap rate as a configurable param. This is critical for Forex pairs held longer than one session.
- [x] **3.4 Expose in UI** — Add an "Advanced Settings" collapsible section in the sidebar for spread, slippage, and overnight fee inputs.

---

### Phase 4: Walk-Forward Testing & Multi-Mode Dashboard Architecture

Dashboard restructured into 5 tabs: **Strategy Explorer**, **Walk-Forward Engine**, **Live Paper Trading** (coming soon), **Advance Settings**, and **History**. All modes share a unified backend API and centralized trade logging.

#### Tab 1: Strategy Explorer (Backtesting)
- [x] **4.1.1 Vectorized backtest mode** — Implement fast `backtest_vectorized()` in `backtester.py` for quick iterations. Uses pandas `.shift()` and boolean masks instead of row-by-row loops. Use for rapid strategy prototyping.
- [x] **4.1.2 Iterative backtest mode** — Keep existing row-by-row `backtest_iterative()` for realistic simulation with order fills, slippage, and commission per-trade. Toggle between both modes in the UI dropdown.
- [x] **4.1.3 Live-update results** — On each strategy parameter change in the Strategy Explorer tab, auto-run the selected backtest mode and display: metrics cards, candlestick chart with trade markers, equity curve, and trade log.

#### Tab 2: Walk-Forward Engine
- [x] **4.2.1 WFO core engine** — Create `walk_forward_engine.py`. It takes a full date range and splits it into rolling windows:
  - Train on months 1–12 → Trade on months 13–15
  - Train on months 4–15 → Trade on months 16–18
  - Stitch the "traded" segments into one realistic equity curve.
  - Return per-window metrics alongside the combined curve so degradation over time is visible.
- [x] **4.2.2 Fix MLRandomForest with WFO** — Replace the V1 full-dataset training with the walk-forward engine. Each window trains a fresh model only on in-sample data, then predicts out-of-sample. This eliminates data leakage entirely.
- [x] **4.2.3 WFO frontend UI** — Add inputs for window size (months) and step size (months). Display per-window metrics in a table and overlay all window equity curves on a single chart to visualize strategy degradation.

#### Tab 3: Live Paper Trading (Coming Soon)
- [x] **4.3.1 Placeholder UI** — Add a disabled tab with message: "Live paper trading integration coming in Phase 5 (OANDA API). Will show live account balance, active positions, and live signals from the selected strategy."

#### Tab 4: Advance Settings
- [x] **4.4.1 Unified parameter panel** — Create a settings sidebar section that dynamically renders inputs based on the selected strategy (SMACrossover → short_window, long_window sliders; BollingerBands → window, num_std; MLRandomForest → train/test split ratio, feature set selection).
- [x] **4.4.2 Market microstructure params** — Inputs for `spread_pct`, `slippage_pct`, `overnight_fee_pct`. These apply to all backtests in both Explorer and WFO tabs.
#### Tab 5: History
- [x] **4.5.1 Backtest run history** — Fetch past backtest runs from `GET /api/backtests`. Display a table with: run name (user-assigned or auto-generated timestamp), strategy, date range, key metrics (Total Return, Sharpe, Max DD). Clicking a row loads that run's full results.
#### Strategy Additions
- [x] **4.6.1 Stat Arbitrage (Pairs Trading)** — Create `StatArbitrageStrategy` in `strategies.py`. Use `statsmodels.tsa.stattools.coint()` to test for cointegration between two tickers (e.g., AAPL/MSFT or any user-selected pair). Trade the spread: go long the cheap leg, short the expensive leg when the spread diverges by >2 standard deviations. Include z-score thresholds and mean-reversion entry/exit logic as configurable params.
- [x] **4.6.2 Improved ML features** — Upgrade `MLRandomForest` with additional features: RSI (14), MACD signal line, ATR (14 days), day-of-week, volume ratio (today/5-day average). Add feature importance output to the API response and display as a horizontal bar chart in the Strategy Explorer tab.

---

### Phase 5: OANDA API Integration ✅ COMPLETE

- [x] **5.1 OANDA account setup** — OANDA Practice Account + API token. Credentials read from `.env` (`OANDA_ACCOUNT_ID`, `OANDA_API_KEY`, `OANDA_ENVIRONMENT`) via `config.py`; `.env` stays git-ignored, `.env.example` documents the required keys.
- [x] **5.2 Execution handler** — `execution_handler.py` (`OandaExecutionHandler`) built on `oandapyV20`. Implements:
  - `get_live_candles(instrument, count, granularity)`
  - `get_account_summary()`
  - `get_open_positions()`
  - `place_market_order(instrument, units, direction)` — hard-capped at `MAX_ORDER_UNITS = 1000` (Risk Rule 4)
  - `close_position(instrument)`
- [x] **5.3 Kill switch** — `close_all_positions()` iterates every open position and closes it, collecting per-instrument success/error rather than raising on the first failure. Exposed as `POST /api/live/kill_switch`.
- [x] **5.4 Validation endpoint** — `GET /api/live/account` returns the practice account summary, confirming credentials/connectivity independent of any bot loop.

**Not yet done (carried into Phase 7):** the frontend `LiveSidebar` / "Live Paper Trading" tab is still the static Phase-4.3.1 placeholder — it does not call `/api/live/account` or `/api/live/kill_switch` yet. That wiring is now explicit in Phase 7 below, since there's no live bot (Phase 6) driving the tab yet either.

---

### Phase 6: The Live Trading Bot ✅ COMPLETE

- [x] **6.1 Bot script** — `live_bot.py` implements `LiveBotController`, a module-level singleton (`bot_controller`). Uses Python's `asyncio` for the main event loop (`asyncio.create_task`, not a background thread — see 6.5 note). Core loop runs every 15 minutes by default, configurable via `interval_minutes`.
- [x] **6.2 Event loop logic** — implemented in `_tick()` / `_reconcile()` exactly per spec:
  ```
  On every tick (15min):
  1. Fetch last N candles from OANDA (execution_handler.get_live_candles)
  2. Run the chosen strategy on this data
  3. Get current open positions from OANDA
  4. Compare strategy signal vs current position:
     - Signal=LONG, no position → place BUY order
     - Signal=SHORT, no position → place SELL order
     - Signal=FLAT, position open → close position
     - Signal matches position → do nothing
  5. Log everything to DB (LiveTradeRecord table)
  ```
  Live-eligible strategies are restricted to `SMA` and `Bollinger` (`LIVE_ELIGIBLE_STRATEGIES` in `strategy_registry.py`); ML and Stat-Arb are excluded since they don't make sense on a single live bar.
- [x] **6.3 Structured logging** — `logging` module, console `StreamHandler` plus a `RotatingFileHandler` writing `logs/bot.log`. Heartbeats, signal decisions, order placements, and tick failures (via `logger.exception`) are all logged with timestamps.
- [x] **6.4 Risk guard** — `_reconcile()` checks (a) `get_account_summary().balance >= min_account_balance` and (b) open position count `< max_open_positions` before placing any order; either failing logs a warning and records a `skipped_risk_guard` action instead of trading.
- [x] **6.5 Bot control endpoints** — `POST /api/live/start`, `POST /api/live/stop`, `GET /api/live/status` all implemented in `main.py`. **Deviation from plan:** the bot loop runs as an `asyncio.create_task`, not a background thread — functionally equivalent for this single-process app, but worth noting since the original spec said "thread."

---

### Phase 7: Wire Up the Live Paper Trading Tab ✅ COMPLETE

> The `[ Strategy Explorer | Walk-Forward | Live | Settings | History ]` tab rail and the `LiveSidebar` placeholder already exist from Phase 4 (Tab 3, item 4.3.1) — no new navigation shell is needed. This phase replaces the placeholder's static "—" values with real data from the Phase 5 endpoints and the Phase 6 bot, and only makes sense once Phase 6's bot/control endpoints exist to back the status indicator and Start/Stop buttons.

- [x] **7.1 Live account summary card** — `LiveSidebar`'s Balance/Margin/Equity rows are sourced from `GET /api/live/account` (Phase 5.4), polled every 60s from `App.jsx`.
- [x] **7.2 Open positions table** — Active-positions table (instrument, direction, units) sourced from `status.open_positions` (`GET /api/live/status`), auto-refreshing every 15s. **Deviation from plan:** the unrealised P&L column called for in the spec is not implemented — the table currently shows instrument/side/units only.
- [x] **7.3 Bot status indicator + controls** — Status badge reflects real state from `GET /api/live/status` (Phase 6.5); Start/Stop buttons wired to `POST /api/live/start` / `POST /api/live/stop`.
- [x] **7.4 Kill switch button** — "Liquidate All Positions" button enabled, confirms via `window.confirm` before calling `POST /api/live/kill_switch` (Phase 5.3), and renders per-instrument success/error from the response.
- [x] **7.5 Remove "coming soon" messaging** — The `live-badge` "COMING IN V2 PHASE 5–7" banner and "Live execution ships in Phase 5–7" empty-state copy have been removed from `App.jsx`.

---

### Phase 8: Infrastructure (Docker + Cloud)

> This phase only starts once Phase 6 (live bot) is working correctly on local.

- [x] **8.1 Dockerfile — Backend** — Write a `Dockerfile` for the FastAPI app. Base image: `python:3.11-slim`. Copy `requirements.txt`, install deps, copy source, run with `uvicorn`.
- [x] **8.2 Dockerfile — Frontend** — Write a `Dockerfile` for the frontend (single-stage `node:22-alpine`; multi-stage nginx production build not yet done).
- [x] **8.3 docker-compose.yml** — Compose file with `backend` and `frontend` services with env var injection from `.env`. **Note:** no `db` PostgreSQL service yet — still using SQLite volume mount.

---

## 5. V2 Dependency Map

```
Phase 0 (Fixes)
    ↓
Phase 1 (Data)  →  Phase 2 (DB)
                        ↓
               Phase 3 (Costs)
                        ↓
               Phase 4 (WFO + Strategies)
                        ↓
               Phase 5 (OANDA) ✅ COMPLETE
                        ↓
               Phase 6 (Live Bot)
                        ↓
               Phase 7 (Wire Live Tab to Phase 5/6)
                        ↓
               Phase 8 (Docker + Cloud)
```

Phase 1 (Data) and Phase 2 (DB) can be built in parallel. Everything from Phase 3 onward is sequential. Phase 7 has no independent build-out anymore — its shell (tab rail, `LiveSidebar`) already shipped in Phase 4, so it's purely wiring Phase 5's endpoints and Phase 6's bot into that existing UI.

---

## 6. Technical Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Database | SQLite → PostgreSQL | SQLite for zero-setup local dev; migrate when Dockerizing |
| ORM | SQLAlchemy | Works with both SQLite and PostgreSQL; well-supported |
| Live data | OANDA API (oandapyV20) | Free paper account; supports Forex and CFDs; REST + streaming |
| Bot scheduler | Python asyncio | Built-in; cleaner than `schedule` for async I/O with OANDA |
| Containerization | Docker + docker-compose | Standard; enables cloud deployment on any VPS |
| Secrets | `.env` + `python-dotenv` | Already in `.gitignore`; never hardcode credentials |

---

## 7. Risk & Safety Rules (Non-Negotiable)

1. **Never commit `.env`** — OANDA credentials live only in `.env`, which is in `.gitignore`.
2. **Kill switch first** — `close_all_positions()` must be implemented and tested *before* `place_market_order()` is ever called from the live bot.
3. **Paper trading only** — The bot will target the OANDA *Practice* environment only. Switching to the Live environment requires a deliberate code change and is out of scope for V2.
4. **Maximum position size** — Hard-code a maximum of 1,000 units per order until the bot has been running without errors for 30+ days.
5. **DB before live** — Phase 2 (persistence) must be complete before Phase 6 (live bot). Running a live bot without logging trade state to a DB is not acceptable.
