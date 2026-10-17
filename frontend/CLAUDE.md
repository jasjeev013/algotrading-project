# Frontend Directory Map

React 19 + Vite + TypeScript (`strict` mode) + Tailwind CSS v4. Entry point:
`src/main.tsx` → `src/App.tsx`. UI theme: sober, screener.in-inspired
(Inter, white background, thin gray borders, blue accent, semantic
red/green only) — see `docs/context/plans/2026-10-17-shadcn-ui-redesign.md`.

For *why* things work the way they do, see `docs/context/` at the repo root
(`frontend-db-costs.md` covers state persistence/DB schema/cost calculations).
This file only maps *where* things are.

```
src/
├── main.tsx            # React root render
├── App.tsx               # top-level app: layout, routing between pages, shared state
├── index.css              # Tailwind entry + @theme tokens + global resets
├── vite-env.d.ts          # Vite client type references (CSS/asset imports, import.meta.env)
├── components.json         # shadcn-style config (aliases, theme pointers)
├── lib/
│   └── utils.ts              # cn() — clsx + tailwind-merge
├── api/
│   ├── config.ts            # axios instance / base URL config for backend calls
│   └── errors.ts             # extractErrorDetail — shared axios error-message helper
├── types/                  # hand-written interfaces mirroring backend Pydantic schemas/responses
│   ├── strategy.ts            # StrategyName, EngineName, StrategyParams
│   ├── backtest.ts             # Trade, PricePoint, EquityPoint, Metrics, BacktestResults
│   ├── walkForward.ts           # WalkForwardWindowMetric, WalkForwardResults
│   ├── live.ts                   # LiveAccount, LiveStatus, LiveCandle, LiveTrade, KillSwitchResult
│   ├── history.ts                 # HistoryRun
│   ├── api.ts                      # ApiErrorResponse
│   └── mode.ts                      # Mode (top-level tab union)
├── pages/                 # one file per top-level route/view
│   ├── AboutPage.tsx
│   ├── BacktestPage.tsx
│   ├── HistoryPage.tsx
│   ├── LivePage.tsx
│   ├── SettingsPage.tsx
│   └── WalkForwardPage.tsx
├── components/
│   ├── ui/                    # shadcn-style primitives (cva + cn, no Radix — see the redesign spec)
│   │   ├── button.tsx / input.tsx / select.tsx
│   │   └── card.tsx / badge.tsx / table.tsx
│   ├── Sidebar.tsx              # persistent labeled nav + market/backend status footer
│   ├── RegimeHeader.tsx          # SPY/VIX/regime strip, shown above every page
│   ├── TradingChart.tsx            # lightweight-charts v5 candlestick + trade markers
│   ├── EquityCurveChart.tsx
│   ├── LiveChart.tsx
│   ├── WindowTimelineChart.tsx
│   ├── MetricsGrid.tsx / MetricCard.tsx
│   ├── TradeLogTable.tsx
│   ├── WalkForwardTable.tsx / WalkForwardTopBar.tsx
│   ├── HistoryPanel.tsx / HistorySidebar.tsx
│   ├── LivePanel.tsx / LiveSidebar.tsx
│   ├── AdvancedSettingsPanel.tsx / AdvancedSettingsSidebar.tsx
│   ├── BacktestTopBar.tsx
│   ├── StrategyParamsFields.tsx  # shared by BacktestTopBar and WalkForwardTopBar
│   ├── AboutPanel.tsx
│   └── FeatureImportancePanel.tsx
├── hooks/                   # custom hooks, one concern each
│   ├── usePersisted.ts         # generic localStorage-backed state persistence
│   ├── useHistory.ts
│   ├── useLiveTrading.ts
│   ├── useStrategyConfig.ts
│   ├── useBacktestRun.ts
│   └── useWalkForwardRun.ts
├── constants/
│   └── strategyDefaults.ts   # default param values per strategy
├── utils/
│   └── chartTime.ts            # toChartTime — lightweight-charts time conversion helper
├── test/
│   └── setup.ts                # vitest + testing-library/jest-dom setup
└── __tests__/
    └── App.test.tsx             # smoke test
```

Tooling: `npm run lint` (eslint), `npm run typecheck` (`tsc -b --noEmit`),
`npm run test` (vitest run), `npm run build`. Lint, typecheck, and test all
run in CI (`.github/workflows/ci.yml`).
