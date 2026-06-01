import { create } from 'zustand';
import type { Recipe, DayMeal, DayMealRecipe, RecurringMeal, ManualShoppingItem } from '@/types';
import { getISOWeek } from '@/lib/helpers';

interface MealState {
  recipes: Recipe[];
  dayMeals: DayMeal[];
  recurring: RecurringMeal[];
  prices: Record<string, number>;
  checkedItems: Record<string, boolean>;
  manualItems: ManualShoppingItem[];

  weekOffset: number;
  weekLoading: boolean;
  activeTab: 'plan' | 'recipes' | 'shop';

  setInitialData: (data: Partial<MealState>) => void;
  setActiveTab: (tab: 'plan' | 'recipes' | 'shop') => void;
  setWeekOffset: (delta: number) => void;

  fetchWeek: () => Promise<void>;
  addDayMeal: (dayKey: string, name: string) => Promise<DayMeal>;
  updateDayMeal: (id: string, fields: Partial<Pick<DayMeal, 'name' | 'guests' | 'note' | 'sortOrder'>>) => Promise<void>;
  deleteDayMeal: (id: string) => Promise<void>;
  addRecipeToDayMeal: (dayMealId: string, recipeId: string) => Promise<DayMealRecipe>;
  removeRecipeFromDayMeal: (dayMealId: string, dmrId: string) => Promise<void>;
  updateDayMealRecipe: (dayMealId: string, dmrId: string, fields: { sortOrder?: number; includeInShopping?: boolean }) => Promise<void>;

  saveRecurring: (key: string, recipeId: string | null) => Promise<void>;
  saveRecipe: (recipe: Partial<Recipe>) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  savePrice: (itemKey: string, price: number) => Promise<void>;
  toggleCheck: (itemKey: string, checked: boolean) => Promise<void>;
  resetChecked: () => Promise<void>;
  addManualItem: (name: string) => Promise<void>;
  deleteManualItem: (id: string) => Promise<void>;
}

function weekFromOffset(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset * 7);
  return getISOWeek(d);
}

export const useMealStore = create<MealState>((set, get) => ({
  recipes: [],
  dayMeals: [],
  recurring: [],
  prices: {},
  checkedItems: {},
  manualItems: [],

  weekOffset: 0,
  weekLoading: false,
  activeTab: 'plan',

  setInitialData: (data) => set((state) => ({ ...state, ...data, manualItems: data.manualItems ?? state.manualItems })),
  setActiveTab: (tab) => set({ activeTab: tab }),

  setWeekOffset: (delta) => {
    set((state) => ({ weekOffset: state.weekOffset + delta }));
    get().fetchWeek();
  },

  fetchWeek: async () => {
    const { weekOffset } = get();
    set({ weekLoading: true });
    try {
      const res = await fetch(`/api/week?offset=${weekOffset}`);
      if (!res.ok) {
        set({ dayMeals: [], checkedItems: {}, weekLoading: false });
        return;
      }
      const data = await res.json();

      let checked: Record<string, boolean> = {};
      try {
        const checkRes = await fetch(`/api/checked?weekYear=${data.weekYear}&weekNum=${data.weekNum}`);
        if (checkRes.ok) checked = await checkRes.json();
      } catch { /* non-critical */ }

      let manualItems: ManualShoppingItem[] = [];
      try {
        const manualRes = await fetch(`/api/manual-items?weekYear=${data.weekYear}&weekNum=${data.weekNum}`);
        if (manualRes.ok) manualItems = await manualRes.json();
      } catch { /* non-critical */ }

      set({ dayMeals: data.meals, checkedItems: checked, manualItems, weekLoading: false });
    } catch {
      set({ dayMeals: [], checkedItems: {}, weekLoading: false });
    }
  },

  addDayMeal: async (dayKey, name) => {
    const { weekOffset, dayMeals } = get();
    const { weekYear, weekNum } = weekFromOffset(weekOffset);
    const sortOrder = dayMeals.filter((m) => m.dayKey === dayKey).length;

    const tempId = `temp-${Date.now()}`;
    const optimistic: DayMeal = {
      id: tempId,
      dayKey: dayKey as DayMeal['dayKey'],
      weekYear,
      weekNum,
      name,
      sortOrder,
      guests: null,
      note: null,
      recipes: [],
    };
    set({ dayMeals: [...dayMeals, optimistic] });

    const res = await fetch('/api/meals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dayKey, weekYear, weekNum, name, sortOrder }),
    });
    const saved: DayMeal = await res.json();
    set((state) => ({ dayMeals: state.dayMeals.map((m) => m.id === tempId ? saved : m) }));
    return saved;
  },

  updateDayMeal: async (id, fields) => {
    set((state) => ({
      dayMeals: state.dayMeals.map((m) => m.id === id ? { ...m, ...fields } : m),
    }));
    await fetch(`/api/meals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
  },

  deleteDayMeal: async (id) => {
    set((state) => ({ dayMeals: state.dayMeals.filter((m) => m.id !== id) }));
    await fetch(`/api/meals/${id}`, { method: 'DELETE' });
  },

  addRecipeToDayMeal: async (dayMealId, recipeId) => {
    const meal = get().dayMeals.find((m) => m.id === dayMealId);
    const sortOrder = meal ? meal.recipes.length : 0;

    const tempId = `temp-${Date.now()}`;
    const optimistic: DayMealRecipe = { id: tempId, dayMealId, recipeId, sortOrder, includeInShopping: true };
    set((state) => ({
      dayMeals: state.dayMeals.map((m) =>
        m.id === dayMealId ? { ...m, recipes: [...m.recipes, optimistic] } : m
      ),
    }));

    const res = await fetch(`/api/meals/${dayMealId}/recipes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipeId, sortOrder }),
    });
    const saved: DayMealRecipe = await res.json();
    set((state) => ({
      dayMeals: state.dayMeals.map((m) =>
        m.id === dayMealId
          ? { ...m, recipes: m.recipes.map((r) => r.id === tempId ? saved : r) }
          : m
      ),
    }));
    return saved;
  },

  removeRecipeFromDayMeal: async (dayMealId, dmrId) => {
    set((state) => ({
      dayMeals: state.dayMeals.map((m) =>
        m.id === dayMealId ? { ...m, recipes: m.recipes.filter((r) => r.id !== dmrId) } : m
      ),
    }));
    await fetch(`/api/meals/${dayMealId}/recipes/${dmrId}`, { method: 'DELETE' });
  },

  updateDayMealRecipe: async (dayMealId, dmrId, fields) => {
    set((state) => ({
      dayMeals: state.dayMeals.map((m) =>
        m.id === dayMealId
          ? { ...m, recipes: m.recipes.map((r) => r.id === dmrId ? { ...r, ...fields } : r) }
          : m
      ),
    }));
    await fetch(`/api/meals/${dayMealId}/recipes/${dmrId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
  },

  saveRecurring: async (key, recipeId) => {
    set((state) => ({ recurring: state.recurring.map((r) => r.key === key ? { ...r, recipeId } : r) }));
    await fetch('/api/recurring', {
      method: 'PUT',
      body: JSON.stringify({ key, recipeId }),
    });
  },

  saveRecipe: async (recipe) => {
    const isNew = !recipe.id;
    const res = await fetch(isNew ? '/api/recipes' : `/api/recipes/${recipe.id}`, {
      method: isNew ? 'POST' : 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recipe),
    });
    if (!res.ok) throw new Error(`Failed to save recipe: ${res.status} ${res.statusText}`);
    const saved = await res.json();

    const { recipes } = get();
    if (isNew) set({ recipes: [...recipes, saved] });
    else set({ recipes: recipes.map((r) => r.id === saved.id ? saved : r) });
  },

  deleteRecipe: async (id) => {
    set((state) => ({
      recipes: state.recipes.filter((r) => r.id !== id),
      dayMeals: state.dayMeals.map((m) => ({
        ...m,
        recipes: m.recipes.filter((r) => r.recipeId !== id),
      })),
      recurring: state.recurring.map((r) => r.recipeId === id ? { ...r, recipeId: null } : r),
    }));
    await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
  },

  savePrice: async (itemKey, price) => {
    set((state) => ({ prices: { ...state.prices, [itemKey]: price } }));
    await fetch('/api/prices', { method: 'PUT', body: JSON.stringify({ name: itemKey, price }) });
  },

  toggleCheck: async (itemKey, checked) => {
    const { weekYear, weekNum } = weekFromOffset(get().weekOffset);
    set((state) => ({ checkedItems: { ...state.checkedItems, [itemKey]: checked } }));
    await fetch('/api/checked', { method: 'PUT', body: JSON.stringify({ itemKey, checked, weekYear, weekNum }) });
  },

  resetChecked: async () => {
    const { weekYear, weekNum } = weekFromOffset(get().weekOffset);
    set({ checkedItems: {} });
    await fetch(`/api/checked?weekYear=${weekYear}&weekNum=${weekNum}`, { method: 'DELETE' });
  },

  addManualItem: async (name) => {
    const { weekYear, weekNum } = weekFromOffset(get().weekOffset);
    const tempId = `temp-${Date.now()}`;
    set((state) => ({ manualItems: [...state.manualItems, { id: tempId, name, weekYear, weekNum }] }));

    const res = await fetch('/api/manual-items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, weekYear, weekNum }),
    });
    const saved = await res.json();
    set((state) => ({ manualItems: state.manualItems.map((i) => i.id === tempId ? saved : i) }));
  },

  deleteManualItem: async (id) => {
    set((state) => ({ manualItems: state.manualItems.filter((i) => i.id !== id) }));
    await fetch(`/api/manual-items?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  },
}));
