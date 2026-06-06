import type { DayKey, DayMeal, Ingredient, IngredientCat, PantryItem, Recipe, ShoppingItem } from '@/types';

export const EMOJIS = ['🍳','🥗','🐟','🍗','🍔','🥩','🦐','🥘','🫕','🍝','🌮','🥙','🥑','🍣','🥚','🫔','🧆','🍲','🥣','🥦','🦀','🐙','🫶','🍱','🥞','🧇','🫙','🍜','🫚','🍵'];

export const DAY_KEYS: DayKey[] = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
export const DAY_FULL = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
export const DAY_COLORS = ['#4A6FA5','#4A7A52','#A0652A','#B54A2A','#8B3A2A','#C47A4A','#6A4A8A'];
export const REC_COLORS: Record<string, string> = { brunch: '#C47A4A', lunch: '#4A7A52' };

const REC_PALETTE = ['#C47A4A', '#4A7A52', '#4A6FA5', '#B54A2A', '#6A4A8A', '#A0652A'];

export function recColor(key: string): string {
  if (REC_COLORS[key]) return REC_COLORS[key];
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) & 0xffff;
  return REC_PALETTE[hash % REC_PALETTE.length];
}

// Restrained 3-color semantic palette: diet (sage), time (gold), occasion (terra)
export const TAG_COLORS: Record<string, string> = {
  keto: '#3A6B42',
  'meal-prep': '#A0652A',
  '30 min': '#A0652A',
  'crowd-pleaser': '#B5522A',
  'fun night': '#B5522A',
  'date night': '#B5522A',
};

export const CATS: Record<string, { l: string; c: string }> = {
  proteins: { l: 'Proteins',    c: '#8B3A2A' },
  produce:  { l: 'Produce',     c: '#3A6B42' },
  dairy:    { l: 'Dairy & Eggs', c: '#8B6914' },
  pantry:   { l: 'Pantry',      c: '#4A5A6A' },
};
export const CAT_KEYS = Object.keys(CATS) as IngredientCat[];

export const QUICK_NOTES = [
  'Eating out 🍽️','Leftovers 🥡','Mitch traveling ✈️','Date night 💕',
  'Too tired 😴','Meal prepping 🫙','Happy hour 🥂','Family visiting 👨‍👩‍👧',
];

export const BASE_GUESTS = 3;

// ── Helpers ────────────────────────────────────────────

export function scaleIngredients(ingredients: Ingredient[], baseServings: number, guestCount: number): Ingredient[] {
  if (baseServings <= 0 || guestCount === baseServings) return ingredients;
  const factor = guestCount / baseServings;
  return ingredients.map((ing) =>
    ing.noScale ? ing : { ...ing, qty: Math.round(ing.qty * factor * 100) / 100 }
  );
}

export function catColor(cat: string): string {
  return CATS[cat]?.c ?? '#888';
}
export function dayColor(key: string): string {
  const i = DAY_KEYS.indexOf(key as DayKey);
  return i >= 0 ? DAY_COLORS[i] : recColor(key);
}

export function fmtQ(n: number): string {
  if (!n) return '0';
  if (n === Math.floor(n)) return `${n}`;
  const whole = Math.floor(n);
  const f = n - whole;
  const prefix = whole > 0 ? `${whole} ` : '';
  if (Math.abs(f - 1/4) < 0.02) return `${prefix}¼`;
  if (Math.abs(f - 1/3) < 0.02) return `${prefix}⅓`;
  if (Math.abs(f - 1/2) < 0.02) return `${prefix}½`;
  if (Math.abs(f - 2/3) < 0.02) return `${prefix}⅔`;
  if (Math.abs(f - 3/4) < 0.02) return `${prefix}¾`;
  return n % 1 === 0 ? `${n}` : n.toFixed(2).replace(/\.?0+$/, '');
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
  dayMeals: DayMeal[],
  recurring: { key: string; recipeId?: string | null }[],
  pantryItems: PantryItem[] = [],
): ShoppingItem[] {
  const merged: Record<string, ShoppingItem> = {};
  let counter = 0;

  function addIngs(ingredients: Recipe['ingredients'], dayKey: string, scale: number) {
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

  dayMeals.forEach((meal) => {
    meal.recipes.forEach((dmr) => {
      if (!dmr.includeInShopping) return;
      const recipe = recipes.find((r) => r.id === dmr.recipeId);
      if (!recipe) return;
      const ings = meal.guests != null
        ? scaleIngredients(recipe.ingredients, recipe.servings, meal.guests)
        : recipe.ingredients;
      addIngs(ings, meal.dayKey, 1);
    });
  });

  recurring.forEach((r) => {
    if (!r.recipeId) return;
    const recipe = recipes.find((rec) => rec.id === r.recipeId);
    if (!recipe) return;
    addIngs(recipe.ingredients, r.key, 1);
  });

  if (pantryItems.length === 0) return Object.values(merged);

  const pantryMap = new Map(pantryItems.map((p) => [p.name, p]));
  const result: ShoppingItem[] = [];
  for (const item of Object.values(merged)) {
    const key = item.name.toLowerCase().trim();
    const pantry = pantryMap.get(key);
    if (!pantry || pantry.unit !== item.unit) {
      result.push(item);
      continue;
    }
    const needed = item.totalQty - pantry.qty;
    if (needed <= 0) continue;
    result.push({ ...item, totalQty: needed });
  }
  return result;
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
