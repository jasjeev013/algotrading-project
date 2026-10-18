# Context Index

One line per doc. Check here before opening files, and before deciding
whether to update an existing doc or create a new one. See the root
`CLAUDE.md` "Maintaining Context" section for the update rule.

## Specs / architecture

- [architecture.md](architecture.md) — V1 implementation snapshot (strategies, backtester, analytics, frontend) — historical, superseded by V3 work in `app/`
- [project-summary.md](project-summary.md) — high-level V1 project summary (what it is, current state)
- [project-plan-v1.md](project-plan-v1.md) — original V1 build plan
- [project-plan-v2.md](project-plan-v2.md) — V2 master plan: live execution, OANDA, walk-forward, market microstructure
- [2026-08-22-v3-strategy-library-design.md](2026-08-22-v3-strategy-library-design.md) — V3 strategy library design (EMA/MACD/RSI/Contrarian/NDayMomentum, categorisation)
- [strategy-execution-flow.md](strategy-execution-flow.md) — how a strategy's signals flow through the backtester/vectorized backtester
- [live-paper-trading.md](live-paper-trading.md) — live bot / OANDA paper trading execution flow
- [frontend-db-costs.md](frontend-db-costs.md) — frontend state persistence, DB schema, and cost-model calculations
- [learning-roadmap.md](learning-roadmap.md) — personal learning roadmap notes

Implementation plans live in `docs/plans/` (one level up, not under
`context/`) — one file per task, written once and never updated after the
fact. This index only covers the living specs/architecture docs above.
