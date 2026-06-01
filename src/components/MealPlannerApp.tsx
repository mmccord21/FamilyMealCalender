'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '@/components/Header/Header';
import TabBar from '@/components/TabBar/TabBar';
import WeekView from '@/components/WeekView/WeekView';
import RecipesView from '@/components/RecipesView/RecipesView';
import ShopView from '@/components/ShopView/ShopView';
import DayModal from '@/components/DayModal/DayModal';
import RecipePickerModal from '@/components/RecipePickerModal/RecipePickerModal';
import RecipeEditorModal from '@/components/RecipeEditorModal/RecipeEditorModal';
import RecipeViewerModal from '@/components/RecipeViewerModal/RecipeViewerModal';
import PriceModal from '@/components/PriceModal/PriceModal';
import Toast from '@/components/Toast/Toast';

import { useMealStore } from '@/store/useMealStore';
import { buildShoppingList, calcTotal, BASE_GUESTS } from '@/lib/helpers';
import type { Recipe, DayMeal, RecurringMeal, ManualShoppingItem } from '@/types';

interface Props {
  initialRecipes: Recipe[];
  initialWeek: DayMeal[];
  initialRecurring: RecurringMeal[];
  initialPrices: Record<string, number>;
  initialChecked: Record<string, boolean>;
  initialManualItems: ManualShoppingItem[];
}

export default function MealPlannerApp({
  initialRecipes, initialWeek, initialRecurring, initialPrices, initialChecked, initialManualItems
}: Props) {
  const store = useMealStore();
  const [toastMsg, setToastMsg] = useState('');
  const [toastUndo, setToastUndo] = useState<(() => void) | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [editDayKey, setEditDayKey] = useState<string>('Mon');
  const [editDayIdx, setEditDayIdx] = useState(0);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerForMealId, setPickerForMealId] = useState<string | null>(null);
  const [editRecurKey, setEditRecurKey] = useState<string | null>(null);

  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [editRecipeId, setEditRecipeId] = useState<string | null>(null);

  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerRecipeId, setViewerRecipeId] = useState<string | null>(null);
  const [viewerDayMealId, setViewerDayMealId] = useState<string | null>(null);
  const [viewerDayKey, setViewerDayKey] = useState<string | null>(null);
  const [viewerDayIdx, setViewerDayIdx] = useState(0);

  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [priceItemKey, setPriceItemKey] = useState('');
  const [priceItemName, setPriceItemName] = useState('');
  const [priceItemAmt, setPriceItemAmt] = useState('');

  useEffect(() => {
    useMealStore.getState().setInitialData({
      recipes: initialRecipes,
      dayMeals: initialWeek,
      recurring: initialRecurring,
      prices: initialPrices,
      checkedItems: initialChecked,
      manualItems: initialManualItems,
    });
  }, [initialRecipes, initialWeek, initialRecurring, initialPrices, initialChecked]);

  const dismissToast = () => {
    setToastMsg('');
    setToastUndo(null);
  };

  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    setToastUndo(null);
    toastTimer.current = setTimeout(dismissToast, 2500);
  };

  const showToastWithUndo = (msg: string, undo: () => void) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    setToastUndo(() => undo);
    toastTimer.current = setTimeout(dismissToast, 4000);
  };

  const shoppingList = buildShoppingList(store.recipes, store.dayMeals, store.recurring);
  const estTotal = calcTotal(shoppingList, store.prices);

  const handleCopyList = (txt: string) => {
    navigator.clipboard.writeText(txt).then(() => showToast('Copied! 📋')).catch(() => showToast('Copy failed'));
  };

  return (
    <div className="app">
      <Header total={estTotal} />
      <TabBar active={store.activeTab} onChange={store.setActiveTab} />

      <div className="scroll">
        <div style={{ display: store.activeTab === 'plan' ? 'block' : 'none' }}>
          <WeekView
            recipes={store.recipes}
            dayMeals={store.dayMeals}
            recurring={store.recurring}
            weekOffset={store.weekOffset}
            loading={store.weekLoading}
            onShiftWeek={store.setWeekOffset}
            onOpenDay={(key, idx) => {
              setEditDayKey(key);
              setEditDayIdx(idx);
              setDayModalOpen(true);
            }}
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
          />
        </div>

        <div style={{ display: store.activeTab === 'recipes' ? 'block' : 'none' }}>
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

        <div style={{ display: store.activeTab === 'shop' ? 'block' : 'none' }}>
          <ShopView
            shoppingList={shoppingList}
            checkedItems={store.checkedItems}
            prices={store.prices}
            manualItems={store.manualItems}
            onToggleCheck={store.toggleCheck}
            onResetChecked={store.resetChecked}
            onCopy={handleCopyList}
            onOpenPrice={(key, name, amt) => {
              setPriceItemKey(key);
              setPriceItemName(name);
              setPriceItemAmt(amt);
              setPriceModalOpen(true);
            }}
            onAddManualItem={store.addManualItem}
            onDeleteManualItem={store.deleteManualItem}
          />
        </div>
      </div>

      <RecipeViewerModal
        open={viewerOpen}
        recipe={store.recipes.find((r) => r.id === viewerRecipeId) || null}
        guests={store.dayMeals.find((m) => m.id === viewerDayMealId)?.guests ?? BASE_GUESTS}
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
          showToastWithUndo(added ? 'Added to grocery list' : 'Removed from grocery list', undo);
        }}
      />

      <RecipePickerModal
        open={pickerOpen}
        recipes={store.recipes}
        onClose={() => {
          setPickerOpen(false);
          setPickerForMealId(null);
        }}
        onSelect={(id) => {
          if (pickerForMealId) {
            store.addRecipeToDayMeal(pickerForMealId, id);
            showToast('Recipe added ✓');
          } else if (editRecurKey) {
            store.saveRecurring(editRecurKey, id);
            showToast('Updated ✓');
          }
          setPickerOpen(false);
          setPickerForMealId(null);
        }}
      />

      <RecipeEditorModal
        open={recipeModalOpen}
        recipe={store.recipes.find((r) => r.id === editRecipeId) || null}
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
        onDelete={(id) => {
          store.deleteRecipe(id);
          setRecipeModalOpen(false);
          showToast('Recipe deleted');
        }}
      />

      <PriceModal
        open={priceModalOpen}
        itemKey={priceItemKey}
        name={priceItemName}
        amt={priceItemAmt}
        currentPrice={store.prices[priceItemKey] || 0}
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
        onUndo={toastUndo ? () => { toastUndo(); dismissToast(); } : undefined}
      />
    </div>
  );
}
