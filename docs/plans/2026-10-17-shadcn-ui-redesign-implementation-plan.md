# QuantDash shadcn/ui Redesign (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the QuantDash frontend's app shell and Backtest ("Strategy Explorer") page using Tailwind CSS + shadcn-style component primitives, in a brutalist/light visual theme, as the reference implementation for later migrating the rest of the app.

**Architecture:** Add Tailwind v4 (CSS-first config, `@tailwindcss/vite`) alongside the existing hand-written CSS rather than replacing it outright. A small set of shadcn-style primitives (`Button`, `Input`, `Select`, `Card`, `Badge`, `Table`) live in `src/components/ui/`, themed to brutalist/light via Tailwind's `@theme` tokens. The app shell (`Sidebar.tsx`) and the Backtest page's components are rewritten against these primitives; every other page (`WalkForwardPage`, `LivePage`, `HistoryPage`, `SettingsPage`, `AboutPage`) keeps its current CSS untouched, including the parts it shares with the Backtest page today (see Task 4's fork decision).

**Tech Stack:** React 19, Vite 7, TypeScript (strict), Tailwind CSS v4 (`@tailwindcss/vite` plugin, CSS-first `@theme`), `class-variance-authority`, `clsx`, `tailwind-merge`. No Radix primitives in this phase — see Global Constraints.

**Spec:** `docs/context/plans/2026-10-17-shadcn-ui-redesign.md`

## Global Constraints

- Tailwind v4, CSS-first config via `@theme` in `src/index.css` — no `tailwind.config.js`.
- Path alias `@/*` → `./src/*` (TypeScript `paths` + Vite `resolve.alias`).
- Visual theme (from the spec): off-white background, near-black foreground, 2px solid borders, **zero border-radius** everywhere (no Tailwind `rounded` utility is used anywhere in new code), Space Grotesk for all type, color used only for semantic meaning (profit=green/loss=red via `text-positive`/`text-negative`, never decoratively).
- **Do not delete or modify any existing rule in `frontend/src/App.css` except the single contiguous "Shell layout" + "Sidebar" + "Nav Rail" block (originally lines 86–388: `.app-shell`, `.dashboard-container`, `.topbar*`, `.regime-header*`, the bare `.sidebar` rule, `.nav-rail*`)** — every other rule (`.input-group`, `.params-box`, `.backtest-topbar*`, `.run-btn`, `table`/`th`/`td`, `.positive`/`.negative`, `.section-block`, `.spinner*`, `.empty-state`, `.error-message`, `.sidebar-section-title`, etc.) is still load-bearing for `WalkForwardPage`, `LivePage`, `HistoryPage`, `SettingsPage`, `LiveSidebar`, `HistorySidebar`, `AdvancedSettingsSidebar`/`Panel`, all explicitly out of scope for this phase.
- `StrategyParamsFields.tsx` is imported by both `BacktestTopBar.tsx` (in scope) and `WalkForwardTopBar.tsx` (out of scope) — it is one shared component instance, not just a shared class name. **Do not modify it.** Task 4 creates a separate `BacktestStrategyParamsFields.tsx` for the new Backtest-only styling instead, accepting temporary duplication until Phase 2 migrates WalkForward and the old file/fork can be collapsed back into one.
- Deliberate simplification vs. the spec's general "shadcn CLI generates per-component Radix deps" framing: this phase's `Select` wraps a native `<select>` (styled, not `@radix-ui/react-select`) and there is no `Tooltip` primitive — `MetricCard`'s existing portal-based tooltip is kept and just restyled with Tailwind classes. Rationale: Radix Select doesn't support native `<optgroup>` (needed for the Data Interval field) as simply as a native select, and a second tooltip implementation isn't justified when a working one already exists. `Button`/`Input`/`Card`/`Badge`/`Table` stay plain-HTML-plus-`cva`, matching shadcn's own non-Radix primitives.
- `npm run typecheck`, `npm run lint`, and `npm run build` must stay green after every task.

## Review Focus

- **No results yet on the Backtest page** (`results` is `null`, nothing run): the empty-state message ("Configure your parameters above…") must still render under the new styling, not crash on a null-check.
- **Switching tabs away from and back to Backtest** after the shell rewrite: `App.tsx`'s mode-based conditional rendering (which page, which secondary sidebar) must keep working — a reviewer should click through all six nav items, not just Backtest.
- **StatArb strategy selected in the Model dropdown**: `BacktestTopBar`'s conditional Pair Ticker field must still show only for StatArb, after swapping its `<select>`/`<input>` for the new primitives.
- **Intraday interval selected (5m/15m)**: the "~60 days of intraday history" hint must still conditionally render after restyling the Data Interval field.
- **Zero trades in the trade log** (e.g. Buy & Hold or a strategy that never exits): the "No trades executed during this period" empty row must still render correctly inside the new `Table` primitive, including its `colSpan`.

---

## Task 1: Wire up Tailwind v4 and the brutalist/light theme tokens

**Files:**
- Modify: `frontend/package.json` (via `npm install`, not hand-edited)
- Modify: `frontend/vite.config.ts`
- Modify: `frontend/tsconfig.app.json`
- Modify: `frontend/index.html`
- Modify: `frontend/src/index.css`
- Test: manual (`npm run build`, `npm run dev`)

**Interfaces:**
- Produces: Tailwind utility classes available in any `.tsx` file; CSS variables `--color-background`, `--color-foreground`, `--color-muted`, `--color-muted-foreground`, `--color-positive`, `--color-negative`, `--color-destructive`, `--color-destructive-foreground`, `--font-sans`, consumed as `bg-background`, `text-foreground`, etc. by later tasks. The `@/*` import alias, consumed by every file in `src/components/ui/` and `src/lib/utils.ts`.

- [ ] **Step 1: Install the new dependencies**

Run: `cd frontend && npm install tailwindcss @tailwindcss/vite class-variance-authority clsx tailwind-merge`

Expected: `package.json`/`package-lock.json` updated, no install errors.

- [ ] **Step 2: Add the Tailwind Vite plugin and the `@` path alias**

Modify `frontend/vite.config.ts` to:

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true, // This exposes the server to 0.0.0.0
    port: 5173,
    watch: {
      usePolling: true, // Needed for hot-reloading inside Docker Windows/Mac
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
});
```

- [ ] **Step 3: Add the matching path alias for TypeScript**

In `frontend/tsconfig.app.json`, add `baseUrl` and `paths` to `compilerOptions` (after `"strict": true,`, anywhere inside the object is fine — shown here appended at the end before the closing brace):

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Load the Space Grotesk font**

In `frontend/index.html`, add the font links inside `<head>`, after the existing `<meta name="viewport" ...>` line:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&display=swap"
  rel="stylesheet"
/>
```

- [ ] **Step 5: Add the Tailwind import and theme tokens**

At the very top of `frontend/src/index.css` (before the existing `* { box-sizing: border-box; }` rule — leave everything currently in the file as-is below this new block), insert:

```css
@import "tailwindcss";

@theme {
  --font-sans: "Space Grotesk", ui-sans-serif, system-ui, sans-serif;
  --color-background: #f4f2ee;
  --color-foreground: #111111;
  --color-muted: #e7e3da;
  --color-muted-foreground: #5c574c;
  --color-positive: #1e7a3d;
  --color-negative: #b3261e;
  --color-destructive: #b3261e;
  --color-destructive-foreground: #f4f2ee;
}
```

- [ ] **Step 6: Verify the build and dev server still work**

Run: `cd frontend && npm run typecheck && npm run build`
Expected: both succeed with no errors. (Nothing in the app renders with the new theme yet — no component uses it until Task 3 onward — so there should be no visible change if you also run `npm run dev`.)

- [ ] **Step 7: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vite.config.ts frontend/tsconfig.app.json frontend/index.html frontend/src/index.css
git commit -m "Wire up Tailwind v4 and brutalist/light theme tokens"
```

---

## Task 2: Create the `cn` utility and shadcn-style UI primitives

**Files:**
- Create: `frontend/components.json`
- Create: `frontend/src/lib/utils.ts`
- Create: `frontend/src/components/ui/button.tsx`
- Create: `frontend/src/components/ui/input.tsx`
- Create: `frontend/src/components/ui/select.tsx`
- Create: `frontend/src/components/ui/card.tsx`
- Create: `frontend/src/components/ui/badge.tsx`
- Create: `frontend/src/components/ui/table.tsx`
- Test: manual (`npm run typecheck`, `npm run build`)

**Interfaces:**
- Consumes: Tailwind theme tokens from Task 1 (`bg-background`, `text-foreground`, `border-foreground`, `bg-muted`, `text-muted-foreground`, `text-positive`, `text-negative`).
- Produces (consumed by Tasks 3–7):
  - `cn(...inputs: ClassValue[]): string` from `@/lib/utils`.
  - `Button`, `buttonVariants` from `@/components/ui/button` — `Button` props: `variant?: "default" | "outline" | "destructive" | "ghost"`, `size?: "default" | "sm"`, plus all native `<button>` attributes.
  - `Input` from `@/components/ui/input` — forwards all native `<input>` attributes.
  - `Select` from `@/components/ui/select` — forwards all native `<select>` attributes (including children `<option>`/`<optgroup>`).
  - `Card`, `CardHeader`, `CardTitle`, `CardContent` from `@/components/ui/card` — all forward native `<div>`/`<h3>` attributes.
  - `Badge`, `badgeVariants` from `@/components/ui/badge` — `Badge` props: `variant?: "neutral" | "positive" | "negative"`, plus native `<span>` attributes.
  - `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` from `@/components/ui/table` — forward native `<table>`/`<thead>`/`<tbody>`/`<tr>`/`<th>`/`<td>` attributes.

- [ ] **Step 1: Create `components.json`**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui"
  }
}
```

- [ ] **Step 2: Create `src/lib/utils.ts`**

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 3: Create `src/components/ui/button.tsx`**

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap border-2 border-foreground text-sm font-bold uppercase tracking-wide transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-foreground text-background hover:bg-foreground/90",
        outline: "bg-background text-foreground hover:bg-foreground hover:text-background",
        destructive: "border-negative bg-negative text-background hover:bg-negative/90",
        ghost: "border-transparent hover:bg-muted",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-xs",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
```

- [ ] **Step 4: Create `src/components/ui/input.tsx`**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full border-2 border-foreground bg-background px-2.5 py-1 text-sm text-foreground placeholder:text-muted-foreground focus-visible:bg-muted focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
```

- [ ] **Step 5: Create `src/components/ui/select.tsx`**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

// Deliberately a styled native <select>, not a Radix Select — see the
// "Deliberate simplification" global constraint in the plan.
const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-9 w-full border-2 border-foreground bg-background px-2.5 text-sm text-foreground focus-visible:bg-muted focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
);
Select.displayName = "Select";

export { Select };
```

- [ ] **Step 6: Create `src/components/ui/card.tsx`**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("border-2 border-foreground bg-background", className)} {...props} />
  ),
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("border-b-2 border-foreground px-4 py-2", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn("text-[11px] font-bold uppercase tracking-wide text-muted-foreground", className)}
      {...props}
    />
  ),
);
CardTitle.displayName = "CardTitle";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("px-4 py-3", className)} {...props} />,
);
CardContent.displayName = "CardContent";

export { Card, CardHeader, CardTitle, CardContent };
```

- [ ] **Step 7: Create `src/components/ui/badge.tsx`**

```tsx
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center border-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
  {
    variants: {
      variant: {
        neutral: "border-foreground text-foreground",
        positive: "border-positive text-positive",
        negative: "border-negative text-negative",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
```

- [ ] **Step 8: Create `src/components/ui/table.tsx`**

```tsx
import * as React from "react";
import { cn } from "@/lib/utils";

const Table = React.forwardRef<HTMLTableElement, React.TableHTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="w-full overflow-x-auto border-2 border-foreground">
      <table ref={ref} className={cn("w-full border-collapse text-left text-sm", className)} {...props} />
    </div>
  ),
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("border-b-2 border-foreground bg-muted", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => <tbody ref={ref} className={cn(className)} {...props} />);
TableBody.displayName = "TableBody";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn("border-b border-foreground/30 last:border-0 hover:bg-muted/50", className)}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn("px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground", className)}
      {...props}
    />
  ),
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("px-3 py-2 whitespace-nowrap", className)} {...props} />
  ),
);
TableCell.displayName = "TableCell";

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell };
```

- [ ] **Step 9: Verify**

Run: `cd frontend && npm run typecheck && npm run lint && npm run build`
Expected: all succeed. These files aren't imported anywhere yet, so no visual change.

- [ ] **Step 10: Commit**

```bash
git add frontend/components.json frontend/src/lib/utils.ts frontend/src/components/ui/
git commit -m "Add cn() utility and shadcn-style UI primitives (button, input, select, card, badge, table)"
```

---

## Task 3: Rebuild the app shell as a persistent labeled sidebar

**Files:**
- Create: `frontend/src/components/Sidebar.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/RegimeHeader.tsx`
- Modify: `frontend/src/App.css` (delete one contiguous block)
- Delete: `frontend/src/components/TopBar.tsx`
- Delete: `frontend/src/components/NavRail.tsx`
- Test: `frontend/src/__tests__/App.test.tsx` (already exists, no changes needed)

**Interfaces:**
- Consumes: `cn` from `@/lib/utils` (Task 2).
- Produces: `Sidebar` default export from `@/components/Sidebar`, props `{ mode: string; onSelect: (mode: string) => void }` — same signature `NavRail` had, so `App.tsx` swaps the import with no prop changes elsewhere.

- [ ] **Step 1: Create `src/components/Sidebar.tsx`**

```tsx
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import axios from "axios";
import { cn } from "@/lib/utils";

const NYSE_OPEN_HOUR = 9 * 60 + 30; // 09:30 ET in minutes
const NYSE_CLOSE_HOUR = 16 * 60; // 16:00 ET in minutes
const PREMARKET_OPEN = 4 * 60; // 04:00 ET
const AFTERHOURS_CLOSE = 20 * 60; // 20:00 ET

type MarketStatus = "open" | "pre-market" | "after-hours" | "closed";

function getMarketStatus(now: Date): MarketStatus {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value;
  const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);

  if (weekday === "Sat" || weekday === "Sun") return "closed";
  const tod = hour * 60 + minute;
  if (tod >= NYSE_OPEN_HOUR && tod < NYSE_CLOSE_HOUR) return "open";
  if (tod >= PREMARKET_OPEN && tod < NYSE_OPEN_HOUR) return "pre-market";
  if (tod >= NYSE_CLOSE_HOUR && tod < AFTERHOURS_CLOSE) return "after-hours";
  return "closed";
}

const MARKET_LABEL: Record<MarketStatus, string> = {
  open: "Market Open",
  "pre-market": "Pre-Market",
  "after-hours": "After-Hours",
  closed: "Market Closed",
};

const ICONS: Record<string, ReactNode> = {
  backtest: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 17l5-5 4 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 8h4v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  walkforward: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 4v3h-3M7 20v-3h3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  live: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path
        d="M19.4 13a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V19a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H4a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H10a1.7 1.7 0 0 0 1-1.5V4a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V10a1.7 1.7 0 0 0 1.5 1H20a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  about: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 17v-5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="8" r="0.5" fill="currentColor" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  ),
};

const NAV_ITEMS = [
  { mode: "backtest", label: "Strategy Explorer" },
  { mode: "walkforward", label: "Walk Forward Engine" },
  { mode: "live", label: "Live Paper Trading" },
  { mode: "settings", label: "Advanced Settings" },
  { mode: "history", label: "History" },
  { mode: "about", label: "About" },
];

interface SidebarProps {
  mode: string;
  onSelect: (mode: string) => void;
}

const Sidebar = ({ mode, onSelect }: SidebarProps) => {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [now, setNow] = useState(new Date());
  const [marketStatus, setMarketStatus] = useState<MarketStatus>(() => getMarketStatus(new Date()));

  useEffect(() => {
    let cancelled = false;
    const checkHealth = async () => {
      try {
        await axios.get("http://localhost:8000/", { timeout: 4000 });
        if (!cancelled) setConnected(true);
      } catch {
        if (!cancelled) setConnected(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const clock = setInterval(() => {
      const n = new Date();
      setNow(n);
      setMarketStatus(getMarketStatus(n));
    }, 1000);
    return () => clearInterval(clock);
  }, []);

  return (
    <div className="flex h-full w-56 flex-shrink-0 flex-col border-r-2 border-foreground bg-background">
      <div className="border-b-2 border-foreground px-4 py-4">
        <div className="text-lg font-bold tracking-tight">QUANTDASH</div>
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Algorithmic Trading</div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto py-3">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.mode}
            onClick={() => onSelect(item.mode)}
            className={cn(
              "flex items-center gap-3 border-l-4 px-4 py-2.5 text-left text-[13px] font-bold uppercase tracking-wide transition-colors",
              mode === item.mode
                ? "border-foreground bg-muted text-foreground"
                : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <span className="h-4 w-4 flex-shrink-0">{ICONS[item.mode]}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <div className="border-t-2 border-foreground px-4 py-3 text-[11px] text-muted-foreground">
        <div className="flex items-center gap-2 py-1">
          <span
            className={cn(
              "h-2 w-2",
              marketStatus === "open" ? "bg-positive" : marketStatus === "closed" ? "bg-negative" : "bg-muted-foreground",
            )}
          />
          {MARKET_LABEL[marketStatus]}
        </div>
        <div className="flex items-center gap-2 py-1">
          <span
            className={cn(
              "h-2 w-2",
              connected === null ? "bg-muted-foreground" : connected ? "bg-positive" : "bg-negative",
            )}
          />
          {connected === null ? "Checking backend…" : connected ? "Backend Connected" : "Backend Offline"}
        </div>
        <div className="pt-1 font-mono tabular-nums">
          {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
```

- [ ] **Step 2: Restyle `RegimeHeader.tsx`**

Replace the full contents of `frontend/src/components/RegimeHeader.tsx` with:

```tsx
import { useEffect, useState } from "react";
import axios from "axios";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface Regime {
  regime: string;
  spy_price: number;
  spy_daily_change_pct: number;
  spy_trend: string;
  vix_level: number;
  as_of: string;
}

const vixClass = (vix: number | null | undefined) => {
  if (vix === null || vix === undefined) return "text-foreground";
  if (vix < 20) return "text-positive";
  if (vix < 30) return "text-muted-foreground";
  return "text-negative";
};

const regimeVariant = (regime: string): "positive" | "negative" | "neutral" => {
  const r = regime.toLowerCase();
  if (r === "trending") return "positive";
  if (r === "volatile") return "negative";
  return "neutral";
};

const RegimeHeader = () => {
  const [regime, setRegime] = useState<Regime | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchRegime = async () => {
      try {
        const res = await axios.get<Regime>("http://localhost:8000/api/regime", { timeout: 8000 });
        if (!cancelled) {
          setRegime(res.data);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Regime data unavailable");
      }
    };
    fetchRegime();
    const poll = setInterval(fetchRegime, 60000);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, []);

  if (error) {
    return <div className="mb-4 text-[12.5px] text-muted-foreground">{error}</div>;
  }
  if (!regime) {
    return <div className="mb-4 text-[12.5px] text-muted-foreground">Loading market regime…</div>;
  }

  const changeClass = regime.spy_daily_change_pct >= 0 ? "text-positive" : "text-negative";

  return (
    <div className="mb-4 flex flex-wrap items-center gap-6 border-b-2 border-foreground pb-3 text-[12.5px]">
      <div className="flex items-baseline gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">SPY</span>
        <span className="font-bold tabular-nums">${regime.spy_price.toFixed(2)}</span>
        <span className={cn("tabular-nums", changeClass)}>
          {regime.spy_daily_change_pct >= 0 ? "+" : ""}
          {regime.spy_daily_change_pct.toFixed(2)}%
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">VIX</span>
        <span className={cn("font-bold tabular-nums", vixClass(regime.vix_level))}>
          {regime.vix_level.toFixed(2)}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Regime</span>
        <Badge variant={regimeVariant(regime.regime)}>{regime.regime}</Badge>
      </div>
    </div>
  );
};

export default RegimeHeader;
```

- [ ] **Step 3: Rewrite `App.tsx`'s shell**

Replace the full contents of `frontend/src/App.tsx` with:

```tsx
import { useState } from "react";
import Sidebar from "./components/Sidebar";
import RegimeHeader from "./components/RegimeHeader";
import LiveSidebar from "./components/LiveSidebar";
import AdvancedSettingsSidebar from "./components/AdvancedSettingsSidebar";
import HistorySidebar from "./components/HistorySidebar";

import BacktestPage from "./pages/BacktestPage";
import WalkForwardPage from "./pages/WalkForwardPage";
import LivePage from "./pages/LivePage";
import SettingsPage from "./pages/SettingsPage";
import AboutPage from "./pages/AboutPage";
import HistoryPage from "./pages/HistoryPage";

import { useStrategyConfig } from "./hooks/useStrategyConfig";
import { useBacktestRun } from "./hooks/useBacktestRun";
import { useWalkForwardRun } from "./hooks/useWalkForwardRun";
import { useLiveTrading } from "./hooks/useLiveTrading";
import { useHistory } from "./hooks/useHistory";
import type { Mode } from "./types/mode";

import "./App.css";

function App() {
  // --- MODE ---
  const [mode, setMode] = useState<Mode>("backtest");

  // --- STATE (one hook per tab's concerns; config is shared) ---
  const config = useStrategyConfig();
  const backtest = useBacktestRun(config, setMode);
  const walkForward = useWalkForwardRun(config, setMode);
  const live = useLiveTrading(mode);
  const history = useHistory({
    loadHistoricalRun: backtest.loadHistoricalRun,
    loadWfHistoricalRun: walkForward.loadWfHistoricalRun,
  });

  const handleModeChange = (nextMode: string) => {
    setMode(nextMode as Mode);
    if (nextMode === "history") {
      history.fetchHistory();
    }
  };

  return (
    <div className="flex min-h-svh w-full bg-background text-foreground">
      <Sidebar mode={mode} onSelect={handleModeChange} />

      {/* Secondary sidebar for tabs that use one (Strategy Explorer and
          Walk-Forward use an in-content top bar instead). Unmigrated —
          keeps the old .sidebar-section-title / dark-theme styling its
          children already rely on. */}
      {mode !== "backtest" && mode !== "walkforward" && (
        <div className="w-[300px] flex-shrink-0 overflow-y-auto border-r-2 border-foreground bg-background p-[18px]">
          {mode === "live" ? (
            <LiveSidebar
              strategy={live.strategy}
              setStrategy={live.setStrategy}
              instrument={live.instrument}
              setInstrument={live.setInstrument}
              account={live.account}
              status={live.status}
              onStatusChange={live.setStatus}
              startPayload={{
                interval_seconds: parseInt(String(live.pollSeconds), 10),
                granularity: live.granularity,
                candle_count: parseInt(String(live.candleCount), 10),
                trade_units: parseInt(String(live.tradeUnits), 10),
                min_account_balance: parseFloat(String(live.minBalance)),
                max_open_positions: parseInt(String(live.maxPositions), 10),
              }}
            />
          ) : mode === "settings" ? (
            <AdvancedSettingsSidebar />
          ) : mode === "about" ? null : (
            <HistorySidebar onRefresh={history.fetchHistory} loading={history.loading} />
          )}
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto px-7 py-6">
        <RegimeHeader />

        {mode === "backtest" ? (
          <BacktestPage config={config} backtest={backtest} />
        ) : mode === "walkforward" ? (
          <WalkForwardPage config={config} walkForward={walkForward} />
        ) : mode === "live" ? (
          <LivePage live={live} />
        ) : mode === "settings" ? (
          <SettingsPage config={config} live={live} />
        ) : mode === "about" ? (
          <AboutPage />
        ) : (
          <HistoryPage history={history} />
        )}
      </div>
    </div>
  );
}

export default App;
```

Note: `WalkForwardPage`, `LivePage`, `HistoryPage`, `SettingsPage`, `AboutPage` and the secondary sidebars still render their own old CSS-classed markup internally (e.g. `<h1>`, `.subtitle`, `.section-block`) — that's unchanged and still correct, since `App.css` keeps those rules (see Step 4). Only the shell wrapping them changed.

- [ ] **Step 4: Delete the now-superseded shell CSS from `App.css`**

In `frontend/src/App.css`, delete the entire contiguous block starting at the `/* =========================================================\n   Shell layout\n   ========================================================= */` comment and ending right before the `.sidebar-section-title` rule — i.e. everything from `.app-shell` through `.nav-rail-item.active.history .dot` (this covers `.app-shell`, `.dashboard-container`, `.topbar` and all `.topbar-*`/`.status-*` rules, `.regime-header` and all `.regime-*` rules, the bare `.sidebar` rule, and all `.nav-rail*` rules). Leave the `/* =========================================================\n   Sidebar\n   ========================================================= */` → `.sidebar-section-title` rule and everything after it (including `.input-group`, `.params-box`, `.backtest-topbar*`, etc.) untouched.

- [ ] **Step 5: Delete the unused shell components**

```bash
rm frontend/src/components/TopBar.tsx frontend/src/components/NavRail.tsx
```

- [ ] **Step 6: Verify**

Run: `cd frontend && npm run typecheck && npm run lint && npm run test && npm run build`
Expected: all succeed (`App.test.tsx` only asserts the app renders without crashing, so it should pass unchanged). Then run `npm run dev`, open the app, and click through all six nav items (Strategy Explorer, Walk Forward Engine, Live Paper Trading, Advanced Settings, History, About) — each must still load its page and (for Live/Settings/History) its secondary sidebar, confirming the Review Focus item about tab switching.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/Sidebar.tsx frontend/src/components/RegimeHeader.tsx frontend/src/App.tsx frontend/src/App.css
git rm frontend/src/components/TopBar.tsx frontend/src/components/NavRail.tsx
git commit -m "Rebuild app shell as a persistent labeled sidebar, drop hover nav-rail and topbar"
```

---

## Task 4: Migrate the Backtest control bar to the new primitives

**Files:**
- Create: `frontend/src/components/BacktestStrategyParamsFields.tsx` (forked from `StrategyParamsFields.tsx`)
- Modify: `frontend/src/components/BacktestTopBar.tsx`
- Test: manual (dev server)

**Interfaces:**
- Consumes: `Input`, `Select`, `Button` (Task 2), `cn` (Task 2).
- Produces: `BacktestStrategyParamsFields` default export, same prop shape as the original — `{ strategy: string; params: StrategyParams; onChange: (params: StrategyParams) => void }` — consumed only by `BacktestTopBar.tsx`.

- [ ] **Step 1: Create the forked, restyled `BacktestStrategyParamsFields.tsx`**

```tsx
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import type { StrategyParams } from "../types/strategy";

interface BacktestStrategyParamsFieldsProps {
  strategy: string;
  params: StrategyParams;
  onChange: (params: StrategyParams) => void;
}

// Backtest-only fork of StrategyParamsFields, restyled with the new UI
// primitives. StrategyParamsFields.tsx itself stays untouched because
// WalkForwardTopBar still depends on it (see the plan's fork decision).
const BacktestStrategyParamsFields = ({ strategy, params, onChange }: BacktestStrategyParamsFieldsProps) => {
  const setParam = (key: string, value: number | string) => onChange({ ...params, [key]: value });

  const field = (label: string, children: ReactNode, hint?: string) => (
    <div className="w-[150px]">
      <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  );

  if (strategy === "BuyHold") {
    return (
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        No parameters — buys on the first bar and holds a long position for the entire window. Useful as a
        baseline to compare the other strategies against.
      </p>
    );
  }

  if (strategy === "SMA") {
    return (
      <>
        {field(
          "Short Window",
          <Input type="number" min="1" value={params.short_window} onChange={(e) => setParam("short_window", e.target.value)} />,
        )}
        {field(
          "Long Window",
          <Input type="number" min="1" value={params.long_window} onChange={(e) => setParam("long_window", e.target.value)} />,
        )}
      </>
    );
  }

  if (strategy === "Bollinger") {
    return (
      <>
        {field("Window", <Input type="number" min="1" value={params.window} onChange={(e) => setParam("window", e.target.value)} />)}
        {field(
          "Std Dev",
          <Input type="number" step="0.1" min="0.1" value={params.num_std} onChange={(e) => setParam("num_std", e.target.value)} />,
        )}
      </>
    );
  }

  if (strategy === "EMA") {
    return (
      <>
        {field(
          "Short EMA",
          <Input type="number" min="1" value={params.ema_short} onChange={(e) => setParam("ema_short", e.target.value)} />,
        )}
        {field(
          "Long EMA",
          <Input type="number" min="1" value={params.ema_long} onChange={(e) => setParam("ema_long", e.target.value)} />,
        )}
      </>
    );
  }

  if (strategy === "MACD") {
    return (
      <>
        {field(
          "Fast Period",
          <Input type="number" min="1" value={params.macd_fast} onChange={(e) => setParam("macd_fast", e.target.value)} />,
        )}
        {field(
          "Slow Period",
          <Input type="number" min="1" value={params.macd_slow} onChange={(e) => setParam("macd_slow", e.target.value)} />,
        )}
        {field(
          "Signal Period",
          <Input
            type="number"
            min="1"
            value={params.macd_signal_period}
            onChange={(e) => setParam("macd_signal_period", e.target.value)}
          />,
        )}
      </>
    );
  }

  if (strategy === "RSI") {
    return (
      <>
        {field(
          "RSI Period",
          <Input type="number" min="2" value={params.rsi_period} onChange={(e) => setParam("rsi_period", e.target.value)} />,
        )}
        {field(
          "Oversold",
          <Input
            type="number"
            min="1"
            max="49"
            value={params.rsi_oversold}
            onChange={(e) => setParam("rsi_oversold", e.target.value)}
          />,
        )}
        {field(
          "Overbought",
          <Input
            type="number"
            min="51"
            max="99"
            value={params.rsi_overbought}
            onChange={(e) => setParam("rsi_overbought", e.target.value)}
          />,
        )}
      </>
    );
  }

  if (strategy === "Contrarian") {
    const contrarianThreshold = Number(params.contrarian_threshold);
    return (
      <>
        {field(
          "Lookback (days)",
          <Input
            type="number"
            min="1"
            value={params.contrarian_lookback}
            onChange={(e) => setParam("contrarian_lookback", e.target.value)}
          />,
        )}
        {field(
          "Threshold (%)",
          <Input
            type="number"
            step="0.5"
            min="0"
            value={(contrarianThreshold * 100).toFixed(1)}
            onChange={(e) => setParam("contrarian_threshold", parseFloat(e.target.value) / 100)}
          />,
        )}
        <p className="w-full basis-full text-[11.5px] leading-relaxed text-muted-foreground">
          Buys when the {params.contrarian_lookback}-day return drops below −{(contrarianThreshold * 100).toFixed(1)}
          %, shorts when it rises above +{(contrarianThreshold * 100).toFixed(1)}%.
        </p>
      </>
    );
  }

  if (strategy === "NDayMom") {
    return field(
      "Lookback (days)",
      <Input type="number" min="1" value={params.nday_lookback} onChange={(e) => setParam("nday_lookback", e.target.value)} />,
      `Long if today's price is above the price ${params.nday_lookback} days ago, Short otherwise.`,
    );
  }

  if (strategy === "ML") {
    const trainSplit = Number(params.train_split);
    return field(
      "Train Split",
      <Input
        type="number"
        step="0.05"
        min="0.1"
        max="0.9"
        value={params.train_split}
        onChange={(e) => setParam("train_split", e.target.value)}
      />,
      `Model trains on the first ${Math.round(trainSplit * 100)}% of the window and only trades the remaining ${Math.round(
        (1 - trainSplit) * 100,
      )}% out-of-sample. For rolling multi-window validation, use the Walk-Forward tab instead.`,
    );
  }

  if (strategy === "StatArb") {
    return (
      <>
        {field(
          "Lookback Window",
          <Input type="number" min="5" value={params.lookback_window} onChange={(e) => setParam("lookback_window", e.target.value)} />,
        )}
        {field(
          "Coint. p-value Max",
          <Input
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={params.coint_pvalue_threshold}
            onChange={(e) => setParam("coint_pvalue_threshold", e.target.value)}
          />,
        )}
        {field(
          "Entry Z-Score",
          <Input type="number" step="0.1" min="0.1" value={params.entry_z} onChange={(e) => setParam("entry_z", e.target.value)} />,
        )}
        {field(
          "Exit Z-Score",
          <Input type="number" step="0.1" min="0" value={params.exit_z} onChange={(e) => setParam("exit_z", e.target.value)} />,
        )}
        <p className="w-full basis-full text-[11.5px] leading-relaxed text-muted-foreground">
          Trades the spread between this ticker and the pair ticker (set above) when cointegrated and the spread's
          z-score crosses the entry threshold; flattens on reversion toward the exit threshold.
        </p>
      </>
    );
  }

  return null;
};

export default BacktestStrategyParamsFields;
```

- [ ] **Step 2: Rewrite `BacktestTopBar.tsx`**

Replace the full contents of `frontend/src/components/BacktestTopBar.tsx` with:

```tsx
import { useState } from "react";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import BacktestStrategyParamsFields from "./BacktestStrategyParamsFields";
import type { useStrategyConfig } from "../hooks/useStrategyConfig";

type BacktestTopBarProps = Pick<
  ReturnType<typeof useStrategyConfig>,
  | "ticker"
  | "setTicker"
  | "startDate"
  | "setStartDate"
  | "endDate"
  | "setEndDate"
  | "strategy"
  | "setStrategy"
  | "capital"
  | "setCapital"
  | "dataInterval"
  | "setDataInterval"
  | "strategyParams"
  | "setStrategyParams"
  | "pairTicker"
  | "setPairTicker"
  | "engine"
  | "setEngine"
> & {
  loading: boolean;
  onRun: () => void;
};

const STRATEGY_PARAMS_LABEL: Record<string, string> = {
  BuyHold: "Buy & Hold Settings",
  SMA: "SMA Crossover Settings",
  Bollinger: "Bollinger Bands Settings",
  ML: "Machine Learning Settings",
};

// Horizontal control bar for the Strategy Explorer tab.
const BacktestTopBar = ({
  ticker,
  setTicker,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  strategy,
  setStrategy,
  capital,
  setCapital,
  dataInterval,
  setDataInterval,
  strategyParams,
  setStrategyParams,
  pairTicker,
  setPairTicker,
  engine,
  setEngine,
  loading,
  onRun,
}: BacktestTopBarProps) => {
  const [paramsOpen, setParamsOpen] = useState(true);
  const field = (label: string, children: ReactNode, width = "w-[130px]") => (
    <div className={width}>
      <label className="mb-1.5 block text-[12px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );

  return (
    <div className="mb-5 flex flex-col gap-4 border-2 border-foreground p-4">
      <div className="flex flex-wrap items-start gap-4">
        {field("Ticker Symbol", <Input value={ticker} onChange={(e) => setTicker(e.target.value)} placeholder="AAPL" />)}
        {field("Start Date", <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />)}
        {field("End Date", <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />)}

        {field(
          "Data Interval",
          <>
            <Select value={dataInterval} onChange={(e) => setDataInterval(e.target.value)}>
              <optgroup label="Daily+">
                <option value="1d">1 Day</option>
                <option value="1wk">1 Week</option>
                <option value="1mo">1 Month</option>
              </optgroup>
              <optgroup label="Intraday (max 60 days history)">
                <option value="5m">5 Minutes</option>
                <option value="15m">15 Minutes</option>
              </optgroup>
            </Select>
            {["5m", "15m"].includes(dataInterval) && (
              <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
                Yahoo Finance only provides ~60 days of intraday history.
              </p>
            )}
          </>,
          "w-[170px]",
        )}

        {field(
          "Model",
          <Select value={strategy} onChange={(e) => setStrategy(e.target.value)}>
            <option value="BuyHold">Buy &amp; Hold</option>
            <option value="SMA">SMA Crossover</option>
            <option value="EMA">EMA Crossover</option>
            <option value="MACD">MACD</option>
            <option value="Bollinger">Bollinger Bands</option>
            <option value="RSI">RSI Mean Reversion</option>
            <option value="Contrarian">Contrarian</option>
            <option value="NDayMom">Momentum (N-Day)</option>
            <option value="ML">Machine Learning (RF)</option>
            <option value="StatArb">Pairs Trading (StatArb)</option>
          </Select>,
          "w-[170px]",
        )}

        {field(
          "Engine",
          <Select value={engine} onChange={(e) => setEngine(e.target.value as "iterative" | "vectorized")}>
            <option value="iterative">Fast Iterative</option>
            <option value="vectorized">Vectorized</option>
          </Select>,
          "w-[170px]",
        )}

        {field("Initial Capital ($)", <Input type="number" value={capital} onChange={(e) => setCapital(e.target.value)} />)}

        <Button className="ml-auto mt-[22px]" onClick={onRun} disabled={loading}>
          {loading ? "Running Test…" : "Run Backtest"}
        </Button>
      </div>

      <div className="border-t-2 border-foreground pt-4">
        <button
          onClick={() => setParamsOpen((o) => !o)}
          className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground"
        >
          <span>{paramsOpen ? "▾" : "▸"}</span>
          {STRATEGY_PARAMS_LABEL[strategy] ?? "Pairs Trading Settings"}
        </button>

        {paramsOpen && (
          <div className="mt-3 flex flex-wrap items-start gap-4">
            {strategy === "StatArb" &&
              field(
                "Pair Ticker",
                <>
                  <Input value={pairTicker} onChange={(e) => setPairTicker(e.target.value)} placeholder="MSFT" />
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-muted-foreground">
                    Second leg of the pair — spread traded against Ticker Symbol.
                  </p>
                </>,
              )}

            <BacktestStrategyParamsFields strategy={strategy} params={strategyParams} onChange={setStrategyParams} />
          </div>
        )}
      </div>
    </div>
  );
};

export default BacktestTopBar;
```

- [ ] **Step 3: Verify**

Run: `cd frontend && npm run typecheck && npm run lint && npm run build`, then `npm run dev`.

Manually check, on the Strategy Explorer tab:
- All six top-row fields render and update state (type a ticker, change dates, switch Data Interval to "5 Minutes" and confirm the intraday hint appears — Review Focus item).
- Switch Model to "Pairs Trading (StatArb)" and confirm the Pair Ticker field appears (Review Focus item); switch to another strategy and confirm it disappears.
- Switch through a few strategies (SMA, Bollinger, RSI, ML, StatArb) and confirm their respective param fields render with correct labels/values.
- Switch to the Walk Forward Engine tab and confirm its top bar still renders in the old dark styling, completely unaffected.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/BacktestStrategyParamsFields.tsx frontend/src/components/BacktestTopBar.tsx
git commit -m "Migrate Backtest control bar to shadcn-style primitives"
```

---

## Task 5: Migrate `MetricsGrid`/`MetricCard` to `Card`/`Badge`

**Files:**
- Modify: `frontend/src/components/MetricCard.tsx`
- Modify: `frontend/src/components/MetricsGrid.tsx`
- Test: manual (dev server, after running a backtest)

**Interfaces:**
- Consumes: `Card`, `CardHeader`, `CardTitle`, `CardContent` (Task 2), `cn` (Task 2).
- Produces: unchanged `MetricCard` props (`title`, `value`, `suffix?`, `isColorCoded?`, `info?`) and unchanged `MetricsGrid` props (`metrics: Metrics`) — no call-site changes needed in `BacktestPage.tsx`.

- [ ] **Step 1: Rewrite `MetricCard.tsx`**

Replace the full contents of `frontend/src/components/MetricCard.tsx` with:

```tsx
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface MetricCardProps {
  title: string;
  value: number | null | undefined;
  suffix?: string;
  isColorCoded?: boolean;
  info?: string;
}

const MetricCard = ({ title, value, suffix = "", isColorCoded = false, info }: MetricCardProps) => {
  const [showInfo, setShowInfo] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const wrapperRef = useRef<HTMLSpanElement | null>(null);

  const hasValue = value !== null && value !== undefined;

  let colorClass = "";
  if (isColorCoded && hasValue) {
    colorClass = value >= 0 ? "text-positive" : "text-negative";
  }

  const openTooltip = () => {
    if (wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      setCoords({ top: rect.top, left: rect.left + rect.width / 2 });
    }
    setShowInfo(true);
  };
  const closeTooltip = () => setShowInfo(false);

  useEffect(() => {
    if (!showInfo) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) closeTooltip();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showInfo]);

  return (
    <Card>
      <CardHeader className="flex items-center gap-1.5 border-b-0 pb-0">
        <CardTitle className="flex items-center gap-1.5">
          {title}
          {info && (
            <span
              className="relative inline-flex"
              ref={wrapperRef}
              onMouseEnter={openTooltip}
              onMouseLeave={closeTooltip}
              onClick={() => (showInfo ? closeTooltip() : openTooltip())}
            >
              <span
                className="flex h-3.5 w-3.5 cursor-help items-center justify-center rounded-full border border-muted-foreground text-[9px] font-bold not-italic text-muted-foreground"
                aria-label={`About ${title}`}
              >
                i
              </span>
              {showInfo &&
                coords &&
                createPortal(
                  <span
                    className="fixed z-[1000] w-[200px] -translate-x-1/2 -translate-y-[calc(100%+8px)] border-2 border-foreground bg-background p-2 text-[11px] font-normal leading-relaxed text-foreground shadow-none"
                    style={{ top: coords.top, left: coords.left }}
                  >
                    {info}
                  </span>,
                  document.body,
                )}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className={cn("text-xl font-bold tabular-nums", colorClass)}>
          {hasValue ? (
            <>
              {value}
              {suffix}
            </>
          ) : (
            "N/A"
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MetricCard;
```

- [ ] **Step 2: Rewrite `MetricsGrid.tsx`**

Replace the full contents of `frontend/src/components/MetricsGrid.tsx` with:

```tsx
import MetricCard from "./MetricCard";
import type { Metrics } from "../types/backtest";

interface MetricsGridProps {
  metrics: Metrics;
}

// The six headline metrics, shared by the Backtest and Walk-Forward
// results panes.
const MetricsGrid = ({ metrics }: MetricsGridProps) => (
  <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-[-2px]">
    <MetricCard
      title="Total Return"
      value={metrics.total_return_pct}
      suffix="%"
      isColorCoded
      info="Overall percentage gain or loss on the starting capital over the full backtest period."
    />
    <MetricCard
      title="CAGR"
      value={metrics.cagr_pct}
      suffix="%"
      isColorCoded
      info="Compound Annual Growth Rate — the constant yearly return that would produce the same overall result, letting periods of different lengths be compared fairly."
    />
    <MetricCard
      title="Max Drawdown"
      value={metrics.max_drawdown_pct}
      suffix="%"
      isColorCoded
      info="The largest drop from a peak to a subsequent trough in the equity curve — a measure of the worst loss an investor would have experienced."
    />
    <MetricCard
      title="Win Rate"
      value={metrics.win_rate_pct}
      suffix="%"
      info="The percentage of closed trades that were profitable. Shows N/A when no trade was closed during the window (e.g. Buy & Hold, or a position still open when the backtest ends)."
    />
    <MetricCard
      title="Sharpe Ratio"
      value={metrics.sharpe_ratio}
      isColorCoded
      info="Annualised risk-adjusted return — average return earned per unit of volatility. Higher is better; above 1 is generally considered good."
    />
    <MetricCard
      title="Total Trades"
      value={metrics.total_trades}
      info="The total number of completed (opened and closed) trades taken during the backtest."
    />
  </div>
);

export default MetricsGrid;
```

Note: `gap-[-2px]` overlaps card borders by 2px so adjacent 2px borders merge into one 2px line instead of doubling up — standard brutalist grid technique. If Tailwind's arbitrary negative gap value doesn't apply as expected during Step 3's visual check, replace it with `gap-0 [&>*+*]:-ml-0.5` instead (adjust until adjacent borders look like a single line, not doubled).

- [ ] **Step 3: Verify**

Run: `cd frontend && npm run typecheck && npm run lint && npm run build`, then `npm run dev`, run a backtest on the Strategy Explorer tab, and confirm all six metric cards render with correct values, color-coding on Total Return/CAGR/Max Drawdown/Sharpe (green for positive, red for negative), and that hovering/clicking the "i" icon shows its tooltip.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/MetricCard.tsx frontend/src/components/MetricsGrid.tsx
git commit -m "Migrate MetricsGrid/MetricCard to Card primitive"
```

---

## Task 6: Migrate `TradeLogTable` to the `Table` primitive

**Files:**
- Modify: `frontend/src/components/TradeLogTable.tsx`
- Test: manual (dev server)

**Interfaces:**
- Consumes: `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` (Task 2), `Badge` (Task 2).
- Produces: unchanged `TradeLogTable` props (`{ tradeLog: Trade[] }`) — no call-site change in `BacktestPage.tsx`.

- [ ] **Step 1: Rewrite `TradeLogTable.tsx`**

```tsx
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Trade } from "../types/backtest";

interface TradeLogTableProps {
  tradeLog: Trade[];
}

const TradeLogTable = ({ tradeLog }: TradeLogTableProps) => (
  <details className="mb-6" open>
    <summary className="mb-3 cursor-pointer text-sm font-bold uppercase tracking-wide">Trade Log</summary>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Entry Date</TableHead>
          <TableHead>Exit Date</TableHead>
          <TableHead>Entry Price</TableHead>
          <TableHead>Exit Price</TableHead>
          <TableHead>P/L ($)</TableHead>
          <TableHead>Return (%)</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tradeLog.map((trade, index) => (
          <TableRow key={index}>
            <TableCell>
              <Badge variant={trade.type === "LONG" ? "positive" : "negative"}>{trade.type}</Badge>
            </TableCell>
            <TableCell>{trade.entry_date}</TableCell>
            <TableCell>{trade.exit_date}</TableCell>
            <TableCell>${trade.entry_price.toFixed(2)}</TableCell>
            <TableCell>${trade.exit_price.toFixed(2)}</TableCell>
            <TableCell className={cn(trade.profit_loss >= 0 ? "text-positive" : "text-negative")}>
              ${trade.profit_loss.toFixed(2)}
            </TableCell>
            <TableCell className={cn(trade.net_return_pct >= 0 ? "text-positive" : "text-negative")}>
              {trade.net_return_pct.toFixed(2)}%
            </TableCell>
          </TableRow>
        ))}
        {tradeLog.length === 0 && (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground">
              No trades executed during this period.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  </details>
);

export default TradeLogTable;
```

- [ ] **Step 2: Verify**

Run: `cd frontend && npm run typecheck && npm run lint && npm run build`, then `npm run dev`. Run a backtest that produces trades (e.g. SMA on AAPL over a multi-year range) and confirm the table renders with LONG/SHORT badges and correctly colored P/L. Then run Buy & Hold (zero closed trades) and confirm the "No trades executed during this period." row renders correctly across all 7 columns (Review Focus item).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/TradeLogTable.tsx
git commit -m "Migrate TradeLogTable to Table primitive"
```

---

## Task 7: Restyle `FeatureImportancePanel` and the `BacktestPage` wrapper

**Files:**
- Modify: `frontend/src/components/FeatureImportancePanel.tsx`
- Modify: `frontend/src/pages/BacktestPage.tsx`
- Test: manual (dev server)

**Interfaces:**
- Consumes: `cn` (Task 2). No new primitives — `FeatureImportancePanel`'s bar chart is custom, not a shadcn primitive type (see spec's scope note); it's restyled with Tailwind utility classes directly.
- Produces: unchanged props for both components.

- [ ] **Step 1: Rewrite `FeatureImportancePanel.tsx`**

```tsx
interface FeatureImportancePanelProps {
  featureImportance: Record<string, number> | null | undefined;
}

const FeatureImportancePanel = ({ featureImportance }: FeatureImportancePanelProps) => {
  if (!featureImportance) return null;

  const entries = Object.entries(featureImportance).sort((a, b) => b[1] - a[1]);
  const maxValue = Math.max(...entries.map(([, value]) => value), 0.0001);

  return (
    <div className="mb-6">
      <h2 className="mb-1 text-sm font-bold uppercase tracking-wide">Feature Importance</h2>
      <p className="mb-3 text-[12px] text-muted-foreground">
        Relative contribution of each input feature to the Random Forest's predictions (averaged across
        walk-forward windows, if used).
      </p>
      <div className="flex flex-col gap-2 border-2 border-foreground p-3.5">
        {entries.map(([name, value]) => (
          <div key={name} className="grid grid-cols-[110px_1fr_48px] items-center gap-2.5">
            <span className="text-[12px] text-muted-foreground">{name}</span>
            <div className="h-2 bg-muted">
              <div className="h-full bg-foreground" style={{ width: `${(value / maxValue) * 100}%` }} />
            </div>
            <span className="text-right text-[12px]">{(value * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeatureImportancePanel;
```

- [ ] **Step 2: Rewrite `BacktestPage.tsx`**

```tsx
import BacktestTopBar from "../components/BacktestTopBar";
import TradingChart from "../components/TradingChart";
import EquityCurveChart from "../components/EquityCurveChart";
import FeatureImportancePanel from "../components/FeatureImportancePanel";
import MetricsGrid from "../components/MetricsGrid";
import TradeLogTable from "../components/TradeLogTable";
import type { useStrategyConfig } from "../hooks/useStrategyConfig";
import type { useBacktestRun } from "../hooks/useBacktestRun";

interface BacktestPageProps {
  config: ReturnType<typeof useStrategyConfig>;
  backtest: ReturnType<typeof useBacktestRun>;
}

const BacktestPage = ({ config, backtest }: BacktestPageProps) => {
  const { loading, error, results, runBacktest } = backtest;

  return (
    <>
      <BacktestTopBar
        ticker={config.ticker}
        setTicker={config.setTicker}
        startDate={config.startDate}
        setStartDate={config.setStartDate}
        endDate={config.endDate}
        setEndDate={config.setEndDate}
        strategy={config.strategy}
        setStrategy={config.setStrategy}
        capital={config.capital}
        setCapital={config.setCapital}
        dataInterval={config.dataInterval}
        setDataInterval={config.setDataInterval}
        strategyParams={config.strategyParams}
        setStrategyParams={config.setStrategyParams}
        pairTicker={config.pairTicker}
        setPairTicker={config.setPairTicker}
        engine={config.engine}
        setEngine={config.setEngine}
        loading={loading}
        onRun={runBacktest}
      />

      <h1 className="mb-1 text-[17px] font-bold">Backtest Results</h1>
      <p className="mb-5 text-[12.5px] text-muted-foreground">Historical simulation over the selected date range.</p>

      {error && (
        <div className="mb-4 border-2 border-negative px-3 py-2.5 text-[13px] text-negative">{error}</div>
      )}

      {loading && (
        <div className="mt-16 flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin border-2 border-foreground border-l-transparent" />
          <p className="text-[12.5px] text-muted-foreground">Running Backtest Engine…</p>
        </div>
      )}

      {results && (
        <>
          <MetricsGrid metrics={results.metrics} />

          {results.price_data && (
            <div className="mb-6">
              <h2 className="mb-1 text-sm font-bold uppercase tracking-wide">Price Chart & Executions</h2>
              <p className="mb-2.5 text-[12px] text-muted-foreground">
                Green arrows = Buy, Red arrows = Sell Short, Orange arrows = Exit Position.
              </p>
              <TradingChart
                priceData={results.price_data}
                tradeLog={results.trade_log}
                indicatorData={results.indicator_data || {}}
              />
            </div>
          )}

          {results.equity_curve && (
            <div className="mb-6">
              <h2 className="mb-1 text-sm font-bold uppercase tracking-wide">Equity Curve</h2>
              <p className="mb-2.5 text-[12px] text-muted-foreground">Portfolio value over the backtest window.</p>
              <EquityCurveChart equityCurve={results.equity_curve} />
            </div>
          )}

          {!results.price_data && (
            <p className="mb-5 text-[11.5px] leading-relaxed text-muted-foreground">
              Loaded from saved history — price and equity charts aren't stored for past runs, only metrics and
              the trade log.
            </p>
          )}

          <FeatureImportancePanel featureImportance={results.feature_importance} />

          <TradeLogTable tradeLog={results.trade_log} />
        </>
      )}

      {!results && !loading && !error && (
        <div className="mt-16 text-center text-[13.5px] text-muted-foreground">
          <div className="mb-2 text-2xl opacity-40">📈</div>
          Configure your parameters above and click "Run Backtest" to begin.
        </div>
      )}
    </>
  );
};

export default BacktestPage;
```

- [ ] **Step 3: Verify**

Run: `cd frontend && npm run typecheck && npm run lint && npm run build`, then `npm run dev`. On the Strategy Explorer tab with no run yet, confirm the empty-state message renders (Review Focus item). Run a backtest with the ML strategy and confirm the Feature Importance bars render. Trigger an error (e.g. an invalid ticker) and confirm the error box renders.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/FeatureImportancePanel.tsx frontend/src/pages/BacktestPage.tsx
git commit -m "Restyle FeatureImportancePanel and BacktestPage wrapper with Tailwind"
```

---

## Task 8: Restyle the chart containers for the light theme

**Files:**
- Modify: `frontend/src/components/TradingChart.tsx`
- Modify: `frontend/src/components/EquityCurveChart.tsx`
- Test: manual (dev server)

**Interfaces:**
- Consumes: nothing new — these edits only change `lightweight-charts` color options and the wrapper `<div>`'s inline styles/className, per the spec's "chart rendering logic stays unchanged" constraint. Series/marker colors (already semantic green/red) are untouched.

- [ ] **Step 1: Update `EquityCurveChart.tsx`'s chart colors and container**

In `frontend/src/components/EquityCurveChart.tsx`, replace the `createChart` call's options and the wrapper `<div>`'s `style` with the light-theme equivalents:

```tsx
    const chart = createChart(container, {
      width: container.clientWidth,
      height: 260,
      layout: {
        background: { color: "transparent" },
        textColor: "#5c574c",
      },
      grid: {
        vertLines: { color: "#e7e3da" },
        horzLines: { color: "#e7e3da" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "#111111",
      },
      rightPriceScale: {
        borderColor: "#111111",
      },
    });
```

and:

```tsx
  return (
    <div
      ref={chartContainerRef}
      style={{
        position: "relative",
        width: "100%",
        border: "2px solid #111111",
      }}
    />
  );
```

(i.e. `textColor` → `#5c574c`, grid line colors → `#e7e3da`, `borderColor`s → `#111111`, and the wrapper's `border` → `2px solid #111111` with `borderRadius` removed. The `lineSeries` color `#34d399` and everything else stays unchanged.)

- [ ] **Step 2: Update `TradingChart.tsx`'s chart colors and container**

In `frontend/src/components/TradingChart.tsx`, apply the same color changes to the `createChart` call (`textColor: "#5c574c"`, `grid` line colors `"#e7e3da"`, `borderColor: "#111111"` for both `timeScale` and `rightPriceScale`), and to the chart container `<div>`'s inline style (`border: "2px solid #111111"`, remove `borderRadius`). Also restyle the controls row above it — replace the inline `style={{ color: "#92a0b8" }}` on the indicator-toggle `<label>` elements with `"#5c574c"`, and the chart-type `<select>`'s inline style:

```tsx
          <select value={chartType} onChange={(e) => setChartType(e.target.value)}
            style={{ background: "#f4f2ee", color: "#111111", border: "2px solid #111111", padding: "2px 6px", fontSize: "12px" }}>
```

Leave the candlestick/bar/line/area series colors (`#4CAF50`, `#f44336`, etc.) and marker colors unchanged — they're already semantic green/red/orange and work fine on a light background.

- [ ] **Step 3: Verify**

Run: `cd frontend && npm run typecheck && npm run lint && npm run build`, then `npm run dev`, run a backtest, and visually confirm both charts are readable against the off-white page background (grid lines and axis text visible but subtle, candlesticks/markers clearly visible).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/TradingChart.tsx frontend/src/components/EquityCurveChart.tsx
git commit -m "Restyle chart containers and grid colors for the light theme"
```

---

## Task 9: Full verification pass

**Files:** none (verification only)

**Interfaces:** none.

- [ ] **Step 1: Run the full check suite**

Run: `cd frontend && npm run typecheck && npm run lint && npm run test && npm run build`
Expected: all four succeed.

- [ ] **Step 2: Manual golden-path + regression pass**

Run: `cd frontend && npm run dev`. With the backend also running (`cd backend && uvicorn app.main:app --reload`):
- On Strategy Explorer: confirm the empty state, then run a backtest (e.g. SMA on AAPL, 2022-01-01 to 2024-01-01) and confirm metrics, price chart, equity chart, and trade log all render correctly in the new theme.
- Switch to Walk Forward Engine, Live Paper Trading, Advanced Settings, History, and About — confirm each still renders in its old styling with no console errors and no broken layout from the shell change.
- Confirm the sidebar's active-tab highlighting updates correctly as you switch tabs, and the market-status/backend-connected indicators in the sidebar footer still update.

- [ ] **Step 3: Final commit (if any uncommitted cleanup remains)**

```bash
git status
```

If clean, no commit needed — Tasks 1–8 already committed everything. If anything is outstanding, stage and commit it with a message describing what it is.
