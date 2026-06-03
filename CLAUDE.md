# FamilyMealCalender — CLAUDE.md

> **Living document.** Update this file whenever architecture, design tokens, conventions, or gotchas meaningfully change.

---

## Claude Workflow Protocol

> These rules override default behavior. Follow on every task.

1. **Plan first.** >2 files or any new feature/refactor → `EnterPlanMode`, state the approach, get alignment before touching code. Single-file bug fixes may proceed directly.
2. **Protect main thread.** Broad searches → spawn `Explore` subagent. Architecture decisions → spawn `Plan` subagent. Independent reads → parallel tool calls. Never run 5+ Grep/Glob loops in the main thread.
3. **Verify before done.** After every change: `npx tsc --noEmit` → `npm run build` → for UI: `npm run dev` + `preview_*` tools (not Chrome MCP). Never report done until all pass.
4. **Learn live.** New gotcha found → add to **Key Constraints** immediately. Session complete → add row to **Update Log**. User preference → save memory file.

---

## NEVER

- Add `'use client'` to `page.tsx` — it is a Server Component
- Freehand spacing / radius / shadow values — use design tokens only
- Skip `await auth()` in API routes before any DB access
- Add side effects to `buildShoppingList` in `helpers.ts` — it must stay pure
- Use a 7-column horizontal grid for WeekView — causes cell overflow (was removed)
- Use `any` in TypeScript except at Prisma adapter boundaries
- Assume Next.js 16 behavior from training data — read `node_modules/next/dist/docs/` first
- Report "done" before `npx tsc --noEmit` and `npm run build` pass

---

## When Stuck

| Problem | Where to look |
|---|---|
| Next.js APIs / routing | `node_modules/next/dist/docs/` |
| Prisma queries / relations | `prisma/schema.prisma` + `node_modules/@prisma/client/` |
| Clerk auth patterns | `node_modules/@clerk/nextjs/` |
| Zustand state shape | `src/store/useMealStore.ts` |
| Design token values | `src/app/globals.css :root` |

---

## Key Constraints & Gotchas

> New gotcha discovered mid-session → add here immediately, don't wait.

- **Next.js 16 is NOT the version you know from training.** Read `node_modules/next/dist/docs/` before writing any Next.js-specific code.
- **WeekView is a vertical list of full-width day cards.** A compact 7-dot overview strip sits above. The old 7-column horizontal grid was removed — it caused cells to overflow.
- **WeekView shows shimmer skeleton rows** while `store.weekLoading` is true (set during `fetchWeek`).
- **`buildShoppingList` in `helpers.ts` is pure.** It derives the shopping list from `weekEntries + recurring` every render. No side effects.
- **Prices keyed by lowercase ingredient name.**
- **`weekOffset`**: 0 = this week, -1 = last, +1 = next. Navigation re-fetches from API.
- **Recurring meal slots are user-defined.** The old hardcoded brunch/lunch seed is removed; existing DB rows still work.
- **Schema changes: use `npx prisma db push`, NOT `prisma migrate dev`.** The DB was set up without migration history — `migrate dev` will detect drift and refuse. After `db push`, always run `npx prisma generate` explicitly (push does not always regenerate the client).

---

## Project Vision

**Family meal planning PWA** that feels like a premium $1M product — the most beautiful, user-friendly food planning experience on mobile and desktop.

- **Primary**: Mom/Dad on their phone in the grocery store
- **Secondary**: Planner mode on iPad/desktop during Sunday meal prep

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
| AI | Anthropic SDK (`@anthropic-ai/sdk`) — URL/text → Haiku (`claude-haiku-4-5`); photo → Sonnet vision. All use structured outputs (`output_config.format` json_schema) |
| Styling | **CSS Modules** + global design tokens in `globals.css` |
| Icons | **lucide-react** — all UI chrome. Food/recipe emoji kept as user content (in tinted containers) |
| Fonts | Playfair Display (headings) · DM Sans (body) — Google Fonts |
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
│       ├── recurring/      — GET/POST/PATCH/DELETE recurring meal slots
│       ├── stores/         — GET/POST/DELETE user-configurable stores
│       ├── prices/         — PUT ingredient price
│       ├── checked/        — GET/PUT/DELETE shopping check state
│       ├── hidden-items/   — GET/PUT/DELETE hidden shopping items
│       ├── import-url/     — POST: JSON-LD parse + Haiku structured output
│       ├── import-photo/   — POST: Sonnet vision structured output
│       └── import-text/    — POST: Haiku structured output from pasted text
├── components/
│   ├── MealPlannerApp.tsx  — Root client component; owns all modal state, toast, tab routing
│   ├── Header/             — App title + estimated weekly cost + Clerk auth button
│   ├── TabBar/             — Top tab pills: Week · Recipes · Shopping
│   ├── BottomNav/          — Mobile bottom navigation (mirrors TabBar)
│   ├── WeekView/           — Vertical day cards + 7-dot overview + recurring meals
│   ├── RecipesView/        — Searchable recipe card list + Add Recipe
│   ├── ShopView/           — Auto-generated shopping list, store filter, price tracking
│   ├── DayModal/           — Edit a single day (assign meal, set guests, add note)
│   ├── RecipePickerModal/  — Browse & pick a recipe; tap-to-expand serving stepper
│   ├── RecipeEditorModal/  — Full recipe create/edit + AI import
│   ├── PriceModal/         — Set/update price for a single ingredient
│   ├── Modal/              — Base modal shell (backdrop, sheet)
│   └── Toast/              — Ephemeral success/error notifications
├── store/
│   └── useMealStore.ts     — Zustand store: all app state + optimistic API actions
├── lib/
│   ├── helpers.ts          — DAY_KEYS, colors, buildShoppingList, calcTotal, getISOWeek, getWeekDates
│   ├── defaultData.ts      — Seed/default recipes (dev/demo)
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
Recipe          { id, userId, emoji, name, sub, tags: string[], color, instructions?, ingredients: Ingredient[] }
Ingredient      { id, recipeId, name, qty, unit, cat: IngredientCat, store: Store, noScale: boolean }
WeekEntry       { id, dayKey, weekYear, weekNum, type: 'empty'|'meal'|'note', recipeId?, guests?, note? }
RecurringMeal   { id, key (user slug), label, recipeId? }
IngredientPrice { name (lowercase key), price }
ShoppingCheck   { itemKey, checked, weekYear, weekNum }
ShoppingHiddenItem { itemKey, weekYear, weekNum }
UserStore       { id, userId, name }
```

- Ingredient categories: `proteins | produce | dairy | pantry`
- Stores: user-defined strings; seeded as `Sprouts`, `Costco` on first use
- Day keys: `Mon | Tue | Wed | Thu | Fri | Sat | Sun`

---

## Design System

### Philosophy
**Premium · Warm · Calm.** Warm editorial — high-end food magazine meets productivity app. Never clinical or "app-like". White space is intentional. Every pixel should feel considered.

### Design Tokens (`globals.css :root`)
```css
/* Color */
--bg:   #FDF8F0   /* warm off-white page background */
--sur:  #fff      /* card/surface white */
--br:   #2C1810   /* rich dark brown — primary text */
--terra:#B5522A   /* terracotta — today highlight, primary CTA */
--sage: #4A7A52   /* sage green — success, keto tag, secondary CTA */
--gold: #C4956A   /* warm gold — accent */
--mu:   #9B8B7B   /* muted warm grey — secondary text */
--bdr:  #EFE6DC   /* warm beige border */

/* Spacing  */ --sp-1..8    /* 4 / 8 / 12 / 16 / 24 / 32 */
/* Radius   */ --r-sm/md/lg /* 10 / 14 / 18 */ · --r-pill /* 100 */
/* Elevation*/ --shadow-sm/md/lg
/* Motion   */ --ease (cubic-bezier) · --dur (180ms)
```

### Typography
- **Headings / accents**: `Playfair Display` (serif, italic for elegance)
- **Body / UI**: `DM Sans` (clean, rounded, modern sans)

### Day Colors
```
Mon #4A6FA5  Tue #4A7A52  Wed #A0652A  Thu #B54A2A  Fri #8B3A2A  Sat #C47A4A  Sun #6A4A8A
```

### Tag Colors — 3-color semantic palette
```
diet (keto)                               → sage  #3A6B42
time (meal-prep · 30 min)                 → gold  #A0652A
occasion (crowd-pleaser · fun · date)     → terra #B5522A
```
Render as **soft tinted pills** — colored text on 10%-alpha tint. Never solid-fill white-text pills.

### Design Rules
- **Mobile-first.** Perfect at 375px AND 1440px. Touch targets ≥ 44px.
- **Motion**: scale on press (0.97), transitions 150–250ms ease.
- **No layout jank.** Fixed shell (`100dvh`), scrollable content area only.
- **Safe areas.** Always `env(safe-area-inset-*)` for iOS notch/home bar.
- **Every async action** shows feedback — skeleton, spinner, or optimistic update.
- **Every empty state** has an illustration-style icon + copy.
- **Modals**: slide up from bottom on mobile, centered dialog on desktop.
- **Radii**: cards 16–20px, pills 100px, inputs 12px.
- **Shadows sparingly.** Prefer borders + background shifts.

### Responsive Breakpoints
```
Mobile:  < 768px   (primary)
Tablet:  768–1024px
Desktop: > 1024px
```

---

## Code Conventions

- No comments unless the WHY is non-obvious. No docstrings.
- CSS Modules for all component styles. Global tokens via `:root` vars only.
- No inline styles except dynamic values (color from data, etc.).
- TypeScript strict — no `any` except at Prisma boundaries.
- Zustand actions: optimistic update first, then `await fetch(...)`.
- API routes: always `await auth()` from Clerk before touching DB.
- `page.tsx` is always a Server Component — no `'use client'`.
- Components in `components/` are Client Components (`'use client'`) unless they have zero interactivity.

---

## Update Log

| Date | Change |
|---|---|
| 2026-05-24 | Initial CLAUDE.md created — baseline audit of existing codebase |
| 2026-05-30 | Design refresh Ph1+2: WeekView → vertical day cards + overview dots; lucide-react icons replace emoji chrome; compact header; spacing/radius/elevation/motion tokens; 3-color semantic tags (soft tints); week skeleton loaders; polished empty states |
| 2026-05-30 | Recipe instructions added end-to-end. AI import overhaul: URL → JSON-LD + Haiku structured output; photo → Sonnet vision structured output + instructions; new paste-text import (`/api/import-text`, Haiku) |
| 2026-05-30 | Design refresh Ph3 (modals): token-based Modal, desktop pop-in/mobile sheet; DayModal Lucide icons + press states; RecipePicker search + empty state; PriceModal; Toast → floating pill |
| 2026-06-01 | Security audit: all routes scoped by userId. Fixed IDOR in POST /api/meals/[id]/recipes. Removed dead code in GET /api/recipes/[id]. |
| 2026-06-01 | Recurring meals: user can add/rename/delete slots. POST/DELETE/PATCH on `/api/recurring`; store actions; WeekView inline UI; `recColor()` helper. |
| 2026-06-01 | User-configurable stores: `Store = string`. New `UserStore` model + `/api/stores`. Dynamic store pills in RecipeEditorModal + ShopView manage panel. |
| 2026-06-01 | Hidden grocery items: X button hides items for the week. `ShoppingHiddenItem` model + `/api/hidden-items`. `hideItem`/`restoreHiddenItems` in Zustand. "N hidden · Restore" bar in ShopView. |
| 2026-06-02 | Serving size in recipe book + scale on pick. RecipesView shows "Serves X". RecipePickerModal tap-to-expand inline panel with serving stepper. `onSelect(id, servings)` → sets `meal.guests` on add. |
| 2026-06-02 | CLAUDE.md restructured for AI consumption: Workflow Protocol, NEVER block, When Stuck table, Key Constraints moved to top, prose tightened. |
| 2026-06-02 | Pantry feature: `PantryItem` model + `cookedAt` on `DayMeal`. `/api/pantry` (GET/POST/DELETE) + `/api/pantry/deduct` (POST). `buildShoppingList` accepts optional `pantryItems` param — skips/reduces stocked items (pure, backward-compat). `toggleCheck` auto-stocks pantry on checkoff. `markMealCooked` deducts recipe ingredients (unit-match only). New `PantryView` tab with import-from-recipes, quick add with autocomplete, inline qty editing, low-stock warnings. Cooked checkmark button on WeekView meal slots. |
| 2026-06-03 | Self-explanatory UX pass: (1) Empty day + has recipes → skip DayModal, open RecipePicker directly (`pickerIsQuickAdd` state in MealPlannerApp). (2) Empty day + no recipes → navigate to Recipes tab + toast. (3) WeekView inline guidance strip when `recipes.length === 0`. (4) Copy/Template icon-only buttons replaced with labeled `utilBtn` (text + icon). (5) Recurring section subtitle added. (6) DayModal empty state replaced with primary "Pick a Recipe" CTA + secondary text link. (7) DayModal add-meal form gains suggestion chips (Breakfast/Lunch/Dinner/Snack) for one-tap slot creation. (8) Shopping cart toggle on recipe pills replaced with labeled pill ("In list" / "Add to list"). (9) RecipesView empty state gains inline CTA button. |
