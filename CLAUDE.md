# QuantDash — Claude Context File

## Project Overview
QuantDash is a full-stack algorithmic trading and backtesting platform: a FastAPI backend paired with a React/Vite frontend. It started (V1) as a historical backtester — pick a ticker, date range, and strategy, run a backtest, see metrics/chart/trade log — and has since grown (V2/V3, current work on `feature/v3`) toward live-execution trading: OANDA paper-trading integration, walk-forward optimization, realistic market microstructure (spread/slippage/financing), a strategy library (SMA, Bollinger, EMA, MACD, RSI, Contrarian, N-Day Momentum, Buy & Hold), and a "Live Trading" dashboard mode with a kill switch.

For the current code layout, see `backend/CLAUDE.md` and `frontend/CLAUDE.md` — they map what's in each folder. For design/implementation history and specs, see `docs/context/` (index below).

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

Or from the repo root: `docker-compose up` (builds and runs both services).

## CI/CD
GitHub Actions: `.github/workflows/ci.yml` (lint/typecheck/test + build-verify, runs on push to `develop`/`master` or PRs targeting them), `.github/workflows/cd.yml` (publishes Docker images to GHCR after CI succeeds on `develop`/`master`), and `.github/workflows/deploy.yml` (SSHes into the homeserver over Tailscale to pull+restart containers after CD succeeds on `master`). See `docs/plans/2026-10-10-cicd-pipeline-plan.md` and `docs/plans/2026-10-18-deploy-pipeline-plan.md` for the design rationale.

---

## Maintaining Context

This repo accumulates design/implementation context in `docs/context/` instead of growing this file indefinitely. Follow this after finishing any non-trivial piece of work (a new feature, a fix with non-obvious rationale, an architectural change):

1. **Check the index first** — `docs/context/README.md` lists every doc in `docs/context/` with a one-line description. Read it before deciding where something belongs; don't open every file to find out.
2. **Update in place when a doc already covers the topic.** E.g. a change to strategy execution goes into `docs/context/strategy-execution-flow.md`, not a new file. Specs/architecture docs in `docs/context/` are living documents, updated as the system evolves — not one-off snapshots (the exception is `architecture.md`, explicitly kept as a historical V1 snapshot).
3. **Create a new file only for genuinely new scope** that doesn't fit an existing doc. Add it to `docs/context/README.md`'s index in the same change.
4. **Plans go in `docs/plans/`, not `docs/context/plans/` or `docs/superpowers/`.** When using plan mode or the brainstorming/writing-plans skills, save the resulting plan/spec into `docs/plans/` (one file per task, named `YYYY-MM-DD-<topic>.md`) instead of those skills' own default `docs/superpowers/` location — this is the "user preference" override those skills already support. Plans are written once and left alone — do not revise a plan file after the work it describes is done, even if the implementation diverges from it later; that's what `docs/context/` is for. `docs/plans/` has no index of its own and isn't listed in `docs/context/README.md`.
5. **Keep this root file an overview.** Detailed "what exists and how it works" content belongs in `docs/context/`, not here — this file should stay short enough to read in full every session.

`backend/CLAUDE.md` and `frontend/CLAUDE.md` are directory maps, not context docs — update them only when the folder structure itself changes (new top-level module/folder), not for every feature.
