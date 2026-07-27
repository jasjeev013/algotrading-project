# Project Master Plan: "QuantDash" - Algorithmic Trading Platform

## 1. Project Vision
To build a scalable, full-stack algorithmic trading and backtesting platform. This project serves to transition theoretical algorithmic trading knowledge (strategies, FDA, APIs) into a robust software engineering paradigm. It is designed as a foundational architecture that starts with historical backtesting but is structured to seamlessly expand into live algorithmic execution, advanced machine learning integration, and high-frequency data processing in the future.

## 2. Project Goals
*   **Educational Goal:** Master the complete pipeline of algorithmic trading: Data Acquisition $\rightarrow$ Signal Generation $\rightarrow$ Risk/Position Sizing $\rightarrow$ Execution simulation $\rightarrow$ Performance Analytics.
*   **Technical Goal:** Build a decoupled modern web application using a fast Python backend (FastAPI) and a dynamic JavaScript frontend (React).
*   **Quantitative Goal:** Develop an iterative backtesting engine that simulates realistic market conditions by accounting for transaction costs and slippage, overcoming the common pitfalls of vectorized backtesting.
*   **Expandability Goal:** Use Object-Oriented Programming (OOP) so that adding a new strategy in the future requires writing only one new Python class, without touching the rest of the engine.

## 3. Scope of Work (Version 1.0)
**In-Scope:**
*   Historical data fetching via `yfinance` (Daily/Hourly timeframes).
*   A custom iterative backtesting engine built in Python.
*   Implementation of at least 3 distinct trading strategies (e.g., SMA Crossover, Bollinger Bands Mean Reversion, Momentum/Contrarian).
*   Simulation of realistic trading conditions (broker commissions/fees).
*   Calculation of Financial Data Analysis (FDA) metrics: Total Return, CAGR, Max Drawdown, Sharpe Ratio, Win Rate.
*   Interactive frontend dashboard for parameter selection, candlestick charting, and equity curve visualization.

**Out-of-Scope (Saved for V2):**
*   Live execution (Paper or Real money) via OANDA/IBKR APIs.
*   High-Frequency Trading (Tick-level or Order Book Level-2 data).
*   Complex Deep Learning architectures (LSTMs, Neural Networks).

## 4. Deliverables
1.  **Data Module:** A robust API endpoint for fetching and cleaning financial time-series data.
2.  **Strategy Library:** A modular folder of Python classes representing different trading algorithms.
3.  **Backtest Engine:** A Python module that iterates through data, executes simulated trades, logs trade history, and calculates metrics.
4.  **Web Dashboard:** A React-based user interface displaying TradingView-style interactive charts, metrics, and a trade log.
5.  **Documentation:** A `README.md` explaining how to run the project and how to add a new strategy.

---

## 5. Architecture & Design Principles (For Future Expansion)
To ensure you can expand this project later, we will use **Separation of Concerns**:
*   **The Data Fetcher** does not know about the strategies. It just returns DataFrames.
*   **The Strategies** do not know about the portfolio. They just take in data and return "Buy", "Sell", or "Hold" signals.
*   **The Backtester** executes the signals, keeps track of the virtual cash balance, and applies transaction fees.
*   *Why?* Later, if you want to switch from `yfinance` to a paid data provider like Bloomberg or Alpaca, you only rewrite the Data module. The strategies and backtester remain untouched.

---

## 6. Task List & Work Breakdown Structure (WBS)

### Phase 1: Environment Setup & Architecture (✅ Completed)
*   1.1 Create project repository.
*   1.2 Initialize FastAPI backend and React frontend.
*   1.3 Setup CORS for API communication.
*   1.4 Setup version control (Git).

### Phase 2: Data Engineering (Backend)
*   2.1 Create a `data_fetcher.py` module.
*   2.2 Write function to fetch OHLCV data using `yfinance` based on Ticker, Start Date, End Date, and Timeframe.
*   2.3 Write a data cleaning function (handle `NaN` values, format timestamps).
*   2.4 Create FastAPI endpoint `GET /api/data` to expose this data to the frontend.
*   2.5 Test the endpoint using Postman or browser to ensure proper JSON formatting.

### Phase 3: The Strategy Engine (Backend)
*   3.1 Create a `BaseStrategy` Python class (OOP setup with abstract methods for `generate_signals`).
*   3.2 Implement `SMACrossoverStrategy` class inheriting from BaseStrategy.
*   3.3 Implement `BollingerBandsStrategy` class.
*   3.4 Implement a basic ML Strategy (e.g., Random Forest momentum predictor).

### Phase 4: The Backtesting Engine & FDA Metrics (Backend)
*   4.1 Create `backtester.py` module.
*   4.2 Develop the iterative loop (step through data row-by-row to simulate time passing).
*   4.3 Implement position sizing, virtual cash tracking, and commission deduction (e.g., 0.1% per trade).
*   4.4 Generate a `Trade Log` (List of dictionaries containing Entry Price, Exit Price, P&L, Dates).
*   4.5 Create an `analytics.py` module to calculate CAGR, Max Drawdown, Sharpe Ratio, and Win Rate based on the Trade Log.
*   4.6 Create FastAPI endpoint `POST /api/backtest` to receive user configurations and return final backtest results.

### Phase 5: Frontend Interface & Controls (Frontend)
*   5.1 Clean up default Vite React app and setup a basic dashboard layout (Sidebar + Main Content Area).
*   5.2 Build the configuration form (Inputs: Ticker, Dates, Strategy Dropdown, Initial Capital, Commission %).
*   5.3 Implement dynamic strategy parameters (e.g., showing SMA period inputs only when SMA is selected).
*   5.4 Connect the "Run Backtest" button to the backend `POST` endpoint using `fetch` or `axios`.

### Phase 6: Visualization & Reporting (Frontend)
*   6.1 Install and configure `lightweight-charts` (TradingView UI).
*   6.2 Plot historical OHLCV candlestick data on the chart.
*   6.3 Overlay Buy/Sell execution markers on the candlestick chart.
*   6.4 Build the Metrics Dashboard (Cards displaying Sharpe, Return, Drawdown with Green/Red conditional formatting).
*   6.5 Plot the Portfolio Equity Curve (Line chart).
*   6.6 Render the Trade Log in a scrollable data table.

### Phase 7: Polish & Bug Fixing
*   7.1 Handle edge cases (e.g., user inputs a fake ticker, or data doesn't exist for selected dates).
*   7.2 Add loading states/spinners while the backtest is running.
*   7.3 Final code refactoring and commenting.

---