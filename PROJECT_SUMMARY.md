# QuantDash — Project Summary

## What It Is
QuantDash is a full-stack algorithmic trading and backtesting platform. The core purpose is to simulate trading strategies against historical market data, measure their performance, and eventually support live paper-trading execution.

## Current State (V1 — Complete)
A working FastAPI + React dashboard where a user selects a ticker, date range, strategy, and initial capital, then runs a historical backtest and sees results.

**Backend** (`backend/`)
- `main.py` — FastAPI app with two endpoints: `GET /api/data`, `POST /api/backtest`
- `data_fetcher.py` — yfinance wrapper returning OHLCV data
- `strategies.py` — OOP strategy library (abstract `BaseStrategy` + 3 implementations)
- `backtester.py` — row-by-row simulation with commission deduction (0.1% default)
- `analytics.py` — computes Total Return, CAGR, Max Drawdown, Sharpe Ratio, Win Rate

**Frontend** (`frontend/`)
- `App.jsx` — sidebar controls + results pane
- `TradingChart.jsx` — lightweight-charts v5 candlestick with buy/sell markers

**Strategies implemented:**
| Strategy | Type | Key Params |
|----------|------|-----------|
| `SMACrossover` | Trend-following | `short_window=20`, `long_window=50` |
| `BollingerBands` | Mean-reversion | `window=20`, `num_std=2.0` |
| `MLRandomForest` | ML momentum | returns, 3d/5d momentum, 5d volatility |

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Backend | Python 3.14, FastAPI 0.140, Uvicorn |
| Data | yfinance 1.5, pandas 3.0, numpy 2.5 |
| ML | scikit-learn 1.9 |
| Frontend | React (Vite), lightweight-charts v5, axios |
| Dev env | WSL2 Ubuntu on Windows 11 |

## Known Issues (V1 Gaps)
1. **ML data leakage** — `MLRandomForest` trains on the full backtest window; needs walk-forward splits
2. **Equity curve not plotted** — backend returns `equity_curve` but the frontend doesn't render it
3. **Strategy params hardcoded** — frontend always sends the same params; no dynamic UI inputs
4. **No persistence** — all results are in-memory only
5. **CORS hardcoded** to `localhost:5173`

## V2 / V3 Direction
- Event-driven architecture for live data ingestion
- OANDA paper-trading API integration
- Walk-forward optimization (WFO) to prevent overfitting
- Realistic microstructure: bid/ask spread, slippage, overnight fees
- SQLite/PostgreSQL persistence via SQLAlchemy
- Docker containerization
- Live Trading dashboard mode with kill switch
- Indicator overlays (SMA lines, Bollinger bands) on the chart — partially implemented on `feature/v3`

## How to Run

```bash
# Backend
cd backend
source venv/bin/activate
uvicorn main:app --reload   # http://localhost:8000

# Frontend
cd frontend
npm run dev                 # http://localhost:5173
```
