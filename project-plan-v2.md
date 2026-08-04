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

### Phase 0: Pre-Flight Fixes (V1 Cleanup) ← START HERE
These are known V1 bugs that must be fixed before building on top of them.

- [ ] **0.1 Fix ML data leakage** — `MLRandomForest` currently trains on the entire backtest window. Add a simple time-based train/test split (e.g., train on first 70%, predict on last 30%) so signals on the test set reflect only past data. This is a prerequisite for Phase 3 (WFO).
- [ ] **0.2 Add Equity Curve chart** — The backend already returns `equity_curve` data. Add a `lightweight-charts` LineSeries in the frontend below the candlestick chart to visualise portfolio value over time.
- [ ] **0.3 Add dynamic strategy params UI** — The frontend currently hardcodes `short_window=20, long_window=50` in every payload regardless of strategy. Add conditional inputs that appear based on the selected strategy dropdown.

---

### Phase 1: Data Depth & Market Regime

- [ ] **1.1 Intraday support** — `data_fetcher.py` already accepts `interval` parameter but the frontend hardcodes `"1d"`. Expose an interval dropdown in the UI and test `5m`/`15m` fetches. Note: yfinance only returns 60 days of intraday history — document this limitation clearly.
- [ ] **1.2 Market Regime module** — Create `market_regime.py`. Fetch SPY and VIX data alongside the primary ticker. Classify the current regime: Trending (VIX < 20, SPY trending), Volatile (VIX > 30), or Sideways. Expose as a helper function so strategies can query current regime as a filter.
- [ ] **1.3 Regime mini-dashboard** — Add a compact header section to the frontend showing: SPY price + daily change, VIX level (with colour coding: green/yellow/red), and current regime label. This sets context before running a backtest.

---

### Phase 2: Persistence (Database)

> This phase is deliberately placed before live trading. If the bot crashes mid-trade without a DB, you won't know your position state.

- [ ] **2.1 Choose and set up DB** — Use **SQLite** for local development (no server required), with `SQLAlchemy` as the ORM. Create a `database.py` module with engine setup and session management.
- [ ] **2.2 Define models** — Create `models.py` with two tables:
  - `BacktestRun`: id, ticker, strategy, start/end dates, params (JSON), run timestamp, metrics (JSON)
  - `TradeRecord`: id, backtest_run_id (FK), type, entry_date, exit_date, entry_price, exit_price, pnl, net_return_pct
- [ ] **2.3 Persist backtest results** — After each `POST /api/backtest` call, save the run and its trades to the DB. Return a `run_id` in the API response.
- [ ] **2.4 History endpoint** — Add `GET /api/backtests` to list past runs and `GET /api/backtests/{run_id}` to replay a specific result. This enables comparing strategy runs without re-running them.

---

### Phase 3: Realistic Market Costs

- [ ] **3.1 Bid/Ask Spread** — Modify `backtester.py` to accept a `spread_pct` parameter. When buying, add half the spread to the fill price; when selling, subtract half. Default: `0.0002` (2 pips, realistic for liquid Forex).
- [ ] **3.2 Slippage Model** — Add a `slippage_pct` parameter. On each order, the fill price moves against you by this fraction (buys fill higher, sells fill lower). Default: `0.0001`.
- [ ] **3.3 Overnight Financing Fee** — Add a per-position daily fee (OANDA swap rate) applied on each overnight hold. Store swap rate as a configurable param. This is critical for Forex pairs held longer than one session.
- [ ] **3.4 Expose in UI** — Add an "Advanced Settings" collapsible section in the sidebar for spread, slippage, and overnight fee inputs.

---

### Phase 4: Walk-Forward Testing & Multi-Mode Dashboard Architecture

Dashboard restructured into 5 tabs: **Strategy Explorer**, **Walk-Forward Engine**, **Live Paper Trading** (coming soon), **Advance Settings**, and **History**. All modes share a unified backend API and centralized trade logging.

#### Tab 1: Strategy Explorer (Backtesting)
- [ ] **4.1.1 Vectorized backtest mode** — Implement fast `backtest_vectorized()` in `backtester.py` for quick iterations. Uses pandas `.shift()` and boolean masks instead of row-by-row loops. Use for rapid strategy prototyping.
- [ ] **4.1.2 Iterative backtest mode** — Keep existing row-by-row `backtest_iterative()` for realistic simulation with order fills, slippage, and commission per-trade. Toggle between both modes in the UI dropdown.
- [ ] **4.1.3 Live-update results** — On each strategy parameter change in the Strategy Explorer tab, auto-run the selected backtest mode and display: metrics cards, candlestick chart with trade markers, equity curve, and trade log.

#### Tab 2: Walk-Forward Engine
- [ ] **4.2.1 WFO core engine** — Create `walk_forward_engine.py`. It takes a full date range and splits it into rolling windows:
  - Train on months 1–12 → Trade on months 13–15
  - Train on months 4–15 → Trade on months 16–18
  - Stitch the "traded" segments into one realistic equity curve.
  - Return per-window metrics alongside the combined curve so degradation over time is visible.
- [ ] **4.2.2 Fix MLRandomForest with WFO** — Replace the V1 full-dataset training with the walk-forward engine. Each window trains a fresh model only on in-sample data, then predicts out-of-sample. This eliminates data leakage entirely.
- [ ] **4.2.3 WFO frontend UI** — Add inputs for window size (months) and step size (months). Display per-window metrics in a table and overlay all window equity curves on a single chart to visualize strategy degradation.

#### Tab 3: Live Paper Trading (Coming Soon)
- [ ] **4.3.1 Placeholder UI** — Add a disabled tab with message: "Live paper trading integration coming in Phase 5 (OANDA API). Will show live account balance, active positions, and live signals from the selected strategy."

#### Tab 4: Advance Settings
- [ ] **4.4.1 Unified parameter panel** — Create a settings sidebar section that dynamically renders inputs based on the selected strategy (SMACrossover → short_window, long_window sliders; BollingerBands → window, num_std; MLRandomForest → train/test split ratio, feature set selection).
- [ ] **4.4.2 Market microstructure params** — Inputs for `spread_pct`, `slippage_pct`, `overnight_fee_pct`. These apply to all backtests in both Explorer and WFO tabs.
- [ ] **4.4.3 Save/load profiles** — Allow users to save custom parameter sets as "profiles" (e.g., "Conservative", "Aggressive", "Pairs Trading"). Profiles are persisted to the DB.

#### Tab 5: History
- [ ] **4.5.1 Backtest run history** — Fetch past backtest runs from `GET /api/backtests`. Display a table with: run name (user-assigned or auto-generated timestamp), strategy, date range, key metrics (Total Return, Sharpe, Max DD). Clicking a row loads that run's full results.
- [ ] **4.5.2 Comparison view** — Select multiple historical runs and overlay their equity curves on one chart to compare strategies or parameter tuning sessions side-by-side.
- [ ] **4.5.3 Export/archive** — Add buttons to export a run as JSON or CSV, or delete old runs to reclaim DB space.

#### Strategy Additions
- [ ] **4.6.1 Stat Arbitrage (Pairs Trading)** — Create `StatArbitrageStrategy` in `strategies.py`. Use `statsmodels.tsa.stattools.coint()` to test for cointegration between two tickers (e.g., AAPL/MSFT or any user-selected pair). Trade the spread: go long the cheap leg, short the expensive leg when the spread diverges by >2 standard deviations. Include z-score thresholds and mean-reversion entry/exit logic as configurable params.
- [ ] **4.6.2 Improved ML features** — Upgrade `MLRandomForest` with additional features: RSI (14), MACD signal line, ATR (14 days), day-of-week, volume ratio (today/5-day average). Add feature importance output to the API response and display as a horizontal bar chart in the Strategy Explorer tab.

---

### Phase 5: OANDA API Integration

- [ ] **5.1 OANDA account setup** — Create a free OANDA Practice Account and generate an API token. Add credentials to `.env` as `OANDA_ACCOUNT_ID` and `OANDA_API_KEY`. Never commit these.
- [ ] **5.2 Execution handler** — Create `execution_handler.py` using the `oandapyV20` library. Implement:
  - `get_live_candles(instrument, count, granularity)` — fetch the last N candles
  - `get_account_summary()` — returns balance, margin used, open positions
  - `place_market_order(instrument, units, direction)` — send a market order
  - `close_position(instrument)` — flatten an open position
  - `get_open_positions()` — list all current positions with unrealised P&L
- [ ] **5.3 Kill switch** — Implement `close_all_positions()` in `execution_handler.py`. This calls `close_position()` for every open trade. Expose it as `POST /api/live/kill_switch`. This endpoint must work even if the main bot loop is erroring.
- [ ] **5.4 Validation endpoint** — Add `GET /api/live/account` to verify the OANDA connection and return account balance. Use this to confirm credentials are working before starting the bot.

---

### Phase 6: The Live Trading Bot

- [ ] **6.1 Bot script** — Create `live_bot.py`. Use Python's `asyncio` for the main event loop. Core loop runs every 15 minutes (configurable).
- [ ] **6.2 Event loop logic**:
  ```
  On every tick (15min):
  1. Fetch last 100 candles from OANDA (execution_handler.get_live_candles)
  2. Run the chosen strategy on this data
  3. Get current open positions from OANDA
  4. Compare strategy signal vs current position:
     - Signal=LONG, no position → place BUY order
     - Signal=SHORT, no position → place SELL order
     - Signal=FLAT, position open → close position
     - Signal matches position → do nothing
  5. Log everything to DB (LiveTradeRecord table)
  ```
- [ ] **6.3 Structured logging** — Use Python's `logging` module. Log to both console and a rotating file (`logs/bot.log`). Every heartbeat, every signal decision, every order placement and fill must be logged with timestamp. If a trade errors, the exception must be logged before the loop continues.
- [ ] **6.4 Risk guard** — Before placing any order, check: (a) account balance is above a minimum threshold (configurable), (b) number of open positions is below a maximum (configurable). If either check fails, log a warning and skip the order.
- [ ] **6.5 Bot control endpoints** — Add FastAPI endpoints:
  - `POST /api/live/start` — starts the bot loop in a background thread
  - `POST /api/live/stop` — graceful shutdown (completes current tick, then stops)
  - `GET /api/live/status` — returns: running/stopped, current strategy, last heartbeat timestamp, open positions

---

### Phase 7: Dashboard V2 (Command Centre)

- [ ] **7.1 Mode toggle** — Add a `[ Backtest | Live ]` toggle to the sidebar header. Switching modes changes which panels and controls are visible.
- [ ] **7.2 Backtest history panel** — In Backtest mode, add a "Past Runs" section that fetches from `GET /api/backtests` and lists previous runs with their key metrics. Clicking a row loads that run's results without re-running the backtest.
- [ ] **7.3 Live mode dashboard** — In Live mode, replace the backtest controls with:
  - Account summary card (balance, margin used, equity)
  - Active open positions table (instrument, direction, units, unrealised P&L — auto-refreshing every 30s)
  - Bot status indicator (running/stopped, last heartbeat)
  - Start / Stop bot buttons (connected to the control endpoints)
- [ ] **7.4 Kill switch button** — Large red "LIQUIDATE ALL" button in Live mode. On click, shows a confirmation modal before calling `POST /api/live/kill_switch`. Display success/failure feedback immediately.
- [ ] **7.5 Live equity ticker** — Poll `GET /api/live/account` every 60s and display a live-updating account equity value at the top of the sidebar.

---

### Phase 8: Infrastructure (Docker + Cloud)

> This phase only starts once Phase 6 (live bot) is working correctly on local.

- [ ] **8.1 Dockerfile — Backend** — Write a `Dockerfile` for the FastAPI app. Base image: `python:3.11-slim`. Copy `requirements.txt`, install deps, copy source, run with `uvicorn`.
- [ ] **8.2 Dockerfile — Frontend** — Write a multi-stage `Dockerfile`: build stage uses `node:20`, production stage serves the Vite build via `nginx:alpine`.
- [ ] **8.3 docker-compose.yml** — Compose file with three services: `backend`, `frontend`, `db` (PostgreSQL for production). Include environment variable injection for OANDA credentials from `.env`.
- [ ] **8.4 Migrate to PostgreSQL** — Swap the SQLite engine in `database.py` for a PostgreSQL connection string (env var). SQLAlchemy abstracts this — only the connection string changes.
- [ ] **8.5 Cloud deployment** — Deploy the Docker Compose stack to an AWS EC2 `t3.micro` instance. The bot must run 24/7 without the local machine being on. Set up basic CloudWatch alerts for bot crashes.

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
               Phase 5 (OANDA)
                        ↓
               Phase 6 (Live Bot)
                        ↓
               Phase 7 (Dashboard V2)
                        ↓
               Phase 8 (Docker + Cloud)
```

Phase 1 (Data) and Phase 2 (DB) can be built in parallel. Everything from Phase 3 onward is sequential.

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
