'use client';

import { useState, useCallback } from 'react';
import type { Recipe, WeekEntry, RecurringMeal } from '@/types';
import { DAY_KEYS, DAY_FULL, DAY_COLORS, REC_COLORS, TAG_COLORS, BASE_GUESTS, getWeekDates, isToday } from '@/lib/helpers';
import styles from './WeekView.module.css';

interface Props {
  recipes: Recipe[];
  weekEntries: WeekEntry[];
  recurring: RecurringMeal[];
  weekOffset: number;
  onShiftWeek: (dir: number) => void;
  onOpenDay: (key: string, idx: number) => void;
  onOpenRecurring: (key: string) => void;
}

export default function WeekView({
  recipes, weekEntries, recurring, weekOffset,
  onShiftWeek, onOpenDay, onOpenRecurring,
}: Props) {
  const dates = getWeekDates(weekOffset);
  const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const suffix =
    weekOffset === 0 ? ' (This week)' :
    weekOffset === -1 ? ' (Last week)' :
    weekOffset === 1  ? ' (Next week)' : '';
  const weekLabel = `${fmt(dates[0])} – ${fmt(dates[6])}${suffix}`;

  const entryMap: Record<string, WeekEntry> = {};
  weekEntries.forEach((e) => { entryMap[e.dayKey] = e; });

  return (
    <div className={styles.view}>
      <div className={styles.weekHdr}>
        <div className={styles.weekLabel}>{weekLabel}</div>
        <div>
          <button className={styles.wkBtn} onClick={() => onShiftWeek(-1)}>‹</button>
          <button className={styles.wkBtn} onClick={() => onShiftWeek(1)}>›</button>
        </div>
      </div>

      <div className={styles.cal}>
        {DAY_KEYS.map((key, i) => {
          const d = dates[i];
          const e = entryMap[key] ?? { type: 'empty', dayKey: key } as WeekEntry;
          const today = isToday(d);
          const recipe = e.type === 'meal' && e.recipeId ? recipes.find((r) => r.id === e.recipeId) : null;

          return (
            <div
              key={key}
              className={`${styles.dayRow} ${today ? styles.today : ''}`}
              onClick={() => onOpenDay(key, i)}
            >
              <div className={styles.dayCol}>
                <div className={styles.dayName}>{key.toUpperCase()}</div>
                <div className={styles.dayNum}>{d.getDate()}</div>
              </div>
              <div className={styles.dayContent}>
                {e.type === 'meal' && recipe ? (
                  <>
                    <div className={styles.dayAccent} style={{ background: recipe.color }} />
                    <div className={styles.mealRow}>
                      <span className={styles.mealEmoji}>{recipe.emoji}</span>
                      <span className={styles.mealName}>{recipe.name}</span>
                    </div>
                    {recipe.sub && <div className={styles.mealSub}>{recipe.sub}</div>}
                    <div className={styles.mealMeta}>
                      {recipe.tags.map((t) => (
                        <span key={t} className={styles.tag} style={{ background: TAG_COLORS[t] ?? '#888' }}>{t}</span>
                      ))}
                      {(e.guests ?? BASE_GUESTS) !== BASE_GUESTS && (
                        <span className={styles.guestsBadge}>👥 {e.guests}</span>
                      )}
                    </div>
                    <div className={styles.dayArrow}>›</div>
                  </>
                ) : e.type === 'note' ? (
                  <>
                    <div className={styles.noteTxt}>📝 {e.note}</div>
                    <div className={styles.dayArrow}>›</div>
                  </>
                ) : (
                  <div className={styles.emptyRow}>
                    <div className={styles.plusCircle}>+</div>
                    <span className={styles.emptyLbl}>Plan this evening</span>
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
            <div className={styles.recEmoji}>{recipe?.emoji ?? '🍽️'}</div>
            <div className={styles.recInfo}>
              <div className={styles.recType} style={{ color: col }}>{r.label}</div>
              <div className={styles.recName}>{recipe?.name ?? 'Not set'}</div>
              {recipe?.sub && <div className={styles.recSub}>{recipe.sub}</div>}
            </div>
            <div className={styles.recArrow}>›</div>
          </div>
        );
      })}
    </div>
  );
}
