'use client';

import { ChevronLeft, ChevronRight, ChevronRight as Caret, Plus, UtensilsCrossed } from 'lucide-react';
import type { Recipe, DayMeal, RecurringMeal } from '@/types';
import { DAY_KEYS, REC_COLORS, getWeekDates, isToday } from '@/lib/helpers';
import styles from './WeekView.module.css';

interface Props {
  recipes: Recipe[];
  dayMeals: DayMeal[];
  recurring: RecurringMeal[];
  weekOffset: number;
  loading?: boolean;
  onShiftWeek: (dir: number) => void;
  onOpenDay: (key: string, idx: number) => void;
  onViewRecipe: (recipeId: string, dayMealId: string, dayKey: string, dayIdx: number) => void;
  onOpenRecurring: (key: string) => void;
}

const DAY_ABBR: Record<string, string> = {
  Mon: 'MON', Tue: 'TUE', Wed: 'WED', Thu: 'THU', Fri: 'FRI', Sat: 'SAT', Sun: 'SUN',
};

export default function WeekView({
  recipes, dayMeals, recurring, weekOffset, loading = false,
  onShiftWeek, onOpenDay, onViewRecipe, onOpenRecurring,
}: Props) {
  const dates = getWeekDates(weekOffset);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const weekRange = `${fmt(dates[0])} – ${fmt(dates[6])}`;
  const weekContext =
    weekOffset === 0 ? 'This week' :
    weekOffset === -1 ? 'Last week' :
    weekOffset === 1 ? 'Next week' : '';

  const mealMap: Record<string, DayMeal[]> = {};
  dayMeals.forEach((m) => {
    if (!mealMap[m.dayKey]) mealMap[m.dayKey] = [];
    mealMap[m.dayKey].push(m);
  });

  return (
    <div className={styles.view}>
      <div className={styles.weekNav}>
        <div>
          <div className={styles.weekLabel}>{weekRange}</div>
          {weekContext && <div className={styles.weekBadge}>{weekContext}</div>}
        </div>
        <div className={styles.navBtns}>
          <button className={styles.wkBtn} aria-label="Previous week" onClick={() => onShiftWeek(-1)}>
            <ChevronLeft size={18} strokeWidth={2.25} />
          </button>
          <button className={styles.wkBtn} aria-label="Next week" onClick={() => onShiftWeek(1)}>
            <ChevronRight size={18} strokeWidth={2.25} />
          </button>
        </div>
      </div>

      <div className={styles.overview}>
        {DAY_KEYS.map((key, i) => {
          const d = dates[i];
          const today = isToday(d);
          const meals = mealMap[key] ?? [];
          const firstRecipeId = meals.flatMap((m) => m.recipes)[0]?.recipeId;
          const firstRecipe = firstRecipeId ? recipes.find((r) => r.id === firstRecipeId) : null;
          return (
            <button
              key={key}
              className={`${styles.ovDay} ${today ? styles.ovToday : ''}`}
              onClick={() => onOpenDay(key, i)}
              aria-label={`${key} ${d.getDate()}`}
            >
              <span className={styles.ovLetter}>{key[0]}</span>
              <span
                className={styles.ovDot}
                style={firstRecipe ? { background: firstRecipe.color, borderColor: firstRecipe.color } : undefined}
              />
            </button>
          );
        })}
      </div>

      <div className={styles.cal}>
        {DAY_KEYS.map((key, i) => {
          const d = dates[i];
          const today = isToday(d);

          if (loading) {
            return (
              <div key={key} className={`${styles.dayRow} ${today ? styles.today : ''}`}>
                <div className={styles.dayBadge}>
                  <div className={styles.dayAbbr}>{DAY_ABBR[key]}</div>
                  <div className={styles.dayNum}>{d.getDate()}</div>
                </div>
                <div className={styles.dayContent}>
                  <div className={styles.skelEmoji} />
                  <div className={styles.skelBody}>
                    <div className={styles.skelLine} style={{ width: '55%' }} />
                    <div className={styles.skelLine} style={{ width: '35%' }} />
                  </div>
                </div>
              </div>
            );
          }

          const meals = mealMap[key] ?? [];
          const firstColor = meals
            .flatMap((m) => m.recipes)
            .map((dmr) => recipes.find((r) => r.id === dmr.recipeId)?.color)
            .find(Boolean);

          return (
            <div
              key={key}
              className={`${styles.dayRow} ${today ? styles.today : ''}`}
              onClick={() => onOpenDay(key, i)}
            >
              <div className={styles.dayBadge}>
                <div className={styles.dayAbbr}>{DAY_ABBR[key]}</div>
                <div className={styles.dayNum}>{d.getDate()}</div>
              </div>

              <div className={styles.dayContent}>
                {meals.length > 0 ? (
                  <>
                    {firstColor && <div className={styles.dayAccent} style={{ background: firstColor }} />}
                    <div className={styles.slotsBody}>
                      {meals.map((meal) => {
                        const mealRecipes = meal.recipes
                          .map((dmr) => recipes.find((r) => r.id === dmr.recipeId))
                          .filter((r): r is Recipe => !!r);
                        return (
                          <div key={meal.id} className={styles.slotRow}>
                            <span className={styles.slotLabel}>{meal.name}</span>
                            <div className={styles.slotChips}>
                              {mealRecipes.map((r) => (
                                <span
                                  key={r.id}
                                  className={styles.slotChip}
                                  style={{ background: `${r.color}1a` }}
                                  onClick={(e) => { e.stopPropagation(); onViewRecipe(r.id, meal.id, key, i); }}
                                  title={r.name}
                                >{r.emoji}</span>
                              ))}
                              {mealRecipes.length === 0 && (
                                <span className={styles.slotNoRecipe}>No recipe</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <Caret className={styles.arrow} size={18} strokeWidth={2} />
                  </>
                ) : (
                  <div className={styles.emptyBody}>
                    <div className={styles.plusCircle}><Plus size={16} strokeWidth={2.5} /></div>
                    <span className={styles.emptyLbl}>Plan your day</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.sectionLbl}>Recurring this week</div>
      {recurring.map((r) => {
        const recipe = r.recipeId ? recipes.find((rec) => rec.id === r.recipeId) : null;
        const col = REC_COLORS[r.key] ?? '#888';
        return (
          <div key={r.key} className={styles.recCard} onClick={() => onOpenRecurring(r.key)}>
            <div className={styles.recEmoji} style={{ background: `${col}1a` }}>
              {recipe?.emoji ?? <UtensilsCrossed size={22} strokeWidth={1.75} style={{ color: col }} />}
            </div>
            <div className={styles.recInfo}>
              <div className={styles.recType} style={{ color: col }}>{r.label}</div>
              <div className={styles.recName}>{recipe?.name ?? 'Not set'}</div>
              {recipe?.sub && <div className={styles.recSub}>{recipe.sub}</div>}
            </div>
            <Caret className={styles.recArrow} size={18} strokeWidth={2} />
          </div>
        );
      })}
    </div>
  );
}
