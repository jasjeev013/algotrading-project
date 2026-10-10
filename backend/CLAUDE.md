# Backend Directory Map

FastAPI app. Entry point: `app/main.py` (`uvicorn app.main:app`). Real app code
lives under `app/`; root `backend/` holds tooling config (`requirements.txt`,
`requirements-dev.txt`, `pyproject.toml` — ruff/mypy config) and `tests/`.

For *why* things work the way they do, see `docs/context/` at the repo root
(`strategy-execution-flow.md`, `live-paper-trading.md`, `architecture.md` for
the V1-era design). This file only maps *where* things are.

```
app/
├── main.py              # FastAPI app instance, router registration, CORS
├── config.py            # env-driven settings (OANDA creds, risk limits, etc.)
├── database.py           # SQLAlchemy engine/session setup
├── models.py             # SQLAlchemy ORM models (backtest runs, live trades, etc.)
├── strategy_registry.py  # maps strategy name -> class, flags which are live-eligible
├── routers/               # FastAPI route handlers, one file per feature area
│   ├── root.py
│   ├── backtest.py
│   ├── history.py
│   ├── market_data.py
│   ├── walk_forward.py
│   └── live.py
├── schemas/                # Pydantic request/response models, mirrors routers/
│   ├── backtest.py
│   ├── live.py
│   ├── regime.py
│   └── walk_forward.py
├── services/                # business logic — the actual backtesting/trading engine
│   ├── strategies.py          # strategy library (BaseStrategy + concrete strategies)
│   ├── backtester.py           # row-by-row iterative backtest simulation
│   ├── vectorized_backtester.py # vectorized equivalent (see test_backtester_parity.py)
│   ├── analytics.py             # performance metrics (CAGR, Sharpe, drawdown, etc.)
│   ├── cost_model.py             # spread/slippage/commission/financing cost model
│   ├── data_fetcher.py            # yfinance historical data wrapper
│   ├── market_regime.py           # market regime detection
│   ├── walk_forward_engine.py     # walk-forward optimization engine
│   ├── execution_handler.py       # OANDA order execution (OandaExecutionHandler)
│   └── live_bot.py                 # live paper-trading bot loop/controller
└── utils/
    └── indicators.py        # shared technical indicator calculations (RSI, MACD, etc.)

tests/                    # pytest, run as `pytest tests` from backend/
├── test_strategies.py
├── test_backtester.py
└── test_backtester_parity.py   # asserts iterative vs vectorized backtester agree
```

Tooling: `ruff check backend` (lint), `mypy backend` (typecheck — some modules
are excluded via `[[tool.mypy.overrides]]` in `pyproject.toml`, see comment
there), `pytest tests`. All three run in CI (`.github/workflows/ci.yml`).
