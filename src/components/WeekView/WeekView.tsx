'use client';

import { ChevronLeft, ChevronRight, ChevronRight as Caret, Plus, StickyNote, Users, UtensilsCrossed } from 'lucide-react';
import type { Recipe, WeekEntry, RecurringMeal } from '@/types';
import { DAY_KEYS, REC_COLORS, TAG_COLORS, BASE_GUESTS, getWeekDates, isToday } from '@/lib/helpers';
import styles from './WeekView.module.css';

interface Props {
  recipes: Recipe[];
  weekEntries: WeekEntry[];
  recurring: RecurringMeal[];
  weekOffset: number;
  loading?: boolean;
  onShiftWeek: (dir: number) => void;
  onOpenDay: (key: string, idx: number) => void;
  onOpenRecurring: (key: string) => void;
}

const DAY_ABBR: Record<string, string> = {
  Mon: 'MON', Tue: 'TUE', Wed: 'WED', Thu: 'THU', Fri: 'FRI', Sat: 'SAT', Sun: 'SUN',
};

export default function WeekView({
  recipes, weekEntries, recurring, weekOffset, loading = false,
  onShiftWeek, onOpenDay, onOpenRecurring,
}: Props) {
  const dates = getWeekDates(weekOffset);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const weekRange = `${fmt(dates[0])} – ${fmt(dates[6])}`;
  const weekContext =
    weekOffset === 0 ? 'This week' :
    weekOffset === -1 ? 'Last week' :
    weekOffset === 1 ? 'Next week' : '';

  const entryMap: Record<string, WeekEntry> = {};
  weekEntries.forEach((e) => { entryMap[e.dayKey] = e; });

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
          const e = entryMap[key] ?? { type: 'empty', dayKey: key } as WeekEntry;
          const today = isToday(d);
          const recipe = e.type === 'meal' && e.recipeId ? recipes.find((r) => r.id === e.recipeId) : null;
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
                style={recipe ? { background: recipe.color, borderColor: recipe.color } : undefined}
                data-note={e.type === 'note' ? '' : undefined}
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

          const e = entryMap[key] ?? { type: 'empty', dayKey: key } as WeekEntry;
          const recipe = e.type === 'meal' && e.recipeId ? recipes.find((r) => r.id === e.recipeId) : null;

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
                {e.type === 'meal' && recipe ? (
                  <>
                    <div className={styles.dayAccent} style={{ background: recipe.color }} />
                    <div className={styles.mealBody}>
                      <div className={styles.mealTop}>
                        <span className={styles.mealEmoji} style={{ background: `${recipe.color}1a` }}>{recipe.emoji}</span>
                        <span className={styles.mealName}>{recipe.name}</span>
                      </div>
                      {recipe.sub && <div className={styles.mealSub}>{recipe.sub}</div>}
                      {(recipe.tags.length > 0 || (e.guests ?? BASE_GUESTS) !== BASE_GUESTS) && (
                        <div className={styles.mealTags}>
                          {recipe.tags.map((t) => {
                            const c = TAG_COLORS[t] ?? '#9B8B7B';
                            return (
                              <span key={t} className={styles.tag} style={{ color: c, background: `${c}1a` }}>{t}</span>
                            );
                          })}
                          {(e.guests ?? BASE_GUESTS) !== BASE_GUESTS && (
                            <span className={styles.guestsBadge}><Users size={11} strokeWidth={2.5} /> {e.guests}</span>
                          )}
                        </div>
                      )}
                    </div>
                    <Caret className={styles.arrow} size={18} strokeWidth={2} />
                  </>
                ) : e.type === 'note' ? (
                  <>
                    <span className={styles.noteTxt}>
                      <StickyNote size={14} strokeWidth={2} className={styles.noteIcon} />
                      {e.note}
                    </span>
                    <Caret className={styles.arrow} size={18} strokeWidth={2} />
                  </>
                ) : (
                  <div className={styles.emptyBody}>
                    <div className={styles.plusCircle}><Plus size={16} strokeWidth={2.5} /></div>
                    <span className={styles.emptyLbl}>Plan dinner</span>
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
