'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header/Header';
import TabBar from '@/components/TabBar/TabBar';
import BottomNav from '@/components/BottomNav/BottomNav';
import WeekView from '@/components/WeekView/WeekView';
import RecipesView from '@/components/RecipesView/RecipesView';
import ShopView from '@/components/ShopView/ShopView';
import DayModal from '@/components/DayModal/DayModal';
import RecipePickerModal from '@/components/RecipePickerModal/RecipePickerModal';
import RecipeEditorModal from '@/components/RecipeEditorModal/RecipeEditorModal';
import PriceModal from '@/components/PriceModal/PriceModal';
import Toast from '@/components/Toast/Toast';

import { useMealStore } from '@/store/useMealStore';
import { buildShoppingList, calcTotal } from '@/lib/helpers';
import type { Recipe, WeekEntry, RecurringMeal } from '@/types';

interface Props {
  initialRecipes: Recipe[];
  initialWeek: WeekEntry[];
  initialRecurring: RecurringMeal[];
  initialPrices: Record<string, number>;
  initialChecked: Record<string, boolean>;
}

export default function MealPlannerApp({
  initialRecipes, initialWeek, initialRecurring, initialPrices, initialChecked
}: Props) {
  const store = useMealStore();
  const [toastMsg, setToastMsg] = useState('');

  // Modals state
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [editDayKey, setEditDayKey] = useState<string>('Mon');
  const [editDayIdx, setEditDayIdx] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'day' | 'recurring'>('day');
  const [editRecurKey, setEditRecurKey] = useState<string | null>(null);
  
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [editRecipeId, setEditRecipeId] = useState<string | null>(null);
  
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [priceItemKey, setPriceItemKey] = useState('');
  const [priceItemName, setPriceItemName] = useState('');
  const [priceItemAmt, setPriceItemAmt] = useState('');

  // Draft picked recipe for day modal
  const [pickedRecipeId, setPickedRecipeId] = useState<string | null>(null);

  // Hydrate store exactly once on mount
  useEffect(() => {
    useMealStore.getState().setInitialData({
      recipes: initialRecipes,
      weekEntries: initialWeek,
      recurring: initialRecurring,
      prices: initialPrices,
      checkedItems: initialChecked,
    });
  }, [initialRecipes, initialWeek, initialRecurring, initialPrices, initialChecked]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  };

  const shoppingList = buildShoppingList(store.recipes, store.weekEntries, store.recurring);
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
            weekEntries={store.weekEntries}
            recurring={store.recurring}
            weekOffset={store.weekOffset}
            onShiftWeek={store.setWeekOffset}
            onOpenDay={(key, idx) => {
              setEditDayKey(key);
              setEditDayIdx(idx);
              const e = store.weekEntries.find((we) => we.dayKey === key);
              setPickedRecipeId(e?.type === 'meal' ? (e.recipeId || null) : null);
              setDayModalOpen(true);
            }}
            onOpenRecurring={(key) => {
              setEditRecurKey(key);
              setPickerTarget('recurring');
              setPickerOpen(true);
            }}
          />
        </div>

        <div style={{ display: store.activeTab === 'recipes' ? 'block' : 'none' }}>
          <RecipesView
            recipes={store.recipes}
            prices={store.prices}
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
            onToggleCheck={store.toggleCheck}
            onResetChecked={store.resetChecked}
            onCopy={handleCopyList}
            onOpenPrice={(key, name, amt) => {
              setPriceItemKey(key);
              setPriceItemName(name);
              setPriceItemAmt(amt);
              setPriceModalOpen(true);
            }}
          />
        </div>
      </div>

      <BottomNav active={store.activeTab} onChange={store.setActiveTab} />

      {/* Modals */}
      <DayModal
        open={dayModalOpen}
        dayKey={editDayKey}
        dayIdx={editDayIdx}
        weekOffset={store.weekOffset}
        entry={store.weekEntries.find((e) => e.dayKey === editDayKey) || null}
        recipes={store.recipes}
        pickedRecipeId={pickedRecipeId}
        setPickedRecipeId={setPickedRecipeId}
        onClose={() => setDayModalOpen(false)}
        onSave={(e) => {
          store.saveDay(editDayKey, e);
          setDayModalOpen(false);
          showToast('Saved ✓');
        }}
        onClear={() => {
          store.saveDay(editDayKey, { type: 'empty', recipeId: null, guests: null, note: null });
          setDayModalOpen(false);
          showToast('Cleared');
        }}
        onOpenPicker={() => {
          setPickerTarget('day');
          setPickerOpen(true);
        }}
      />

      <RecipePickerModal
        open={pickerOpen}
        recipes={store.recipes}
        onClose={() => setPickerOpen(false)}
        onSelect={(id) => {
          if (pickerTarget === 'day') {
            setPickedRecipeId(id);
          } else if (pickerTarget === 'recurring' && editRecurKey) {
            store.saveRecurring(editRecurKey, id);
            showToast('Updated ✓');
          }
        }}
      />

      <RecipeEditorModal
        open={recipeModalOpen}
        recipe={store.recipes.find((r) => r.id === editRecipeId) || null}
        onClose={() => setRecipeModalOpen(false)}
        onSave={(r) => {
          store.saveRecipe(r);
          setRecipeModalOpen(false);
          showToast(editRecipeId ? 'Recipe updated ✓' : 'Recipe added ✓');
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

      <Toast visible={!!toastMsg} message={toastMsg} />
    </div>
  );
}
