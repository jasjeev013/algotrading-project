# QuantDash — Claude Context File

## Project Overview
QuantDash is a full-stack algorithmic trading and backtesting platform. V1 is complete: a FastAPI backend paired with a React/Vite frontend that lets a user pick a ticker, date range, and strategy, then runs a historical backtest and displays metrics, a candlestick chart with trade markers, and a trade log.

V2 goal: evolve the platform into a live-execution, event-driven trading bot connected to OANDA's paper-trading API.

---

## Architecture (V1 — Current State)

```
algotrading-project/
├── backend/
│   ├── main.py            # FastAPI app, two endpoints: GET /api/data, POST /api/backtest
│   ├── data_fetcher.py    # yfinance wrapper; returns list of OHLCV dicts
│   ├── strategies.py      # OOP strategy library (BaseStrategy ABC + 3 concrete classes)
│   ├── backtester.py      # Row-by-row iterative simulation; returns equity_curve + trade_log
│   ├── analytics.py       # Calculates Total Return, CAGR, Max Drawdown, Sharpe, Win Rate
│   ├── requirements.txt
│   └── venv/
└── frontend/
    ├── src/
    │   ├── App.jsx                    # Main dashboard (sidebar controls + results pane)
    │   └── components/TradingChart.jsx # lightweight-charts v5 candlestick + trade markers
    ├── package.json
    └── vite.config.js
```

### Data flow
```
Frontend (React) → POST /api/backtest → FastAPI
  → data_fetcher.py (yfinance)
  → strategies.py (generates signal column on DataFrame)
  → backtester.py (iterative loop → equity_curve + trade_log)
  → analytics.py (metrics dict)
  ← JSON response: { metrics, equity_curve, trade_log, price_data }
```

---

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Backend | Python 3.14, FastAPI 0.140, Uvicorn |
| Data | yfinance 1.5, pandas 3.0, numpy 2.5 |
| ML | scikit-learn 1.9 (RandomForestClassifier) |
| Frontend | React (Vite), lightweight-charts v5, axios |
| Dev | WSL2 Ubuntu on Windows 11 |

---

## How to Run

**Backend** (from `backend/` dir):
```bash
source venv/bin/activate
uvicorn app.main:app --reload
# Runs on http://localhost:8000
```

**Frontend** (from `frontend/` dir):
```bash
npm run dev
# Runs on http://localhost:5173
```

---

## V1 Implementation — What Exists

### Strategies (`strategies.py`)
All strategies extend `BaseStrategy` (ABC) and implement `generate_signals() -> pd.DataFrame`.
The returned DataFrame must have `time`, `close`, `open`, `high`, `low`, `position` (1=long, -1=short, 0=flat), and `signal` (diff of position).

- **`SMACrossover`** — trend-following; params: `short_window` (default 20), `long_window` (default 50)
- **`BollingerBands`** — mean-reversion; params: `window` (default 20), `num_std` (default 2.0)
- **`MLRandomForest`** — momentum predictor; features: returns, 3d/5d momentum, 5d volatility
  - **Known issue:** trains on the full dataset without a train/test split — this is data leakage. Must be fixed before V2's walk-forward work.

### Backtester (`backtester.py`)
Iterates row-by-row. Tracks `current_pos` (1/-1/0), `entry_price`, and `equity`. On position change: closes existing trade (gross return ± 2× commission), opens new one. Commission is a flat percentage per trade (default 0.1%).

### Analytics (`analytics.py`)
Calculates: Total Return, CAGR, Max Drawdown, Win Rate, annualised Sharpe (252 trading days).

### Frontend
- Sidebar: ticker, start/end date, strategy dropdown, initial capital
- Strategy params are hardcoded in the payload (`short_window=20`, `long_window=50`, etc.) — not yet dynamically exposed in the UI
- `TradingChart.jsx`: lightweight-charts v5 candlestick with `createSeriesMarkers` for buy/sell arrows
- Equity curve data is returned from the backend but **not yet plotted** in the frontend

---

## Known Gaps Heading into V2
1. **ML data leakage** — `MLRandomForest` trains on the full backtest window; must be fixed with proper walk-forward splits before any live use
2. **Equity curve not plotted** — backend returns `equity_curve` but the frontend only shows metrics cards; no line chart exists yet
3. **Strategy params hardcoded** — frontend always sends the same params regardless of strategy; dynamic param inputs not implemented
4. **No persistence** — all results are in-memory; a server crash loses everything
5. **No equity curve line chart** in the UI
6. **CORS whitelist** is hardcoded to `localhost:5173`; will need updating for deployment

---

## V2 Direction
See `project-plan-v2.md`. Core upgrades:
- Event-driven architecture for live data processing
- OANDA paper trading API integration
- Walk-forward optimization (WFO) to prevent overfitting
- Realistic market microstructure (bid/ask spread, slippage, overnight fees)
- SQLite/PostgreSQL persistence via SQLAlchemy
- Docker containerization for cloud deployment
- Dashboard "Live Trading" mode with active positions and a kill switch
