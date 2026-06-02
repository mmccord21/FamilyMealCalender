import { create } from 'zustand';
import type { Recipe, DayMeal, DayMealRecipe, PantryItem, RecurringMeal, ManualShoppingItem, UserStore, WeekTemplate, ShoppingItem } from '@/types';
import { getISOWeek, buildShoppingList, fmtShopAmt } from '@/lib/helpers';

interface MealState {
  recipes: Recipe[];
  dayMeals: DayMeal[];
  recurring: RecurringMeal[];
  prices: Record<string, number>;
  estimatedPrices: Record<string, boolean>;
  checkedItems: Record<string, boolean>;
  hiddenItems: Record<string, boolean>;
  qtyOverrides: Record<string, number>;
  manualItems: ManualShoppingItem[];
  stores: UserStore[];
  templates: WeekTemplate[];
  pantryItems: PantryItem[];

  weekOffset: number;
  weekLoading: boolean;
  activeTab: 'plan' | 'recipes' | 'shop' | 'pantry';

  setInitialData: (data: Partial<MealState>) => void;
  setActiveTab: (tab: 'plan' | 'recipes' | 'shop' | 'pantry') => void;
  fetchPantry: () => Promise<void>;
  addToPantry: (name: string, qty: number, unit: string) => Promise<void>;
  updatePantryQty: (name: string, qty: number, unit: string) => Promise<void>;
  removePantryItem: (name: string) => Promise<void>;
  markMealCooked: (dayMealId: string) => Promise<void>;
  setWeekOffset: (delta: number) => void;
  fetchStores: () => Promise<void>;
  addStore: (name: string) => Promise<void>;
  deleteStore: (id: string) => Promise<void>;
  fetchTemplates: () => Promise<void>;
  saveTemplate: (name: string) => Promise<void>;
  applyTemplate: (templateId: string) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;

  fetchWeek: () => Promise<void>;
  setQtyOverride: (itemKey: string, qty: number) => Promise<void>;
  addDayMeal: (dayKey: string, name: string) => Promise<DayMeal>;
  updateDayMeal: (id: string, fields: Partial<Pick<DayMeal, 'name' | 'guests' | 'note' | 'sortOrder'>>) => Promise<void>;
  deleteDayMeal: (id: string) => Promise<() => void>;
  addRecipeToDayMeal: (dayMealId: string, recipeId: string) => Promise<DayMealRecipe>;
  removeRecipeFromDayMeal: (dayMealId: string, dmrId: string) => Promise<void>;
  updateDayMealRecipe: (dayMealId: string, dmrId: string, fields: { sortOrder?: number; includeInShopping?: boolean }) => Promise<void>;

  saveRecurring: (key: string, recipeId: string | null) => Promise<void>;
  addRecurring: (label: string) => Promise<void>;
  deleteRecurring: (key: string) => Promise<void>;
  renameRecurring: (key: string, label: string) => Promise<void>;
  saveRecipe: (recipe: Partial<Recipe>) => Promise<void>;
  deleteRecipe: (id: string) => Promise<() => void>;
  savePrice: (itemKey: string, price: number) => Promise<void>;
  estimatePrices: (items: ShoppingItem[]) => Promise<void>;
  toggleCheck: (itemKey: string, checked: boolean) => Promise<void>;
  resetChecked: () => Promise<void>;
  addManualItem: (name: string) => Promise<void>;
  deleteManualItem: (id: string) => Promise<void>;
  hideItem: (itemKey: string) => Promise<void>;
  restoreHiddenItems: () => Promise<void>;
  copyWeek: (fromWeekYear: number, fromWeekNum: number) => Promise<void>;
}

function weekFromOffset(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset * 7);
  return getISOWeek(d);
}

function staleCheckedKeys(
  oldMeals: DayMeal[],
  newMeals: DayMeal[],
  recipes: Recipe[],
  recurring: RecurringMeal[],
  checkedItems: Record<string, boolean>,
): string[] {
  const oldList = buildShoppingList(recipes, oldMeals, recurring);
  const newList = buildShoppingList(recipes, newMeals, recurring);
  const newKeys = new Set(newList.map((i) => i.name.toLowerCase().trim()));
  return oldList
    .map((i) => i.name.toLowerCase().trim())
    .filter((k) => !newKeys.has(k) && checkedItems[k]);
}

function clearCheckedInDB(keys: string[], weekYear: number, weekNum: number) {
  keys.forEach((k) => {
    fetch('/api/checked', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemKey: k, checked: false, weekYear, weekNum }),
    }).catch(() => {});
  });
}

export const useMealStore = create<MealState>((set, get) => ({
  recipes: [],
  dayMeals: [],
  recurring: [],
  prices: {},
  estimatedPrices: {},
  checkedItems: {},
  hiddenItems: {},
  qtyOverrides: {},
  manualItems: [],
  stores: [],
  templates: [],
  pantryItems: [],

  weekOffset: 0,
  weekLoading: false,
  activeTab: 'plan',

  setInitialData: (data) => set((state) => ({ ...state, ...data, manualItems: data.manualItems ?? state.manualItems })),
  setActiveTab: (tab) => set({ activeTab: tab }),

  fetchPantry: async () => {
    const res = await fetch('/api/pantry');
    if (!res.ok) return;
    const items: PantryItem[] = await res.json();
    set({ pantryItems: items });
  },

  addToPantry: async (name, qty, unit) => {
    const key = name.toLowerCase().trim();
    set((state) => {
      const existing = state.pantryItems.find((p) => p.name === key);
      if (existing) {
        return { pantryItems: state.pantryItems.map((p) => p.name === key ? { ...p, qty: p.unit === unit ? p.qty + qty : qty, unit } : p) };
      }
      const optimistic: PantryItem = { id: `temp-${Date.now()}`, name: key, qty, unit, updatedAt: new Date().toISOString() };
      return { pantryItems: [...state.pantryItems, optimistic] };
    });
    const res = await fetch('/api/pantry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: key, qty, unit }),
    });
    if (res.ok) {
      const saved: PantryItem = await res.json();
      set((state) => ({ pantryItems: state.pantryItems.map((p) => p.name === key ? saved : p) }));
    }
  },

  updatePantryQty: async (name, qty, unit) => {
    const key = name.toLowerCase().trim();
    set((state) => ({ pantryItems: state.pantryItems.map((p) => p.name === key ? { ...p, qty, unit } : p) }));
    fetch('/api/pantry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: key, qty, unit }),
    }).catch(() => {});
  },

  removePantryItem: async (name) => {
    const key = name.toLowerCase().trim();
    set((state) => ({ pantryItems: state.pantryItems.filter((p) => p.name !== key) }));
    fetch(`/api/pantry?name=${encodeURIComponent(key)}`, { method: 'DELETE' }).catch(() => {});
  },

  markMealCooked: async (dayMealId) => {
    set((state) => ({
      dayMeals: state.dayMeals.map((m) => m.id === dayMealId ? { ...m, cookedAt: new Date().toISOString() } : m),
    }));
    const res = await fetch('/api/pantry/deduct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dayMealId }),
    });
    if (res.ok) {
      const { meal, pantryItems } = await res.json();
      set((state) => ({
        dayMeals: state.dayMeals.map((m) => m.id === dayMealId ? meal : m),
        pantryItems,
      }));
    }
  },

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

      let qtyOverrides: Record<string, number> = {};
      try {
        const overrideRes = await fetch(`/api/qty-overrides?weekYear=${data.weekYear}&weekNum=${data.weekNum}`);
        if (overrideRes.ok) qtyOverrides = await overrideRes.json();
      } catch { /* non-critical */ }

      let hiddenItems: Record<string, boolean> = {};
      try {
        const hiddenRes = await fetch(`/api/hidden-items?weekYear=${data.weekYear}&weekNum=${data.weekNum}`);
        if (hiddenRes.ok) hiddenItems = await hiddenRes.json();
      } catch { /* non-critical */ }

      set({ dayMeals: data.meals, checkedItems: checked, manualItems, qtyOverrides, hiddenItems, weekLoading: false });
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
    const { dayMeals, recipes, recurring, checkedItems, weekOffset } = get();
    const { weekYear, weekNum } = weekFromOffset(weekOffset);

    const deletedMeal = dayMeals.find((m) => m.id === id);
    const newDayMeals = dayMeals.filter((m) => m.id !== id);

    const stale = staleCheckedKeys(dayMeals, newDayMeals, recipes, recurring, checkedItems);
    const newChecked = { ...checkedItems };
    stale.forEach((k) => delete newChecked[k]);

    set({ dayMeals: newDayMeals, checkedItems: newChecked });
    clearCheckedInDB(stale, weekYear, weekNum);

    const timer = setTimeout(() => {
      fetch(`/api/meals/${id}`, { method: 'DELETE' });
    }, 5000);

    return () => {
      clearTimeout(timer);
      set((state) => ({
        dayMeals: deletedMeal ? [...state.dayMeals, deletedMeal] : state.dayMeals,
      }));
    };
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

    // Check if the temp entry is still in the store (user may have removed it while in-flight)
    const currentMeal = get().dayMeals.find((m) => m.id === dayMealId);
    const tempStillExists = currentMeal?.recipes.some((r) => r.id === tempId);

    if (tempStillExists) {
      set((state) => ({
        dayMeals: state.dayMeals.map((m) =>
          m.id === dayMealId
            ? { ...m, recipes: m.recipes.map((r) => r.id === tempId ? saved : r) }
            : m
        ),
      }));
    } else {
      // Temp was removed while API was in-flight — clean up the saved record from DB
      fetch(`/api/meals/${dayMealId}/recipes/${saved.id}`, { method: 'DELETE' }).catch(() => {});
    }

    return saved;
  },

  removeRecipeFromDayMeal: async (dayMealId, dmrId) => {
    const { dayMeals, recipes, recurring, checkedItems, weekOffset } = get();
    const { weekYear, weekNum } = weekFromOffset(weekOffset);
    const newDayMeals = dayMeals.map((m) =>
      m.id === dayMealId ? { ...m, recipes: m.recipes.filter((r) => r.id !== dmrId) } : m
    );

    const stale = staleCheckedKeys(dayMeals, newDayMeals, recipes, recurring, checkedItems);
    const newChecked = { ...checkedItems };
    stale.forEach((k) => delete newChecked[k]);

    set({ dayMeals: newDayMeals, checkedItems: newChecked });
    clearCheckedInDB(stale, weekYear, weekNum);
    await fetch(`/api/meals/${dayMealId}/recipes/${dmrId}`, { method: 'DELETE' });
  },

  updateDayMealRecipe: async (dayMealId, dmrId, fields) => {
    const { dayMeals, recipes, recurring, checkedItems, weekOffset } = get();
    const { weekYear, weekNum } = weekFromOffset(weekOffset);
    const newDayMeals = dayMeals.map((m) =>
      m.id === dayMealId
        ? { ...m, recipes: m.recipes.map((r) => r.id === dmrId ? { ...r, ...fields } : r) }
        : m
    );

    let newChecked = checkedItems;
    if (fields.includeInShopping === false) {
      const stale = staleCheckedKeys(dayMeals, newDayMeals, recipes, recurring, checkedItems);
      if (stale.length > 0) {
        newChecked = { ...checkedItems };
        stale.forEach((k) => delete newChecked[k]);
        clearCheckedInDB(stale, weekYear, weekNum);
      }
    }

    set({ dayMeals: newDayMeals, checkedItems: newChecked });
    await fetch(`/api/meals/${dayMealId}/recipes/${dmrId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
  },

  fetchStores: async () => {
    const res = await fetch('/api/stores');
    if (!res.ok) return;
    const stores: UserStore[] = await res.json();
    set({ stores });
  },

  addStore: async (name) => {
    const tempId = `temp-${Date.now()}`;
    set((state) => ({ stores: [...state.stores, { id: tempId, name }] }));
    const res = await fetch('/api/stores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const saved: UserStore = await res.json();
    set((state) => ({ stores: state.stores.map((s) => s.id === tempId ? saved : s) }));
  },

  deleteStore: async (id) => {
    set((state) => ({ stores: state.stores.filter((s) => s.id !== id) }));
    await fetch(`/api/stores?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  },

  fetchTemplates: async () => {
    const res = await fetch('/api/templates');
    if (!res.ok) return;
    const templates: WeekTemplate[] = await res.json();
    set({ templates });
  },

  saveTemplate: async (name) => {
    const { weekOffset } = get();
    const { weekYear, weekNum } = weekFromOffset(weekOffset);
    await fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, weekYear, weekNum }),
    });
    await get().fetchTemplates();
  },

  applyTemplate: async (templateId) => {
    const { weekOffset } = get();
    const { weekYear: toWeekYear, weekNum: toWeekNum } = weekFromOffset(weekOffset);
    await fetch(`/api/templates/${templateId}/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toWeekYear, toWeekNum }),
    });
    await get().fetchWeek();
  },

  deleteTemplate: async (id) => {
    set((state) => ({ templates: state.templates.filter((t) => t.id !== id) }));
    await fetch(`/api/templates/${id}`, { method: 'DELETE' });
  },

  saveRecurring: async (key, recipeId) => {
    set((state) => ({ recurring: state.recurring.map((r) => r.key === key ? { ...r, recipeId } : r) }));
    await fetch('/api/recurring', {
      method: 'PUT',
      body: JSON.stringify({ key, recipeId }),
    });
  },

  addRecurring: async (label) => {
    const tempId = `temp-${Date.now()}`;
    const tempKey = `${label.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    const optimistic: RecurringMeal = { id: tempId, key: tempKey, label, recipeId: null };
    set((state) => ({ recurring: [...state.recurring, optimistic] }));
    const res = await fetch('/api/recurring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label }),
    });
    const saved: RecurringMeal = await res.json();
    set((state) => ({ recurring: state.recurring.map((r) => r.id === tempId ? saved : r) }));
  },

  deleteRecurring: async (key) => {
    set((state) => ({ recurring: state.recurring.filter((r) => r.key !== key) }));
    await fetch(`/api/recurring?key=${encodeURIComponent(key)}`, { method: 'DELETE' });
  },

  renameRecurring: async (key, label) => {
    set((state) => ({ recurring: state.recurring.map((r) => r.key === key ? { ...r, label } : r) }));
    await fetch('/api/recurring', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, label }),
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
    const { recipes, dayMeals, recurring, checkedItems, weekOffset } = get();
    const { weekYear, weekNum } = weekFromOffset(weekOffset);

    const deletedRecipe = recipes.find((r) => r.id === id);
    const affectedMealRecipes = dayMeals
      .map((m) => ({ id: m.id, dmrs: m.recipes.filter((r) => r.recipeId === id) }))
      .filter((a) => a.dmrs.length > 0);
    const affectedRecurring = recurring.filter((r) => r.recipeId === id);

    const newRecipes = recipes.filter((r) => r.id !== id);
    const newDayMeals = dayMeals.map((m) => ({
      ...m,
      recipes: m.recipes.filter((r) => r.recipeId !== id),
    }));
    const newRecurring = recurring.map((r) => r.recipeId === id ? { ...r, recipeId: null } : r);

    const oldList = buildShoppingList(recipes, dayMeals, recurring);
    const newList = buildShoppingList(newRecipes, newDayMeals, newRecurring);
    const newKeys = new Set(newList.map((i) => i.name.toLowerCase().trim()));
    const stale = oldList
      .map((i) => i.name.toLowerCase().trim())
      .filter((k) => !newKeys.has(k) && checkedItems[k]);

    const newChecked = { ...checkedItems };
    stale.forEach((k) => delete newChecked[k]);

    set({ recipes: newRecipes, dayMeals: newDayMeals, recurring: newRecurring, checkedItems: newChecked });
    clearCheckedInDB(stale, weekYear, weekNum);

    const timer = setTimeout(() => {
      fetch(`/api/recipes/${id}`, { method: 'DELETE' });
    }, 5000);

    return () => {
      clearTimeout(timer);
      set((state) => ({
        recipes: deletedRecipe ? [...state.recipes, deletedRecipe] : state.recipes,
        dayMeals: state.dayMeals.map((m) => {
          const affected = affectedMealRecipes.find((a) => a.id === m.id);
          if (!affected) return m;
          return { ...m, recipes: [...m.recipes, ...affected.dmrs] };
        }),
        recurring: state.recurring.map((r) => {
          const orig = affectedRecurring.find((ar) => ar.key === r.key);
          return orig ? { ...r, recipeId: id } : r;
        }),
      }));
    };
  },

  savePrice: async (itemKey, price) => {
    set((state) => {
      const newEstimated = { ...state.estimatedPrices };
      delete newEstimated[itemKey];
      return { prices: { ...state.prices, [itemKey]: price }, estimatedPrices: newEstimated };
    });
    await fetch('/api/prices', { method: 'PUT', body: JSON.stringify({ name: itemKey, price }) });
  },

  estimatePrices: async (items) => {
    const { prices } = get();
    const toEstimate = items
      .filter((i) => !prices[i.name.toLowerCase().trim()])
      .map((i) => ({ name: i.name.toLowerCase().trim(), amount: fmtShopAmt(i) }));
    if (!toEstimate.length) return;

    const res = await fetch('/api/estimate-prices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: toEstimate }),
    });
    if (!res.ok) throw new Error('Failed to estimate prices');
    const { prices: estimated } = await res.json() as { prices: Record<string, number> };

    set((state) => ({
      prices: { ...state.prices, ...estimated },
      estimatedPrices: {
        ...state.estimatedPrices,
        ...Object.fromEntries(Object.keys(estimated).map((k) => [k, true])),
      },
    }));

    Object.entries(estimated).forEach(([name, price]) => {
      fetch('/api/prices', { method: 'PUT', body: JSON.stringify({ name, price }) }).catch(() => {});
    });
  },

  toggleCheck: async (itemKey, checked) => {
    const { weekYear, weekNum } = weekFromOffset(get().weekOffset);
    set((state) => ({ checkedItems: { ...state.checkedItems, [itemKey]: checked } }));
    await fetch('/api/checked', { method: 'PUT', body: JSON.stringify({ itemKey, checked, weekYear, weekNum }) });
    if (checked) {
      const { recipes, dayMeals, recurring } = get();
      const list = buildShoppingList(recipes, dayMeals, recurring);
      const item = list.find((i) => i.name.toLowerCase().trim() === itemKey);
      if (item && item.totalQty > 0 && item.unit) {
        get().addToPantry(item.name, item.totalQty, item.unit ?? '');
      }
    }
  },

  resetChecked: async () => {
    const { weekYear, weekNum } = weekFromOffset(get().weekOffset);
    set({ checkedItems: {}, qtyOverrides: {} });
    await Promise.all([
      fetch(`/api/checked?weekYear=${weekYear}&weekNum=${weekNum}`, { method: 'DELETE' }),
      fetch(`/api/qty-overrides?weekYear=${weekYear}&weekNum=${weekNum}`, { method: 'DELETE' }),
    ]);
  },

  setQtyOverride: async (itemKey, qty) => {
    const { weekYear, weekNum } = weekFromOffset(get().weekOffset);
    set((state) => ({ qtyOverrides: { ...state.qtyOverrides, [itemKey]: qty } }));
    await fetch('/api/qty-overrides', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemKey, qty, weekYear, weekNum }),
    });
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

  hideItem: async (itemKey) => {
    const { weekYear, weekNum } = weekFromOffset(get().weekOffset);
    set((state) => ({ hiddenItems: { ...state.hiddenItems, [itemKey]: true } }));
    await fetch('/api/hidden-items', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemKey, weekYear, weekNum }),
    });
  },

  restoreHiddenItems: async () => {
    const { weekYear, weekNum } = weekFromOffset(get().weekOffset);
    set({ hiddenItems: {} });
    await fetch(`/api/hidden-items?weekYear=${weekYear}&weekNum=${weekNum}`, { method: 'DELETE' });
  },

  copyWeek: async (fromWeekYear, fromWeekNum) => {
    const { weekOffset } = get();
    const { weekYear: toWeekYear, weekNum: toWeekNum } = weekFromOffset(weekOffset);
    await fetch('/api/week/copy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromWeekYear, fromWeekNum, toWeekYear, toWeekNum }),
    });
    await get().fetchWeek();
  },
}));
