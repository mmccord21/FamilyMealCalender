// Shared TypeScript types for the entire app

export type RecipeTag = 'keto' | 'meal-prep' | '30 min' | 'crowd-pleaser' | 'fun night' | 'date night';
export type IngredientCat = 'proteins' | 'produce' | 'dairy' | 'pantry';
export type Store = 'sprouts' | 'costco';
export type DayType = 'empty' | 'meal' | 'note';
export type DayKey = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface Ingredient {
  id: string;
  recipeId: string;
  name: string;
  qty: number;
  unit: string;
  cat: IngredientCat;
  store: Store;
  noScale: boolean;
}

export interface Recipe {
  id: string;
  emoji: string;
  name: string;
  sub: string;
  tags: string[];
  color: string;
  instructions?: string | null;
  ingredients: Ingredient[];
}

export interface WeekEntry {
  id?: string;
  dayKey: DayKey;
  weekYear: number;
  weekNum: number;
  type: DayType;
  recipeId?: string | null;
  guests?: number | null;
  note?: string | null;
}

export interface RecurringMeal {
  id?: string;
  key: string;
  label: string;
  recipeId?: string | null;
}

export interface IngredientPrice {
  name: string; // lowercase key
  price: number;
}

export interface ShoppingCheck {
  itemKey: string;
  checked: boolean;
  weekYear: number;
  weekNum: number;
}

export interface ManualShoppingItem {
  id: string;
  name: string;
  weekYear: number;
  weekNum: number;
}

// Derived shopping list item (not stored directly)
export interface ShoppingItem {
  mid: string;
  name: string;
  totalQty: number;
  unit: string;
  cat: IngredientCat;
  store: Store;
  noScale: boolean;
  days: { key: string; color: string }[];
}
