# QuantDash UI Redesign: shadcn/ui + Brutalist/Light Theme (Phase 1: Shell + Backtest Page)

## Context

The frontend (`frontend/CLAUDE.md`) has no UI component library today — React 19 + hand-rolled CSS (`App.css`), a dark theme with a hover-expanding icon nav rail, topbar, and card-grid metrics. Visually it follows the common "AI-generated dashboard" template (dark near-black background, single flat green accent, borders-only panels, uniform small border-radius, system-ui/Inter type) closely enough to read as templated rather than designed, even though it was hand-coded.

Goal: adopt shadcn/ui (Radix primitives + Tailwind) as the component layer, restyled to a **brutalist/light** direction that is visually distinct from both the current theme and from shadcn's own default look (which has become its own recognizable "AI tool" template).

## Decisions (from brainstorming)

- **Visual direction:** Brutalist/light — off-white surface, thick (2px) black rules, zero border-radius, bold type carries hierarchy instead of color/shadow.
- **Layout shell:** Persistent, always-visible text-labeled sidebar (not a hover-to-expand icon rail). No separate topbar/status strip — brand mark sits inline with content.
- **Typography:** Grotesk/Helvetica-Now-style sans (e.g. a geometric grotesk such as Space Grotesk or similar) for both headings and body; no serif, no monospace-everywhere, no condensed display face.
- **Color policy:** Monochrome (black/white/gray) base. Color appears **only** for semantic meaning — profit/loss (green/red), live/offline status, pass/fail — never decoratively.
- **Component source:** shadcn/ui CLI, which generates component source directly into the repo (`src/components/ui/`) rather than installing a opaque pre-styled package — we then theme those generated primitives to the brutalist/light tokens instead of leaving shadcn's default rounded/shadowed look.

## Stack changes

Add (frontend only, no backend changes):
- `tailwindcss`, `postcss`, `autoprefixer` — utility CSS layer, replaces `App.css`/`index.css` hand-written rules.
- `class-variance-authority`, `clsx`, `tailwind-merge` — shadcn's standard variant/class-merging helpers.
- `lucide-react` — icon set shadcn components expect.
- `@radix-ui/*` packages as needed per shadcn component added (installed automatically by the shadcn CLI per-component).
- shadcn CLI (`shadcn`) run ad hoc via `npx`, not a persistent devDependency requirement beyond what it scaffolds.

Theme tokens (Tailwind config + CSS variables, replacing the `:root` variables currently in `App.css`):
- Background: off-white (e.g. `#f4f2ee`), text near-black (`#111`).
- Border: solid 2px black (`#111`) on all bordered surfaces; **border-radius: 0** globally (override shadcn's default rounded corners in the theme, not per-component).
- Accent: none decorative. Semantic only — green for profit/positive, red for loss/negative, a neutral gray for disabled/muted. Live-trading status keeps a status color (green=live/healthy, red=offline/error) consistent with the P&L semantics rather than introducing a separate hue.
- Type: a grotesk sans for everything (headings, labels, body); numeric values keep `font-variant-numeric: tabular-nums` as today for alignment in metric cards/tables.
- Shadows: none — brutalist panels are separated by borders, not elevation.

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
