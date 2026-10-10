# Frontend Directory Map

React 19 + Vite. Plain JS/JSX today — no TypeScript yet (planned follow-up,
see root `CLAUDE.md`). Entry point: `src/main.jsx` → `src/App.jsx`.

For *why* things work the way they do, see `docs/context/` at the repo root
(`frontend-db-costs.md` covers state persistence/DB schema/cost calculations).
This file only maps *where* things are.

```
src/
├── main.jsx            # React root render
├── App.jsx              # top-level app: layout, routing between pages, shared state
├── App.css / index.css
├── api/
│   └── config.js         # axios instance / base URL config for backend calls
├── pages/                 # one file per top-level route/view
│   ├── AboutPage.jsx
│   ├── HistoryPage.jsx
│   ├── LivePage.jsx
│   ├── SettingsPage.jsx
│   └── WalkForwardPage.jsx
├── components/              # shared/reusable UI pieces, used across pages
│   ├── TradingChart.jsx        # lightweight-charts v5 candlestick + trade markers
│   ├── EquityCurveChart.jsx
│   ├── WindowTimelineChart.jsx
│   ├── MetricsGrid.jsx / MetricCard.jsx
│   ├── TradeLogTable.jsx
│   ├── WalkForwardTable.jsx / WalkForwardTopBar.jsx
│   ├── HistoryPanel.jsx / HistorySidebar.jsx
│   ├── LiveChart.jsx / LivePanel.jsx / LiveSidebar.jsx
│   ├── AdvancedSettingsPanel.jsx / AdvancedSettingsSidebar.jsx
│   ├── StrategyParamsFields.jsx
│   ├── RegimeHeader.jsx / NavRail.jsx / TopBar.jsx
│   ├── AboutPanel.jsx
│   └── FeatureImportancePanel.jsx
├── hooks/                   # custom hooks, one concern each
│   ├── usePersisted.js         # localStorage-backed state persistence
│   ├── useHistory.js
│   ├── useLiveTrading.js
│   ├── useStrategyConfig.js
│   └── useWalkForwardRun.js
├── constants/
│   └── strategyDefaults.js   # default param values per strategy
├── test/
│   └── setup.js                # vitest + testing-library/jest-dom setup
└── __tests__/
    └── App.test.jsx             # smoke test
```

Tooling: `npm run lint` (eslint), `npm run test` (vitest run), `npm run build`.
Both lint and test run in CI (`.github/workflows/ci.yml`).
