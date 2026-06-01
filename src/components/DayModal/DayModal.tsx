'use client';

import { useState, useEffect } from 'react';
import { Plus, Minus, Trash2, ShoppingCart, X } from 'lucide-react';
import Modal from '@/components/Modal/Modal';
import { useMealStore } from '@/store/useMealStore';
import type { Recipe, DayMeal } from '@/types';
import { DAY_FULL, BASE_GUESTS, getWeekDates } from '@/lib/helpers';
import styles from './DayModal.module.css';

interface Props {
  open: boolean;
  dayKey: string;
  dayIdx: number;
  weekOffset: number;
  dayMeals: DayMeal[];
  recipes: Recipe[];
  onClose: () => void;
  onOpenPicker: (dayMealId: string) => void;
  onToggleInShopping?: (added: boolean, undo: () => void) => void;
}

export default function DayModal({
  open, dayKey, dayIdx, weekOffset, dayMeals, recipes, onClose, onOpenPicker, onToggleInShopping,
}: Props) {
  const store = useMealStore();
  const dates = getWeekDates(weekOffset);
  const d = dates[dayIdx] ?? new Date();

  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const [addingMeal, setAddingMeal] = useState(false);
  const [newMealName, setNewMealName] = useState('');

  useEffect(() => {
    if (!open) {
      setDraftNames({});
      setAddingMeal(false);
      setNewMealName('');
    }
  }, [open]);

  function getDraftName(meal: DayMeal) {
    return draftNames[meal.id] ?? meal.name;
  }

  function handleNameBlur(meal: DayMeal) {
    const name = (draftNames[meal.id] ?? meal.name).trim() || meal.name;
    if (name !== meal.name) store.updateDayMeal(meal.id, { name });
  }

  function handleAddMeal() {
    const name = newMealName.trim();
    if (!name) return;
    store.addDayMeal(dayKey, name);
    setNewMealName('');
    setAddingMeal(false);
  }

  return (
    <Modal open={open} onBackdropClick={onClose}>
      <div className={styles.title}>{DAY_FULL[dayIdx] ?? dayKey}</div>
      <div className={styles.date}>
        {d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </div>

      <div className={styles.mealList}>
        {dayMeals.length === 0 && !addingMeal && (
          <div className={styles.emptyDay}>
            No meals planned yet. Add one below.
          </div>
        )}

        {dayMeals.map((meal) => (
          <div key={meal.id} className={styles.mealSlot}>
            <div className={styles.slotHead}>
              <input
                className={styles.slotNameInput}
                value={getDraftName(meal)}
                onChange={(e) => setDraftNames((prev) => ({ ...prev, [meal.id]: e.target.value }))}
                onBlur={() => handleNameBlur(meal)}
                placeholder="Meal name"
              />
              <button
                className={styles.deleteSlotBtn}
                onClick={() => store.deleteDayMeal(meal.id)}
                aria-label="Delete meal"
              >
                <Trash2 size={15} strokeWidth={2} />
              </button>
            </div>

            <div className={styles.slotRecipes}>
              {meal.recipes.map((dmr) => {
                const recipe = recipes.find((r) => r.id === dmr.recipeId);
                if (!recipe) return null;
                return (
                  <div key={dmr.id} className={styles.recipePill}>
                    <span className={styles.pillEmoji} style={{ background: `${recipe.color}1a` }}>{recipe.emoji}</span>
                    <span className={styles.pillName}>{recipe.name}</span>
                    <button
                      className={`${styles.pillShop} ${dmr.includeInShopping ? styles.shopOn : ''}`}
                      onClick={() => {
                        const wasIncluded = dmr.includeInShopping;
                        const mealId = meal.id;
                        const dmrId = dmr.id;
                        store.updateDayMealRecipe(mealId, dmrId, { includeInShopping: !wasIncluded });
                        onToggleInShopping?.(!wasIncluded, () => {
                          store.updateDayMealRecipe(mealId, dmrId, { includeInShopping: wasIncluded });
                        });
                      }}
                      aria-label={dmr.includeInShopping ? 'Remove from shopping list' : 'Add to shopping list'}
                      title={dmr.includeInShopping ? 'In grocery list' : 'Not in grocery list'}
                    >
                      <ShoppingCart size={12} strokeWidth={2} />
                    </button>
                    <button
                      className={styles.pillRemove}
                      onClick={() => store.removeRecipeFromDayMeal(meal.id, dmr.id)}
                      aria-label="Remove recipe"
                    >
                      <X size={14} strokeWidth={2.5} />
                    </button>
                  </div>
                );
              })}
            </div>

            <button className={styles.addRecipeBtn} onClick={() => onOpenPicker(meal.id)}>
              <Plus size={14} strokeWidth={2.5} /> Add recipe
            </button>

            <div className={styles.guestRow}>
              <div>
                <div className={styles.grLbl}>Guests</div>
                <div className={styles.grSub}>Scales ingredient quantities</div>
              </div>
              <div className={styles.gsCtl}>
                <button
                  className={styles.gsBtn}
                  onClick={() => store.updateDayMeal(meal.id, { guests: Math.max(1, (meal.guests ?? BASE_GUESTS) - 1) })}
                  aria-label="Fewer guests"
                >
                  <Minus size={16} strokeWidth={2.5} />
                </button>
                <span className={styles.gsNum}>{meal.guests ?? BASE_GUESTS}</span>
                <button
                  className={styles.gsBtn}
                  onClick={() => store.updateDayMeal(meal.id, { guests: Math.min(20, (meal.guests ?? BASE_GUESTS) + 1) })}
                  aria-label="More guests"
                >
                  <Plus size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {addingMeal ? (
        <div className={styles.addMealForm}>
          <input
            className={styles.addMealInput}
            placeholder="e.g. Breakfast, Dinner, Late snack…"
            value={newMealName}
            onChange={(e) => setNewMealName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddMeal();
              if (e.key === 'Escape') { setAddingMeal(false); setNewMealName(''); }
            }}
            autoFocus
          />
          <div className={styles.addMealActions}>
            <button className={styles.btnSec} onClick={() => { setAddingMeal(false); setNewMealName(''); }}>Cancel</button>
            <button className={styles.btnPri} onClick={handleAddMeal} disabled={!newMealName.trim()}>Add</button>
          </div>
        </div>
      ) : (
        <button className={styles.addMealTrigger} onClick={() => setAddingMeal(true)}>
          <Plus size={16} strokeWidth={2.5} /> Add a meal
        </button>
      )}

      <div className={styles.actions}>
        <button className={styles.btnPri} onClick={onClose}>Done</button>
      </div>
    </Modal>
  );
}
