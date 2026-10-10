# V1 Architecture Snapshot

**Status: historical.** This describes the original V1 implementation. The
codebase has since moved on (see `backend/app/` and `frontend/src/` for the
current structure, and `backend/CLAUDE.md` / `frontend/CLAUDE.md` for maps of
what's there now). Kept for reference on the original design decisions.

## Architecture (V1 — as originally built)

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

## Tech Stack (V1)
| Layer | Technology |
|-------|-----------|
| Backend | Python 3.14, FastAPI 0.140, Uvicorn |
| Data | yfinance 1.5, pandas 3.0, numpy 2.5 |
| ML | scikit-learn 1.9 (RandomForestClassifier) |
| Frontend | React (Vite), lightweight-charts v5, axios |
| Dev | WSL2 Ubuntu on Windows 11 |

## V1 Implementation — What Existed

### Strategies (`strategies.py`)
All strategies extend `BaseStrategy` (ABC) and implement `generate_signals() -> pd.DataFrame`.
The returned DataFrame must have `time`, `close`, `open`, `high`, `low`, `position` (1=long, -1=short, 0=flat), and `signal` (diff of position).

- **`SMACrossover`** — trend-following; params: `short_window` (default 20), `long_window` (default 50)
- **`BollingerBands`** — mean-reversion; params: `window` (default 20), `num_std` (default 2.0)
- **`MLRandomForest`** — momentum predictor; features: returns, 3d/5d momentum, 5d volatility
  - **Known issue:** trained on the full dataset without a train/test split — data leakage. Flagged for fixing before walk-forward work (see `strategy-execution-flow.md` and the walk-forward engine in `backend/app/services/` for the current state).

### Backtester (`backtester.py`)
Iterated row-by-row. Tracked `current_pos` (1/-1/0), `entry_price`, and `equity`. On position change: closed existing trade (gross return ± 2× commission), opened new one. Commission was a flat percentage per trade (default 0.1%).

### Analytics (`analytics.py`)
Calculated: Total Return, CAGR, Max Drawdown, Win Rate, annualised Sharpe (252 trading days).

### Frontend
- Sidebar: ticker, start/end date, strategy dropdown, initial capital
- Strategy params were hardcoded in the payload (`short_window=20`, `long_window=50`, etc.) — not dynamically exposed in the UI
- `TradingChart.jsx`: lightweight-charts v5 candlestick with `createSeriesMarkers` for buy/sell arrows
- Equity curve data was returned from the backend but not plotted in the frontend

## Known Gaps Heading into V2 (as of V1)
1. **ML data leakage** — `MLRandomForest` trains on the full backtest window; needed proper walk-forward splits before any live use
2. **Equity curve not plotted** — backend returns `equity_curve` but the frontend only showed metrics cards
3. **Strategy params hardcoded** — frontend always sent the same params regardless of strategy
4. **No persistence** — all results were in-memory; a server crash lost everything
5. **CORS whitelist** was hardcoded to `localhost:5173`

See `project-plan-v2.md` for the V2 direction that followed, and `project-plan-v1.md` for the original build plan.
