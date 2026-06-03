'use client';

import { useState, useEffect, useMemo } from 'react';
import { Plus, Minus, Trash2, ShoppingCart, X, GripVertical, BookOpen, UtensilsCrossed } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  onDeleteMeal?: (cancel: () => void) => void;
}

interface SortableMealRowProps {
  meal: DayMeal;
  recipes: Recipe[];
  draftNames: Record<string, string>;
  setDraftNames: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onNameBlur: (meal: DayMeal) => void;
  onOpenPicker: (dayMealId: string) => void;
  onToggleInShopping?: (added: boolean, undo: () => void) => void;
  onDeleteMeal?: (cancel: () => void) => void;
}

function SortableMealRow({
  meal, recipes, draftNames, setDraftNames, onNameBlur, onOpenPicker, onToggleInShopping, onDeleteMeal,
}: SortableMealRowProps) {
  const store = useMealStore();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: meal.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`${styles.mealSlot} ${isDragging ? styles.dragging : ''}`}
    >
      <div className={styles.slotHead}>
        <button className={styles.dragHandle} {...listeners} {...attributes} aria-label="Drag to reorder">
          <GripVertical size={16} strokeWidth={2} />
        </button>
        <input
          className={styles.slotNameInput}
          value={draftNames[meal.id] ?? meal.name}
          onChange={(e) => setDraftNames((prev) => ({ ...prev, [meal.id]: e.target.value }))}
          onBlur={() => onNameBlur(meal)}
          placeholder="Meal name"
        />
        <button
          className={styles.deleteSlotBtn}
          onClick={async () => {
            const cancel = await store.deleteDayMeal(meal.id);
            onDeleteMeal?.(cancel);
          }}
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
              <span className={styles.pillEmoji} style={{ background: `${recipe.color}1a` }}>
                {recipe.imageUrl
                  ? <img src={recipe.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 'inherit' }} />
                  : <UtensilsCrossed size={14} strokeWidth={1.75} style={{ color: recipe.color }} />}
              </span>
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
              >
                <ShoppingCart size={11} strokeWidth={2} />
                <span>{dmr.includeInShopping ? 'In list' : 'Add to list'}</span>
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
  );
}

export default function DayModal({
  open, dayKey, dayIdx, weekOffset, dayMeals, recipes, onClose, onOpenPicker, onToggleInShopping, onDeleteMeal,
}: Props) {
  const store = useMealStore();
  const dates = getWeekDates(weekOffset);
  const d = dates[dayIdx] ?? new Date();

  const [draftNames, setDraftNames] = useState<Record<string, string>>({});
  const [addingMeal, setAddingMeal] = useState(false);
  const [newMealName, setNewMealName] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const sortedMeals = useMemo(
    () => [...dayMeals].sort((a, b) => a.sortOrder - b.sortOrder),
    [dayMeals],
  );

  useEffect(() => {
    if (!open) {
      setDraftNames({});
      setAddingMeal(false);
      setNewMealName('');
    }
  }, [open]);

  function handleNameBlur(meal: DayMeal) {
    const name = (draftNames[meal.id] ?? meal.name).trim() || meal.name;
    if (name !== meal.name) store.updateDayMeal(meal.id, { name });
  }

  const MEAL_SUGGESTIONS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

  async function handleQuickPickRecipe() {
    const meal = await store.addDayMeal(dayKey, 'Dinner');
    onOpenPicker(meal.id);
  }

  function handleAddMeal() {
    const name = newMealName.trim();
    if (!name) return;
    store.addDayMeal(dayKey, name);
    setNewMealName('');
    setAddingMeal(false);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sortedMeals.findIndex((m) => m.id === active.id);
    const newIndex = sortedMeals.findIndex((m) => m.id === over.id);
    const reordered = arrayMove(sortedMeals, oldIndex, newIndex);

    reordered.forEach((meal, idx) => {
      if (meal.sortOrder !== idx) {
        store.updateDayMeal(meal.id, { sortOrder: idx });
      }
    });
  }

  return (
    <Modal open={open} onBackdropClick={onClose}>
      <div className={styles.title}>{DAY_FULL[dayIdx] ?? dayKey}</div>
      <div className={styles.date}>
        {d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </div>

      <div className={styles.mealList}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortedMeals.map((m) => m.id)} strategy={verticalListSortingStrategy}>
            {sortedMeals.map((meal) => (
              <SortableMealRow
                key={meal.id}
                meal={meal}
                recipes={recipes}
                draftNames={draftNames}
                setDraftNames={setDraftNames}
                onNameBlur={handleNameBlur}
                onOpenPicker={onOpenPicker}
                onToggleInShopping={onToggleInShopping}
                onDeleteMeal={onDeleteMeal}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {sortedMeals.length === 0 && !addingMeal ? (
        <div className={styles.emptyDayState}>
          <button className={styles.btnPickRecipe} onClick={handleQuickPickRecipe}>
            <BookOpen size={16} strokeWidth={2} />
            Pick a Recipe
          </button>
          <div className={styles.emptyOrDivider}>— or —</div>
          <button className={styles.btnSecondaryTxt} onClick={() => setAddingMeal(true)}>
            Name a meal slot manually
          </button>
        </div>
      ) : addingMeal ? (
        <div className={styles.addMealForm}>
          <div className={styles.mealSuggestions}>
            {MEAL_SUGGESTIONS.map((s) => (
              <button
                key={s}
                className={styles.mealSugChip}
                onClick={() => { store.addDayMeal(dayKey, s); setAddingMeal(false); }}
              >
                {s}
              </button>
            ))}
          </div>
          <div className={styles.addOrDivider}>— or type below —</div>
          <input
            className={styles.addMealInput}
            placeholder="e.g. Late snack, Post-workout…"
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
