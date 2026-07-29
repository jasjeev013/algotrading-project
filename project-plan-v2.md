# Project Master Plan: QuantDash MVP 2.0

## 1. Project Vision
To upgrade the QuantDash architecture from a static, end-of-day backtesting tool into a **live-execution, event-driven algorithmic trading bot**. MVP 2.0 will bridge the gap between theoretical profitability and real-world execution by introducing realistic market friction, advanced validation (walk-forward), and live paper-trading via the OANDA API.

## 2. Core Upgrades & The "Why"
*   **Live Execution (OANDA API):** Backtests mean nothing without execution. We will connect to OANDA’s Practice (Paper) API to stream live Forex/CFD data and execute real-time orders.
*   **Walk-Forward Testing:** To stop Machine Learning models from "cheating" by seeing future data (Overfitting), we will implement rolling-window Walk-Forward Optimization (WFO).
*   **Market Microstructure (Advanced Transaction Costs):** A 0.1% flat fee isn't realistic. We will model the **Bid/Ask Spread**, **Slippage** (price moving against you before your order fills), and **Overnight Financing Fees**.
*   **Deeper Data (Intraday):** Moving from `1d` (Daily) to `1m` and `15m` intraday timeframes.
*   **Multi-Asset & Macro Tracking:** Expanding the dashboard to track broader indices (S&P 500, VIX) alongside the traded asset to act as market regime filters (e.g., "Don't buy if VIX > 30").

---

## 3. Architecture Evolution: Iterative $\rightarrow$ Event-Driven
In V1, we used a simple `for` loop to iterate through data all at once. For V2, we must build an **Event-Driven Architecture**. 
*   *Why?* Because live markets generate "events" (a new minute passes, a new price tick arrives). Your system must sit and wait for a `MarketEvent`, run the Strategy to generate a `SignalEvent`, and send an `OrderEvent` to OANDA.

---

## 4. Phase Breakdown & Task List (WBS)

### Phase 1: Data Depth & Multi-Asset Tracking
*  1.1 Upgrade `data_fetcher.py` to support intraday intervals (`1m`, `5m`, `15m`) handling larger datasets.
*  1.2 Implement a `MarketRegime` module: Fetch tracking data like the VIX (Volatility Index) or SPY to determine if the market is trending, volatile, or flat.
*  1.3 **Frontend Update:** Add a mini-dashboard section to display live broader market health (Major indices, current volatility).

### Phase 2: Advanced Microstructure & Realistic Costs
*  2.1 Upgrade the `backtester.py` to account for the **Bid/Ask Spread** (e.g., buying at the Ask, selling at the Bid).
*  2.2 Implement a **Slippage Model** (e.g., assuming your order fills 0.02% worse than the signal price due to latency).
*  2.3 Implement **Overnight Fees** (swaps) for holding positions past the daily market close (crucial for Forex on OANDA).

### Phase 3: Walk-Forward Testing & Deep Strategies
*  3.1 Write a `walk_forward_engine.py`. Instead of training on 2020-2023, it will:
    *   Train on Year 1, Trade Year 2.
    *   Train on Year 2, Trade Year 3.
    *   Combine the traded years into a single, highly realistic equity curve.
*  3.2 **Strategy 1: Statistical Arbitrage (Pairs Trading).** Write a strategy that finds cointegrated pairs (e.g., AAPL & MSFT, or EUR/USD & GBP/USD) and trades the spread.
*  3.3 **Strategy 2: Advanced ML.** Upgrade the Random Forest to use proper feature scaling, walk-forward validation, and custom features (like MACD or RSI).

### Phase 4: OANDA API Integration (The Bridge)
*  4.1 Create an OANDA Practice Account and generate an API Token.
*  4.2 Create an `execution_handler.py` module using the `oandapyV20` Python library.
*  4.3 Write functions for: `get_live_price()`, `get_account_balance()`, `place_market_order()`, and `close_position()`.
*  4.4 Build a fail-safe: A "Kill Switch" that immediately liquidates all open positions if something goes wrong.

### Phase 5: The Live Trading Bot (The Brain)
*  5.1 Write a `live_bot.py` script. This script will run continuously (using Python's `asyncio` or `schedule` library).
*  5.2 Create the Event Loop:
    *   *Every 15 minutes:* Fetch the last 100 candles from OANDA.
    *   Pass data to the Strategy module.
    *   If Strategy returns "BUY", check current positions.
    *   If no position exists, trigger `execution_handler` to send order to OANDA.
*  5.3 Implement logging using Python's `logging` module so you have a text file recording every heartbeat and decision the bot makes.

### Phase 6: Dashboard V2 (Command Center)
*  6.1 Add a "Mode" toggle to the sidebar: **[ Backtest | Live Trading ]**.
*  6.2 When in "Live Trading" mode, connect the frontend to new FastAPI endpoints that return live OANDA account data.
*  6.3 Display a table of **Active Open Positions** (showing live unrealized P&L).
*  6.4 Add a giant red "LIQUIDATE ALL" emergency button to the UI that connects to the backend Kill Switch.

---

## 5. Technical Considerations for V2
*   **Database:** We need to start storing things. We will introduce **SQLite** or **PostgreSQL** via `SQLAlchemy`. You need to save your Trade Log to a database, not just RAM, in case the server crashes mid-trade.
*   **Docker:** To run a live bot, you shouldn't run it on your laptop (what if your WiFi drops?). In MVP 2.0, we will containerize the app using Docker, preparing it to be deployed to an AWS EC2 cloud server.

This plan moves you out of the "beginner" tutorial phase and into serious quantitative software engineering. Whenever you are ready to begin, we can start with **Phase 1**, upgrading our data depth and preparing the backend for higher-frequency analysis!