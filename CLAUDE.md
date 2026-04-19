# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # start dev server at localhost:3000
npm run build    # production build (also type-checks via Next.js)
npm run lint     # ESLint via next lint
npx tsc --noEmit # type-check without building
```

There is no test suite configured.

## Architecture

**SpendWise** is a fully client-side Next.js 14 (App Router) expense tracker. There is no backend, no API routes, and no database — all data lives in `localStorage`.

### Data flow

```
localStorage  ←→  lib/storage.ts  ←→  hooks/useExpenses.ts  ←→  pages & components
```

- **`lib/storage.ts`** is the only file that reads/writes `localStorage`. It exports `loadExpenses`, `addExpense`, `updateExpense`, `deleteExpense`, and seeds demo data on first load via `getDefaultExpenses()`.
- **`hooks/useExpenses.ts`** wraps storage in React state. Every page that needs expense data calls `useExpenses()` and gets `{ expenses, isLoaded, add, update, remove }`. The `isLoaded` flag guards against SSR hydration mismatches.
- Pages never call storage functions directly — they always go through the hook.

### Type system

`types/expense.ts` is the single source of truth for domain types:
- `Expense` — `{ id, amount, category, description, date (YYYY-MM-DD), createdAt (ISO) }`
- `Category` — discriminated union: `'Food' | 'Transportation' | 'Entertainment' | 'Shopping' | 'Bills' | 'Other'`
- `CATEGORIES`, `CATEGORY_COLORS`, `CATEGORY_BG`, `CATEGORY_ICONS` — constant arrays/maps keyed by `Category`, used throughout components for consistent rendering

### Pages

| Route | File | Purpose |
|-------|------|---------|
| `/` | `app/page.tsx` | Dashboard: summary cards, charts, recent expenses |
| `/expenses` | `app/expenses/page.tsx` | Full list with search/filter/sort via `ExpenseList` |
| `/expenses/new` | `app/expenses/new/page.tsx` | Add form |
| `/expenses/[id]/edit` | `app/expenses/[id]/edit/page.tsx` | Edit form — reads expense by ID from `useExpenses` |
| `/analytics` | `app/analytics/page.tsx` | Recharts visualizations: line chart (trend), bar chart (by category), stats grid |

All pages and components that use hooks or browser APIs are marked `'use client'`.

### Key libraries

- **Recharts** — used only in `SpendingChart` and `app/analytics/page.tsx` for charts
- **lucide-react** — icons throughout; import individual icons by name
- **Tailwind CSS** — all styling; no CSS modules or styled-components
- **`date-fns`** — listed as a dependency but not yet imported in any source file

### Layout and responsive behaviour

`app/layout.tsx` renders `<Navbar />` and a `<main>` wrapper with hard-coded Tailwind offsets:
- **Desktop** (`lg:`): fixed left sidebar `w-64`, main has `lg:ml-64`
- **Mobile**: fixed top header (`pt-14`) + fixed bottom nav (`pb-24`)

`Navbar` renders two independent nav trees inside a fragment: a desktop `<aside>` and a mobile `<nav>` + `<header>`.

### Utilities (`lib/utils.ts`)

Pure computation functions — no side effects except `exportToCSV`:
- `computeSummary(expenses)` — returns `SpendingSummary` (totals, by-category breakdown, averages)
- `filterExpenses(expenses, filters)` — applies `ExpenseFilters` (search, category, date range, sort)
- `getMonthlyTrend(expenses, months)` — aggregates monthly totals for the last N months
- `exportToCSV(expenses)` — side-effectful: triggers a browser file download

### Path alias

`@/` maps to the project root (configured in `tsconfig.json`). Use `@/lib/...`, `@/components/...`, `@/types/...`, `@/hooks/...` for all imports.
