# Frontend TypeScript Migration + CI Typecheck

## Context

The frontend was plain JS/JSX with no type information anywhere (no
PropTypes, no JSDoc, no `tsconfig.json`) — a gap called out as deliberate,
deferred work both in a TODO comment in `frontend/src/__tests__/App.test.jsx`
and in the CI/CD design doc (`plans/2026-10-10-cicd-pipeline-plan.md`), which
explicitly skipped adding a frontend typecheck job pending this migration.
This task fulfills that TODO: the whole frontend (40 files) is converted to
TypeScript in one pass, `tsconfig` uses `strict: true` from the start (there
was no legacy JSDoc/PropTypes looseness to preserve), API response/request
shapes are hand-written in `frontend/src/types/` based on the actual backend
Pydantic schemas (no OpenAPI codegen), and a `typecheck-frontend` CI job was
added mirroring the existing `typecheck-backend` (mypy) job.

## What changed

- Added `typescript` and `typescript-eslint` to `frontend/package.json`
  devDependencies, plus a `"typecheck": "tsc -b --noEmit"` script.
- Added `tsconfig.json` (references-only), `tsconfig.app.json` (`src/`, DOM
  lib, `strict: true`), `tsconfig.node.json` (`vite.config.ts`, Node lib).
- Added `frontend/src/types/`: `strategy.ts`, `backtest.ts`,
  `walkForward.ts`, `live.ts`, `history.ts`, `api.ts`, `mode.ts` — hand-written
  interfaces grounded in `backend/app/schemas/*.py`, the router response
  shapes in `backend/app/routers/*.py`, and `backend/app/services/*.py`
  (`analytics.calculate_metrics`, `live_bot.LiveBotController.state`,
  `execution_handler.OandaExecutionHandler`). OANDA's own raw JSON (account
  summary, positions) stays index-signature shaped (`[key: string]: unknown`)
  rather than fully modeled, since the backend passes it through largely
  untouched.
- Added `frontend/src/api/errors.ts` (`extractErrorDetail`) to replace the
  repeated `err.response?.data?.detail` pattern with an `axios.isAxiosError`
  type guard — strict mode doesn't tolerate a bare `catch (err: any)`.
- Renamed every `.jsx` → `.tsx` and `.js` → `.ts` (via `git mv`, preserving
  blame), including `vite.config.js` → `vite.config.ts` (switched to
  `import { defineConfig } from "vitest/config"` so the `test` config key
  type-checks) and `index.html`'s entry script tag.
- `eslint.config.js`: widened `files` to include `ts`/`tsx`, added
  `typescript-eslint`'s recommended config.
- `.github/workflows/ci.yml`: added `typecheck-frontend` (Node 22, `npm ci` +
  `npm run typecheck`), and added it to `build-frontend-image`'s `needs`.
- Removed the now-fulfilled TODO comment in `App.test.tsx`.

## Notable typing decisions

- `StrategyParams` is `Record<string, number | string>` — number inputs'
  `onChange` hands back raw strings before `useStrategyConfig` parses them,
  so the looseness is real, not a gap.
- `BacktestResults`/`WalkForwardResults` model both response shapes a single
  `results` state can hold (the full POST response, or the leaner GET
  `.../{id}` reload) as one type with the non-overlapping fields optional,
  rather than a discriminated union — matches how the hooks actually use it.
- Chart components (`TradingChart`, `LiveChart`, `EquityCurveChart`) cast
  plain ISO date strings to `lightweight-charts`' `Time` type at the
  boundary; the library parses them correctly at runtime but its types don't
  model that loosely.

## Verification

- `npm run typecheck`, `npm run lint` — clean (one pre-existing
  `react-hooks/exhaustive-deps` warning in `TradingChart.tsx`, present
  before the migration too, out of scope here).
- `npm run test` / `npm run build` could not be exercised in the sandbox this
  migration was built in (a Windows `node.exe` process against a
  `\\wsl.localhost\...`-mounted working directory hits pre-existing
  `vite-node`/esbuild path-resolution bugs with or without this migration's
  changes — confirmed identical failures on the pre-migration JS code via
  `git stash`). CI runs on native Ubuntu runners and isn't affected.
