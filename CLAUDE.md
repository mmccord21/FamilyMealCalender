# FamilyMealCalender — CLAUDE.md

> **Living document.** Update this file whenever architecture, design tokens, conventions, or goals meaningfully change.

---

## Project Vision

A **family meal planning PWA** that feels like a premium, $1M product. The goal is the most beautiful, user-friendly food planning experience on mobile *and* desktop — think Notion-meets-a-Michelin-star-restaurant. Every pixel, interaction, and micro-animation should feel intentional and delightful.

**Core audiences:**
- Primary: Mom/Dad on their phone in the grocery store
- Secondary: Planner mode on iPad or desktop during Sunday meal prep

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | **Next.js 16.2.6** (App Router, React 19) — READ `node_modules/next/dist/docs/` before writing Next.js code |
| Language | TypeScript (strict mode) |
| State | Zustand 5 (`src/store/useMealStore.ts`) |
| Database | PostgreSQL via **Neon serverless** |
| ORM | **Prisma 7** with `@prisma/adapter-neon` |
| Auth | **Clerk** (`@clerk/nextjs` v7) |
| AI | Anthropic SDK (`@anthropic-ai/sdk`) — used for URL & photo recipe import |
| Styling | **CSS Modules** + global design tokens in `globals.css` |
| Fonts | Playfair Display (headings/serif accent) · DM Sans (body) — loaded via Google Fonts |
| PWA | Inline manifest in `layout.tsx`, apple-web-app-capable, standalone display |

---

## Architecture

```
src/
├── app/
│   ├── layout.tsx          — Root layout: ClerkProvider, fonts, PWA manifest, viewport
│   ├── page.tsx            — SSR: fetches all initial data via Prisma, passes to MealPlannerApp
│   ├── globals.css         — Design tokens (:root vars) + app shell layout
│   └── api/
│       ├── recipes/        — GET all, POST create; [id]/ PUT update, DELETE
│       ├── week/           — GET week entries by offset; [key]/ PUT single day
│       ├── recurring/      — PUT recurring meal assignment
│       ├── prices/         — PUT ingredient price
│       ├── checked/        — GET/PUT/DELETE shopping check state
│       ├── import-url/     — POST: AI extracts recipe from a URL
│       └── import-photo/   — POST: AI extracts recipe from a photo (base64)
├── components/
│   ├── MealPlannerApp.tsx  — Root client component; owns all modal state, toast, tab routing
│   ├── Header/             — App title + estimated weekly cost + Clerk auth button
│   ├── TabBar/             — Top tab pills: Week · Recipes · Shopping
│   ├── BottomNav/          — Mobile bottom navigation (mirrors TabBar)
│   ├── WeekView/           — 7-day column grid + recurring meals section
│   ├── RecipesView/        — Searchable recipe card list + Add Recipe
│   ├── ShopView/           — Auto-generated shopping list, store filter, price tracking
│   ├── DayModal/           — Edit a single day (assign meal, set guests, add note)
│   ├── RecipePickerModal/  — Browse & pick a recipe for a day or recurring slot
│   ├── RecipeEditorModal/  — Full recipe create/edit with ingredient management + AI import
│   ├── PriceModal/         — Set/update price for a single ingredient
│   ├── Modal/              — Base modal shell (backdrop, sheet)
│   └── Toast/              — Ephemeral success/error notifications
├── store/
│   └── useMealStore.ts     — Zustand store: all app state + optimistic API actions
├── lib/
│   ├── helpers.ts          — DAY_KEYS, colors, buildShoppingList, calcTotal, getISOWeek, getWeekDates
│   ├── defaultData.ts      — Seed/default recipes (for dev/demo)
│   └── prisma.ts           — Prisma singleton (Neon adapter)
└── types/
    └── index.ts            — Shared TS types: Recipe, Ingredient, WeekEntry, RecurringMeal, ShoppingItem
```

### Data flow

1. `page.tsx` (Server Component) fetches all data for the current week via Prisma → passes as props to `MealPlannerApp`.
2. `MealPlannerApp` calls `useMealStore.getState().setInitialData()` on mount to hydrate Zustand.
3. User actions → Zustand action → optimistic UI update → `fetch()` to API route → Prisma → Neon DB.
4. Week navigation calls `fetchWeek()` which re-fetches from API.

---

## Data Models

```ts
Recipe       { id, userId, emoji, name, sub, tags: string[], color, ingredients: Ingredient[] }
Ingredient   { id, recipeId, name, qty, unit, cat: IngredientCat, store: Store, noScale: boolean }
WeekEntry    { id, dayKey, weekYear, weekNum, type: 'empty'|'meal'|'note', recipeId?, guests?, note? }
RecurringMeal{ id, key: 'brunch'|'lunch', label, recipeId? }
IngredientPrice { name (lowercase key), price }
ShoppingCheck{ itemKey, checked, weekYear, weekNum }
```

Ingredient categories: `proteins | produce | dairy | pantry`
Stores: `sprouts | costco`
Day keys: `Mon | Tue | Wed | Thu | Fri | Sat | Sun`

---

## Design System

### Philosophy
**Premium · Warm · Calm.** The visual language is a warm editorial style — like a high-end food magazine meets a productivity app. Nothing should look "app-like" or clinical. Use white space aggressively. Let content breathe.

### Design Tokens (`globals.css :root`)
```css
--bg:   #FDF8F0   /* warm off-white page background */
--sur:  #fff      /* card/surface white */
--br:   #2C1810   /* rich dark brown — primary text */
--terra:#B5522A   /* terracotta — today highlight, primary CTA */
--sage: #4A7A52   /* sage green — success, keto tag, secondary CTA */
--gold: #C4956A   /* warm gold — accent */
--mu:   #9B8B7B   /* muted warm grey — secondary text */
--bdr:  #EFE6DC   /* warm beige border */
```

### Typography
- **Headings / accents**: `Playfair Display` (serif, italic for elegance)
- **Body / UI**: `DM Sans` (clean, rounded, modern sans)
- The combination creates a "food editorial" feel — newspaper meets app

### Day Colors (week grid)
```
Mon #4A6FA5  Tue #4A7A52  Wed #A0652A  Thu #B54A2A  Fri #8B3A2A  Sat #C47A4A  Sun #6A4A8A
```

### Tag Colors
```
keto #4A7A52 · meal-prep #A0652A · 30 min #4A6FA5 · crowd-pleaser #8A4A7A · fun night #C47A4A · date night #8B3A2A
```

### Design Goals (the "million dollar" standard)
- **Mobile-first, desktop-great.** Every component must look perfect at 375px AND 1440px.
- **Touch targets ≥ 44px** on all interactive elements.
- **Micro-animations**: subtle scale on press (0.97), smooth transitions (150–250ms ease).
- **No layout jank.** Fixed shell (`100dvh`), scrollable content area only.
- **Safe areas.** Always use `env(safe-area-inset-*)` for iOS notch/home bar.
- **Loading states.** Every async action shows feedback — skeleton, spinner, or optimistic update.
- **Empty states.** Every empty list/state has a beautiful illustration-style icon + copy.
- **Modals as sheets.** On mobile, modals slide up from bottom; on desktop, centered dialog.
- **Consistent radii.** Cards: 16–20px. Pills/tags: 100px. Inputs: 12px.
- **Shadows sparingly.** Use borders + background color shifts instead of heavy drop shadows.

### Responsive Breakpoints
```
Mobile:  < 768px   (primary design target)
Tablet:  768–1024px
Desktop: > 1024px  (sidebar layout or wider content columns)
```

---

## Code Conventions

- **No comments** unless the WHY is non-obvious. No docstrings.
- **CSS Modules** for all component styles. Global tokens via `:root` vars only.
- **No inline styles** except for dynamic values (color from data, etc.).
- TypeScript strict — no `any` except at Prisma boundaries.
- Zustand actions do optimistic updates first, then `await fetch(...)`.
- API routes always call `await auth()` from Clerk before touching the DB.
- `page.tsx` is always a Server Component — no `'use client'` there.
- Components under `components/` are always Client Components (`'use client'`) unless they have no interactivity.

---

## Key Constraints & Gotchas

- **Next.js 16 breaking changes** — this is NOT the Next.js you know from training. Read `node_modules/next/dist/docs/` before any Next.js-specific code. (See `AGENTS.md`.)
- The week grid is a **7-column CSS grid** — very tight on mobile (each column ~48px). Text must be tiny and truncated.
- `buildShoppingList` in `helpers.ts` is pure — it derives the shopping list from `weekEntries + recurring` every render. Do not add side effects there.
- Prices are stored by **lowercase ingredient name** as the key.
- `weekOffset` 0 = this week, -1 = last week, +1 = next week. Week navigation re-fetches from API.
- Clerk auth wraps the entire app but the `page.tsx` SSR currently fetches **all recipes** without userId filtering (the API routes do filter). This is a known gap.
- Recurring meals are currently hardcoded to `brunch` and `lunch` slots.

---

## Update Log

| Date | Change |
|---|---|
| 2026-05-24 | Initial CLAUDE.md created — baseline audit of existing codebase |
