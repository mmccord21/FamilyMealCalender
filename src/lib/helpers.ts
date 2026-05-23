import type { DayKey, IngredientCat, Recipe, ShoppingItem } from '@/types';

export const EMOJIS = ['🍳','🥗','🐟','🍗','🍔','🥩','🦐','🥘','🫕','🍝','🌮','🥙','🥑','🍣','🥚','🫔','🧆','🍲','🥣','🥦','🦀','🐙','🫶','🍱','🥞','🧇','🫙','🥘','🫚','🍵'];

export const DAY_KEYS: DayKey[] = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
export const DAY_FULL = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
export const DAY_COLORS = ['#4A6FA5','#4A7A52','#A0652A','#B54A2A','#8B3A2A','#C47A4A','#6A4A8A'];
export const REC_COLORS: Record<string, string> = { brunch: '#C47A4A', lunch: '#4A7A52' };

export const TAG_COLORS: Record<string, string> = {
  keto: '#4A7A52',
  'meal-prep': '#A0652A',
  '30 min': '#4A6FA5',
  'crowd-pleaser': '#8A4A7A',
  'fun night': '#C47A4A',
  'date night': '#8B3A2A',
};

export const CATS: Record<string, { l: string; i: string; c: string }> = {
  proteins: { l: 'Proteins', i: '🥩', c: '#8B3A2A' },
  produce:  { l: 'Produce',  i: '🥬', c: '#3A6B42' },
  dairy:    { l: 'Dairy & Eggs', i: '🥚', c: '#8B6914' },
  pantry:   { l: 'Pantry',   i: '🫙', c: '#4A5A6A' },
};
export const CAT_KEYS = Object.keys(CATS) as IngredientCat[];

export const QUICK_NOTES = [
  'Eating out 🍽️','Leftovers 🥡','Mitch traveling ✈️','Date night 💕',
  'Too tired 😴','Meal prepping 🫙','Happy hour 🥂','Family visiting 👨‍👩‍👧',
];

export const BASE_GUESTS = 3;

// ── Helpers ────────────────────────────────────────────

export function catIcon(cat: string): string {
  return CATS[cat]?.i ?? '🛒';
}
export function catColor(cat: string): string {
  return CATS[cat]?.c ?? '#888';
}
export function dayColor(key: string): string {
  const i = DAY_KEYS.indexOf(key as DayKey);
  return i >= 0 ? DAY_COLORS[i] : (REC_COLORS[key] ?? '#888');
}

export function fmtQ(n: number): string {
  if (!n) return '0';
  if (n === Math.floor(n)) return `${n}`;
  const f = n % 1;
  if (Math.abs(f - 0.25) < 0.01) return `${Math.floor(n)}¼`;
  if (Math.abs(f - 0.5)  < 0.01) return `${Math.floor(n)}½`;
  if (Math.abs(f - 0.75) < 0.01) return `${Math.floor(n)}¾`;
  return n.toFixed(1);
}

export function fmtShopAmt(item: ShoppingItem): string {
  if (!item.totalQty) return item.unit || '';
  let q = item.totalQty;
  if (item.unit === 'lbs' || item.unit === 'lb') q = Math.round(q * 4) / 4;
  else q = Math.ceil(q);
  return fmtQ(q) + (item.unit ? ` ${item.unit}` : '');
}

export function buildShoppingList(
  recipes: Recipe[],
  weekEntries: { dayKey: string; recipeId?: string | null; guests?: number | null; type: string }[],
  recurring: { key: string; recipeId?: string | null }[],
): ShoppingItem[] {
  const merged: Record<string, ShoppingItem> = {};
  let counter = 0;

  function addIngs(
    ingredients: Recipe['ingredients'],
    dayKey: string,
    scale: number,
  ) {
    ingredients.forEach((ing) => {
      const mk = ing.name.toLowerCase().trim();
      if (!merged[mk]) {
        merged[mk] = {
          mid: `si${counter++}`,
          name: ing.name,
          totalQty: 0,
          unit: ing.unit,
          cat: ing.cat,
          store: ing.store,
          noScale: ing.noScale,
          days: [],
        };
      }
      merged[mk].totalQty += ing.noScale ? ing.qty : ing.qty * scale;
      if (!merged[mk].days.find((d) => d.key === dayKey)) {
        merged[mk].days.push({ key: dayKey, color: dayColor(dayKey) });
      }
    });
  }

  // Week days
  weekEntries.forEach((e) => {
    if (e.type !== 'meal' || !e.recipeId) return;
    const recipe = recipes.find((r) => r.id === e.recipeId);
    if (!recipe) return;
    addIngs(recipe.ingredients, e.dayKey, (e.guests ?? BASE_GUESTS) / BASE_GUESTS);
  });

  // Recurring
  recurring.forEach((r) => {
    if (!r.recipeId) return;
    const recipe = recipes.find((rec) => rec.id === r.recipeId);
    if (!recipe) return;
    addIngs(recipe.ingredients, r.key, 1);
  });

  return Object.values(merged);
}

export function calcTotal(
  items: ShoppingItem[],
  prices: Record<string, number>,
): number {
  return items.reduce((s, item) => s + (prices[item.name.toLowerCase().trim()] ?? 0), 0);
}

/** ISO week number for a given date */
export function getISOWeek(date: Date): { weekYear: number; weekNum: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { weekYear: d.getUTCFullYear(), weekNum };
}

/** Get the Monday of the week that is `offset` weeks from today */
export function getWeekDates(offset = 0): Date[] {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const dow = t.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(t);
  mon.setDate(t.getDate() + diff + offset * 7);
  return DAY_KEYS.map((_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
}

export function isToday(d: Date): boolean {
  const t = new Date();
  return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear();
}
