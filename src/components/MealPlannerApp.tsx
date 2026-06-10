'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header/Header';
import TabBar from '@/components/TabBar/TabBar';
import WeekView from '@/components/WeekView/WeekView';
import RecipesView from '@/components/RecipesView/RecipesView';
import ShopView from '@/components/ShopView/ShopView';
import PantryView from '@/components/PantryView/PantryView';
import DayModal from '@/components/DayModal/DayModal';
import RecipePickerModal from '@/components/RecipePickerModal/RecipePickerModal';
import RecipeEditorModal from '@/components/RecipeEditorModal/RecipeEditorModal';
import RecipeViewerModal from '@/components/RecipeViewerModal/RecipeViewerModal';
import PriceModal from '@/components/PriceModal/PriceModal';
import Toast from '@/components/Toast/Toast';
import InstallBanner from '@/components/InstallBanner/InstallBanner';
import OnboardingModal from '@/components/OnboardingModal/OnboardingModal';
import TabHint from '@/components/TabHint/TabHint';
import { CalendarDays, BookOpen, ShoppingCart, Package } from 'lucide-react';

import { useMealStore } from '@/store/useMealStore';
import { buildShoppingList, calcTotal, BASE_GUESTS } from '@/lib/helpers';
import type { Recipe, DayMeal, PantryItem, RecurringMeal, ManualShoppingItem, UserStore } from '@/types';

interface Props {
  initialRecipes: Recipe[];
  initialWeek: DayMeal[];
  initialRecurring: RecurringMeal[];
  initialPrices: Record<string, number>;
  initialChecked: Record<string, boolean>;
  initialHidden: Record<string, boolean>;
  initialManualItems: ManualShoppingItem[];
  initialStores: UserStore[];
  initialPantryItems: PantryItem[];
}

export default function MealPlannerApp({
  initialRecipes, initialWeek, initialRecurring, initialPrices, initialChecked, initialHidden, initialManualItems, initialStores, initialPantryItems
}: Props) {
  const store = useMealStore();
  const [toastMsg, setToastMsg] = useState('');
  const [toastAction, setToastAction] = useState<{ label: string; onClick: () => void } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [editDayKey, setEditDayKey] = useState<string>('Mon');
  const [editDayIdx, setEditDayIdx] = useState(0);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerForMealId, setPickerForMealId] = useState<string | null>(null);
  const [pickerIsQuickAdd, setPickerIsQuickAdd] = useState(false);
  const [editRecurKey, setEditRecurKey] = useState<string | null>(null);

  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [editRecipeId, setEditRecipeId] = useState<string | null>(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerRecipeId, setViewerRecipeId] = useState<string | null>(null);
  const [viewerDayMealId, setViewerDayMealId] = useState<string | null>(null);
  const [viewerDayKey, setViewerDayKey] = useState<string | null>(null);
  const [viewerDayIdx, setViewerDayIdx] = useState(0);

  const [showOnboarding, setShowOnboarding] = useState(false);

  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [priceItemKey, setPriceItemKey] = useState('');
  const [priceItemName, setPriceItemName] = useState('');
  const [priceItemAmt, setPriceItemAmt] = useState('');
  const [priceItemQty, setPriceItemQty] = useState(0);
  const [priceItemUnit, setPriceItemUnit] = useState('');

  useEffect(() => {
    const splash = document.getElementById('__splash');
    if (splash) {
      clearTimeout((window as any).__splashTimer);
      splash.style.transition = 'opacity 0.35s ease';
      splash.style.opacity = '0';
      setTimeout(() => splash.remove(), 350);
    }
    if (!localStorage.getItem('tonight_onboarded')) setShowOnboarding(true);
  }, []);

  useEffect(() => {
    useMealStore.getState().setInitialData({
      recipes: initialRecipes,
      dayMeals: initialWeek,
      recurring: initialRecurring,
      prices: initialPrices,
      checkedItems: initialChecked,
      hiddenItems: initialHidden,
      manualItems: initialManualItems,
      stores: initialStores,
      pantryItems: initialPantryItems,
    });
    if (initialStores.length === 0) {
      useMealStore.getState().fetchStores();
    }
    useMealStore.getState().fetchTemplates();
  }, [initialRecipes, initialWeek, initialRecurring, initialPrices, initialChecked, initialStores, initialPantryItems]);

  const dismissToast = () => {
    setToastMsg('');
    setToastAction(null);
  };

  const showToast = (msg: string, opts?: { action?: { label: string; onClick: () => void } }) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    const action = opts?.action
      ? { label: opts.action.label, onClick: () => { opts.action!.onClick(); dismissToast(); } }
      : null;
    setToastAction(action);
    toastTimer.current = setTimeout(dismissToast, action ? 5500 : 2500);
  };

  const shoppingList = buildShoppingList(store.recipes, store.dayMeals, store.recurring, store.pantryItems);
  const estTotal = calcTotal(shoppingList, store.prices);

  const handleClearChecked = async () => {
    const { checkedItems, manualItems } = store;
    for (const item of manualItems) {
      if (checkedItems[`m:${item.id}`]) await store.deleteManualItem(item.id);
    }
    for (const key of Object.keys(checkedItems)) {
      if (checkedItems[key] && !key.startsWith('m:')) await store.hideItem(key);
    }
    await store.resetChecked();
  };

  const handleCopyList = (txt: string) => {
    navigator.clipboard.writeText(txt).then(() => showToast('Copied! 📋')).catch(() => showToast('Copy failed'));
  };

  return (
    <div className="app">
      <InstallBanner />
      <Header total={estTotal} />
      <TabBar active={store.activeTab} onChange={store.setActiveTab} />

      <div className="scroll">
        {store.activeTab === 'plan' && (
        <div className="tabPane">
          <TabHint tabKey="plan" icon={<CalendarDays size={16} strokeWidth={2} />} message="Tap any day to assign a meal — the grocery list updates automatically" />
          <WeekView
            recipes={store.recipes}
            dayMeals={store.dayMeals}
            recurring={store.recurring}
            weekOffset={store.weekOffset}
            loading={store.weekLoading}
            templates={store.templates}
            onShiftWeek={store.setWeekOffset}
            onOpenDay={(key, idx) => {
              setEditDayKey(key);
              setEditDayIdx(idx);
              const dayHasMeals = store.dayMeals.some((m) => m.dayKey === key);
              if (!dayHasMeals) {
                if (store.recipes.length === 0) {
                  store.setActiveTab('recipes');
                  showToast('Add some recipes first, then come back to plan your week');
                  return;
                }
                setPickerIsQuickAdd(true);
                setPickerForMealId(null);
                setPickerOpen(true);
              } else {
                setPickerIsQuickAdd(false);
                setDayModalOpen(true);
              }
            }}
            onGoToRecipes={() => store.setActiveTab('recipes')}
            onViewRecipe={(recipeId, dayMealId, dayKey, dayIdx) => {
              setViewerRecipeId(recipeId);
              setViewerDayMealId(dayMealId);
              setViewerDayKey(dayKey);
              setViewerDayIdx(dayIdx);
              setViewerOpen(true);
            }}
            onOpenRecurring={(key) => {
              setEditRecurKey(key);
              setPickerForMealId(null);
              setPickerOpen(true);
            }}
            onCopyWeek={async (fromWeekYear, fromWeekNum) => {
              await store.copyWeek(fromWeekYear, fromWeekNum);
              showToast('Week copied');
            }}
            onAddRecurring={async (label) => {
              await store.addRecurring(label);
              showToast('Recurring meal added');
            }}
            onDeleteRecurring={(key) => store.deleteRecurring(key)}
            onRenameRecurring={(key, label) => store.renameRecurring(key, label)}
            onSaveTemplate={async (name) => {
              await store.saveTemplate(name);
              showToast('Template saved ✓');
            }}
            onApplyTemplate={async (id) => {
              await store.applyTemplate(id);
              showToast('Template applied');
            }}
            onDeleteTemplate={(id) => store.deleteTemplate(id)}
            onMarkCooked={async (dayMealId) => {
              await store.markMealCooked(dayMealId);
              showToast('Meal cooked ✓ Pantry updated');
            }}
            onUnmarkCooked={async (dayMealId) => {
              await store.unmarkMealCooked(dayMealId);
              showToast('Marked as not cooked');
            }}
          />
        </div>
        )}

        {store.activeTab === 'recipes' && (
        <div className="tabPane">
          <TabHint tabKey="recipes" icon={<BookOpen size={16} strokeWidth={2} />} message="Paste a URL, snap a photo, or type a recipe — ingredients import automatically" />
          <RecipesView
            recipes={store.recipes}
            prices={store.prices}
            onView={(id) => {
              setViewerRecipeId(id);
              setViewerDayMealId(null);
              setViewerDayKey(null);
              setViewerOpen(true);
            }}
            onOpenEditor={(id) => {
              setEditRecipeId(id);
              setRecipeModalOpen(true);
            }}
          />
        </div>
        )}

        {store.activeTab === 'pantry' && (
        <div className="tabPane">
          <TabHint tabKey="pantry" icon={<Package size={16} strokeWidth={2} />} message="Items stocked here are automatically skipped in your shopping list" />
          <PantryView
            pantryItems={store.pantryItems}
            recipes={store.recipes}
            onAddItem={(name, qty, unit) => store.addToPantry(name, qty, unit)}
            onUpdateQty={(name, qty, unit) => store.updatePantryQty(name, qty, unit)}
            onRemoveItem={(name) => store.removePantryItem(name)}
          />
        </div>
        )}

        {store.activeTab === 'shop' && (
        <div className="tabPane">
          <TabHint tabKey="shop" icon={<ShoppingCart size={16} strokeWidth={2} />} message="Tap any ingredient to set its price and track your weekly spend" />
          <ShopView
            shoppingList={shoppingList}
            checkedItems={store.checkedItems}
            hiddenItems={store.hiddenItems}
            prices={store.prices}
            estimatedPrices={store.estimatedPrices}
            qtyOverrides={store.qtyOverrides}
            manualItems={store.manualItems}
            stores={store.stores}
            onToggleCheck={store.toggleCheck}
            onResetChecked={store.resetChecked}
            onClearChecked={handleClearChecked}
            onCopy={handleCopyList}
            onOpenPrice={(key, name, amt, qty, unit) => {
              setPriceItemKey(key);
              setPriceItemName(name);
              setPriceItemAmt(amt);
              setPriceItemQty(qty);
              setPriceItemUnit(unit);
              setPriceModalOpen(true);
            }}
            onAddManualItem={store.addManualItem}
            onDeleteManualItem={store.deleteManualItem}
            onSetQtyOverride={(itemKey, qty) => store.setQtyOverride(itemKey, qty)}
            onHideItem={store.hideItem}
            onRestoreHidden={store.restoreHiddenItems}
            onAddStore={store.addStore}
            onDeleteStore={store.deleteStore}
            onUpdateIngredientStore={store.updateIngredientStore}
            onEstimatePrices={async () => {
              try {
                await store.estimatePrices(shoppingList);
                showToast('Prices estimated ✓');
              } catch {
                showToast('Could not estimate prices — try again');
              }
            }}
          />
        </div>
        )}
      </div>

      <RecipeViewerModal
        open={viewerOpen}
        recipe={store.recipes.find((r) => r.id === viewerRecipeId) || null}
        guests={store.dayMeals.find((m) => m.id === viewerDayMealId)?.guests ?? undefined}
        dayMealId={viewerDayMealId}
        cookedAt={store.dayMeals.find((m) => m.id === viewerDayMealId)?.cookedAt}
        onClose={() => setViewerOpen(false)}
        onEditDay={viewerDayKey ? () => {
          setViewerOpen(false);
          setEditDayKey(viewerDayKey);
          setEditDayIdx(viewerDayIdx);
          setDayModalOpen(true);
        } : undefined}
        onEditRecipe={() => {
          setViewerOpen(false);
          setEditRecipeId(viewerRecipeId);
          setRecipeModalOpen(true);
        }}
        onMarkCooked={viewerDayMealId ? async () => {
          await store.markMealCooked(viewerDayMealId);
          showToast('Meal cooked ✓ Pantry updated');
        } : undefined}
      />

      <DayModal
        open={dayModalOpen}
        dayKey={editDayKey}
        dayIdx={editDayIdx}
        weekOffset={store.weekOffset}
        dayMeals={store.dayMeals.filter((m) => m.dayKey === editDayKey)}
        recipes={store.recipes}
        onClose={() => setDayModalOpen(false)}
        onOpenPicker={(mealId) => {
          setPickerForMealId(mealId);
          setPickerOpen(true);
        }}
        onToggleInShopping={(added, undo) => {
          showToast(added ? 'Added to grocery list' : 'Removed from grocery list', {
            action: { label: 'Undo', onClick: undo },
          });
        }}
        onDeleteMeal={(cancel) => {
          showToast('Meal deleted', { action: { label: 'Undo', onClick: cancel } });
        }}
      />

      <RecipePickerModal
        open={pickerOpen}
        recipes={store.recipes}
        showMealConfig={pickerIsQuickAdd}
        onClose={() => {
          setPickerOpen(false);
          setPickerForMealId(null);
          setPickerIsQuickAdd(false);
          setEditRecurKey(null);
        }}
        onSelect={async (id, servings, mealType, includeInShopping) => {
          if (pickerForMealId) {
            const dmr = await store.addRecipeToDayMeal(pickerForMealId, id);
            store.updateDayMeal(pickerForMealId, { guests: servings });
            if (!includeInShopping) store.updateDayMealRecipe(pickerForMealId, dmr.id, { includeInShopping: false });
            showToast('Recipe added ✓');
          } else if (editRecurKey) {
            store.saveRecurring(editRecurKey, id);
            showToast('Updated ✓');
          } else if (pickerIsQuickAdd) {
            const meal = await store.addDayMeal(editDayKey, mealType);
            const dmr = await store.addRecipeToDayMeal(meal.id, id);
            if (servings !== BASE_GUESTS) store.updateDayMeal(meal.id, { guests: servings });
            if (!includeInShopping) store.updateDayMealRecipe(meal.id, dmr.id, { includeInShopping: false });
            showToast('Added to plan ✓');
          }
          setPickerOpen(false);
          setPickerForMealId(null);
          setPickerIsQuickAdd(false);
          setEditRecurKey(null);
        }}
      />

      <RecipeEditorModal
        open={recipeModalOpen}
        recipe={store.recipes.find((r) => r.id === editRecipeId) || null}
        stores={store.stores}
        onClose={() => setRecipeModalOpen(false)}
        onSave={async (r) => {
          try {
            await store.saveRecipe(r);
            setRecipeModalOpen(false);
            showToast(editRecipeId ? 'Recipe updated ✓' : 'Recipe added ✓');
          } catch {
            showToast('Failed to save recipe');
          }
        }}
        onDelete={async (id) => {
          const cancel = await store.deleteRecipe(id);
          setRecipeModalOpen(false);
          showToast('Recipe deleted', { action: { label: 'Undo', onClick: cancel } });
        }}
        onDuplicate={async (r) => {
          try {
            await store.saveRecipe(r);
            setRecipeModalOpen(false);
            showToast('Recipe duplicated');
          } catch {
            showToast('Failed to duplicate recipe');
          }
        }}
      />

      <PriceModal
        open={priceModalOpen}
        itemKey={priceItemKey}
        name={priceItemName}
        amt={priceItemAmt}
        qty={priceItemQty}
        unit={priceItemUnit}
        currentPrice={store.prices[priceItemKey] || 0}
        isEstimated={!!store.estimatedPrices[priceItemKey]}
        onClose={() => setPriceModalOpen(false)}
        onSave={(key, p) => {
          store.savePrice(key, p);
          setPriceModalOpen(false);
          showToast('Price saved ✓');
        }}
      />

      <Toast
        visible={!!toastMsg}
        message={toastMsg}
        action={toastAction ?? undefined}
      />

      <OnboardingModal
        open={showOnboarding}
        onDone={() => {
          localStorage.setItem('tonight_onboarded', '1');
          setShowOnboarding(false);
        }}
      />
    </div>
  );
}
