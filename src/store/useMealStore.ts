import { create } from 'zustand';
import type { Recipe, WeekEntry, RecurringMeal } from '@/types';
import { getISOWeek } from '@/lib/helpers';

interface MealState {
  recipes: Recipe[];
  weekEntries: WeekEntry[];
  recurring: RecurringMeal[];
  prices: Record<string, number>;
  checkedItems: Record<string, boolean>;
  
  weekOffset: number;
  activeTab: 'plan' | 'recipes' | 'shop';
  
  // Actions
  setInitialData: (data: Partial<MealState>) => void;
  setActiveTab: (tab: 'plan' | 'recipes' | 'shop') => void;
  setWeekOffset: (offset: number) => void;
  
  // API Actions
  fetchWeek: () => Promise<void>;
  saveDay: (key: string, entry: Partial<WeekEntry>) => Promise<void>;
  saveRecurring: (key: string, recipeId: string | null) => Promise<void>;
  saveRecipe: (recipe: Partial<Recipe>) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  savePrice: (itemKey: string, price: number) => Promise<void>;
  toggleCheck: (itemKey: string, checked: boolean) => Promise<void>;
  resetChecked: () => Promise<void>;
}

export const useMealStore = create<MealState>((set, get) => ({
  recipes: [],
  weekEntries: [],
  recurring: [],
  prices: {},
  checkedItems: {},
  
  weekOffset: 0,
  activeTab: 'plan',

  setInitialData: (data) => set((state) => ({ ...state, ...data })),
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  setWeekOffset: (offset) => {
    set({ weekOffset: offset });
    get().fetchWeek();
  },

  fetchWeek: async () => {
    const { weekOffset } = get();
    const res = await fetch(`/api/week?offset=${weekOffset}`);
    const data = await res.json();
    
    // Also fetch checked items for this week
    const checkRes = await fetch(`/api/checked?weekYear=${data.weekYear}&weekNum=${data.weekNum}`);
    const checked = await checkRes.json();
    
    set({ weekEntries: data.entries, checkedItems: checked });
  },

  saveDay: async (key, entry) => {
    const { weekOffset, weekEntries } = get();
    const today = new Date();
    today.setDate(today.getDate() + weekOffset * 7);
    const { weekYear, weekNum } = getISOWeek(today);

    // Optimistic
    const existingIdx = weekEntries.findIndex((e) => e.dayKey === key);
    const newEntry = { dayKey: key as any, weekYear, weekNum, ...entry } as WeekEntry;
    
    const newEntries = [...weekEntries];
    if (existingIdx >= 0) newEntries[existingIdx] = { ...newEntries[existingIdx], ...newEntry };
    else newEntries.push(newEntry);
    set({ weekEntries: newEntries });

    await fetch(`/api/week/${key}`, {
      method: 'PUT',
      body: JSON.stringify(newEntry),
    });
  },

  saveRecurring: async (key, recipeId) => {
    const { recurring } = get();
    const newRec = recurring.map((r) => r.key === key ? { ...r, recipeId } : r);
    set({ recurring: newRec });

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
    const { recipes, weekEntries, recurring } = get();
    set({
      recipes: recipes.filter((r) => r.id !== id),
      weekEntries: weekEntries.map((e) => e.recipeId === id ? { ...e, type: 'empty', recipeId: null } : e),
      recurring: recurring.map((r) => r.recipeId === id ? { ...r, recipeId: null } : r),
    });
    await fetch(`/api/recipes/${id}`, { method: 'DELETE' });
  },

  savePrice: async (itemKey, price) => {
    set((state) => ({ prices: { ...state.prices, [itemKey]: price } }));
    await fetch('/api/prices', { method: 'PUT', body: JSON.stringify({ name: itemKey, price }) });
  },

  toggleCheck: async (itemKey, checked) => {
    const { weekOffset } = get();
    const today = new Date();
    today.setDate(today.getDate() + weekOffset * 7);
    const { weekYear, weekNum } = getISOWeek(today);

    set((state) => ({ checkedItems: { ...state.checkedItems, [itemKey]: checked } }));
    await fetch('/api/checked', { method: 'PUT', body: JSON.stringify({ itemKey, checked, weekYear, weekNum }) });
  },

  resetChecked: async () => {
    const { weekOffset } = get();
    const today = new Date();
    today.setDate(today.getDate() + weekOffset * 7);
    const { weekYear, weekNum } = getISOWeek(today);

    set({ checkedItems: {} });
    await fetch(`/api/checked?weekYear=${weekYear}&weekNum=${weekNum}`, { method: 'DELETE' });
  },
}));
