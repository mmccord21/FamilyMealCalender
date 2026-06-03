// Shared TypeScript types for the entire app

export type RecipeTag = 'keto' | 'meal-prep' | '30 min' | 'crowd-pleaser' | 'fun night' | 'date night';
export type IngredientCat = 'proteins' | 'produce' | 'dairy' | 'pantry';
export type Store = string;
export type DayKey = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export interface UserStore {
  id: string;
  name: string;
}

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
  imageUrl?: string | null;
  name: string;
  sub: string;
  tags: string[];
  color: string;
  instructions?: string | null;
  servings: number;
  prepTime?: number | null;
  cookTime?: number | null;
  ingredients: Ingredient[];
}

export interface DayMealRecipe {
  id: string;
  dayMealId: string;
  recipeId: string;
  sortOrder: number;
  includeInShopping: boolean;
}

export interface DayMeal {
  id: string;
  dayKey: DayKey;
  weekYear: number;
  weekNum: number;
  name: string;
  sortOrder: number;
  guests?: number | null;
  note?: string | null;
  cookedAt?: string | null;
  recipes: DayMealRecipe[];
}

export interface PantryItem {
  id: string;
  name: string;
  qty: number;
  unit: string;
  lowStockQty?: number | null;
  updatedAt: string;
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

export interface ShoppingQtyOverride {
  itemKey: string;
  qty: number;
  weekYear: number;
  weekNum: number;
}

export interface TemplateMealRecipe {
  id: string;
  templateMealId: string;
  recipeId: string;
  sortOrder: number;
  includeInShopping: boolean;
}

export interface TemplateMeal {
  id: string;
  templateId: string;
  dayKey: DayKey;
  name: string;
  sortOrder: number;
  guests?: number | null;
  note?: string | null;
  recipes: TemplateMealRecipe[];
}

export interface WeekTemplate {
  id: string;
  name: string;
  createdAt: string;
  meals: TemplateMeal[];
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
