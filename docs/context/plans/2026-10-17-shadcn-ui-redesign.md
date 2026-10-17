# QuantDash UI Redesign: shadcn/ui + Sober (screener.in-style) Theme (Phase 1: Shell + Backtest Page)

> **Revision note (post-implementation):** the original brainstormed direction below ("brutalist/light": thick black borders, zero radius, uppercase tracked labels) shipped but still read as templated/AI-generated once seen live. Live feedback asked to replicate screener.in's actual look instead. The **Decisions** section has been updated in place to the direction that actually shipped; the superseded brutalist decisions are struck through for history.

## Context

The frontend (`frontend/CLAUDE.md`) has no UI component library today — React 19 + hand-rolled CSS (`App.css`), a dark theme with a hover-expanding icon nav rail, topbar, and card-grid metrics. Visually it follows the common "AI-generated dashboard" template (dark near-black background, single flat green accent, borders-only panels, uniform small border-radius, system-ui/Inter type) closely enough to read as templated rather than designed, even though it was hand-coded.

Goal: adopt shadcn-style component primitives (plain Tailwind + `cva`, not Radix — see Stack changes) as the component layer, restyled to a **sober, screener.in-inspired** direction that is visually distinct from both the current theme and from shadcn's own default look (which has become its own recognizable "AI tool" template) — and, per live feedback, distinct from a generic "brutalist" template too.

## Decisions (from brainstorming, then revised against live feedback)

- ~~**Visual direction:** Brutalist/light — off-white surface, thick (2px) black rules, zero border-radius, bold type carries hierarchy instead of color/shadow.~~ **Revised: Sober/screener.in** — checked screener.in's actual stylesheet (`cdn-static.screener.in/css/custom.*.css`) rather than guessing: pure white background (`#ffffff`), thin 1px light-gray borders (`--color-border: #e3e5e9`), **subtle border-radius (6px)** — screener.in is not zero-radius — and normal-case, medium-weight type instead of uppercase/tracked "shouting" labels.
- **Layout shell:** Persistent, always-visible text-labeled sidebar (not a hover-to-expand icon rail). No separate topbar/status strip — brand mark sits inline with content. (Unchanged.)
- ~~**Typography:** Grotesk/Helvetica-Now-style sans (e.g. a geometric grotesk such as Space Grotesk or similar) for both headings and body; no serif, no monospace-everywhere, no condensed display face.~~ **Revised: Inter** — screener.in's actual font, confirmed via its stylesheet links.
- **Color policy:** Monochrome (black/white/gray) base, color only for semantic meaning (profit/loss, live/offline status) — unchanged, but a single **accent blue** (`--color-accent: #2563eb`) was added for interactive affordances (links, primary buttons, focus rings, active nav state), matching screener.in's use of a link/accent color rather than staying purely monochrome for interactive elements.
- **Component source:** Hand-written shadcn-style primitives in `src/components/ui/` (`cva` + `cn`, no Radix — see the implementation plan's "Deliberate simplification" note) — unchanged, just themed to the revised tokens above instead of the brutalist ones.

## Stack changes

Add (frontend only, no backend changes):
- `tailwindcss`, `postcss`, `autoprefixer` — utility CSS layer, replaces `App.css`/`index.css` hand-written rules.
- `class-variance-authority`, `clsx`, `tailwind-merge` — shadcn's standard variant/class-merging helpers.
- `lucide-react` — icon set shadcn components expect.
- `@radix-ui/*` packages as needed per shadcn component added (installed automatically by the shadcn CLI per-component).
- shadcn CLI (`shadcn`) run ad hoc via `npx`, not a persistent devDependency requirement beyond what it scaffolds.

Theme tokens (`@theme` block in `src/index.css`, replacing the `:root` variables currently in `App.css` for the Backtest-scoped parts of the app):
- Background: pure white (`#ffffff`), text near-black (`#1a1d23`).
- Border: `--color-border: #e3e5e9` (light gray), 1px, with `rounded-md` (6px) on bordered surfaces — not zero-radius.
- Accent: `--color-accent: #2563eb` (blue) for interactive elements (primary button, focus rings, active nav). Profit/loss and status still semantic green/red only.
- Type: Inter for everything (headings, labels, body); numeric values keep `font-variant-numeric: tabular-nums` as today for alignment in metric cards/tables.
- Shadows: minimal — a subtle `shadow-md` on floating elements like tooltips, otherwise separated by thin borders.

## Scope: what changes vs. what stays

**Stays unchanged:**
- `lightweight-charts` rendering logic in `TradingChart.tsx` / `EquityCurveChart.tsx` (candlestick/line series config, trade markers) — only the surrounding container/chrome markup and CSS classes change to match the new shell.
- `api/`, `hooks/`, `types/`, `constants/` — no data-layer changes.
- All backend code.

**Changes in this task (Phase 1):**
- `App.css` / `index.css` replaced by Tailwind base + theme CSS variables.
- App shell (`App.tsx`, `TopBar.tsx`, `NavRail.tsx`, `RegimeHeader.tsx`): rebuilt as a single persistent labeled sidebar + content area. The hover-expanding icon rail and separate topbar strip are removed; brand mark moves inline with page content. `RegimeHeader`'s content (regime/VIX display) is kept but relocated into the new shell layout rather than its own top strip — exact placement decided during implementation, consistent with "no separate topbar."
- `BacktestPage.tsx` and its direct children (`MetricsGrid`/`MetricCard`, `TradeLogTable`, the backtest top control bar currently in `.backtest-topbar`) migrated end-to-end to shadcn primitives (`Button`, `Input`/`Select` equivalents, `Card`, `Table`, `Tabs` if applicable) as the reference implementation other pages will follow in Phase 2.

**Explicitly out of scope for this task (Phase 2, separate follow-up):**
- `WalkForwardPage`, `LivePage`, `HistoryPage`, `SettingsPage`, `AboutPage` and their dedicated components (`WalkForwardTable`, `LiveChart`/`LivePanel`/`LiveSidebar`, `HistoryPanel`/`HistorySidebar`, `AdvancedSettingsPanel`/`Sidebar`, `AboutPanel`, `FeatureImportancePanel`, `WindowTimelineChart`) — these keep their current CSS/markup until Phase 2 migrates them to match the new shell and theme.

## Testing

- `npm run typecheck`, `npm run lint`, `npm run build` must stay green after the migration.
- `__tests__/App.test.tsx` is a smoke test against current markup/selectors; update its selectors as needed to match the new shell structure rather than expanding its test scope.
- Manual verification: run `npm run dev`, visually confirm the new shell + Backtest page (golden path: run a backtest, see metrics/chart/trade log) and check for regressions in nav between pages (even though only Backtest is restyled, switching to other pages must not break).

## Open items for implementation

- Exact placement of the regime/VIX indicator content within the new shell (inline in sidebar footer vs. inline at top of main content) — implementer's call within the "no separate topbar" constraint, matching whichever reads cleaner against the sidebar layout.
- Specific grotesk font to use (self-hosted vs. a Google Fonts link) — implementer's call; must be a true grotesk/geometric sans, not Inter/system-ui (to avoid reverting to the generic default).
