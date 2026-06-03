'use client';

import { useState, useEffect, useRef } from 'react';
import { CheckCircle, ChevronLeft, ChevronRight, ChevronRight as Caret, Copy, LayoutTemplate, Pencil, Plus, Trash2, UtensilsCrossed, X } from 'lucide-react';
import type { Recipe, DayMeal, RecurringMeal, WeekTemplate } from '@/types';
import { DAY_KEYS, recColor, getWeekDates, getISOWeek, isToday } from '@/lib/helpers';
import styles from './WeekView.module.css';

interface Props {
  recipes: Recipe[];
  dayMeals: DayMeal[];
  recurring: RecurringMeal[];
  weekOffset: number;
  loading?: boolean;
  templates: WeekTemplate[];
  onShiftWeek: (dir: number) => void;
  onOpenDay: (key: string, idx: number) => void;
  onViewRecipe: (recipeId: string, dayMealId: string, dayKey: string, dayIdx: number) => void;
  onOpenRecurring: (key: string) => void;
  onCopyWeek: (fromWeekYear: number, fromWeekNum: number) => void;
  onAddRecurring: (label: string) => void;
  onDeleteRecurring: (key: string) => void;
  onRenameRecurring: (key: string, label: string) => void;
  onSaveTemplate: (name: string) => void;
  onApplyTemplate: (id: string) => void;
  onDeleteTemplate: (id: string) => void;
  onMarkCooked: (dayMealId: string) => void;
  onGoToRecipes: () => void;
}

const DAY_ABBR: Record<string, string> = {
  Mon: 'MON', Tue: 'TUE', Wed: 'WED', Thu: 'THU', Fri: 'FRI', Sat: 'SAT', Sun: 'SUN',
};

export default function WeekView({
  recipes, dayMeals, recurring, weekOffset, loading = false, templates,
  onShiftWeek, onOpenDay, onViewRecipe, onOpenRecurring, onCopyWeek,
  onAddRecurring, onDeleteRecurring, onRenameRecurring,
  onSaveTemplate, onApplyTemplate, onDeleteTemplate, onMarkCooked, onGoToRecipes,
}: Props) {
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [showTemplatesPanel, setShowTemplatesPanel] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const templatesRef = useRef<HTMLDivElement>(null);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);
  const [addLabel, setAddLabel] = useState('');

  useEffect(() => {
    if (!showCopyMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowCopyMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCopyMenu]);

  useEffect(() => {
    if (!showTemplatesPanel) return;
    const handler = (e: MouseEvent) => {
      if (templatesRef.current && !templatesRef.current.contains(e.target as Node)) {
        setShowTemplatesPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showTemplatesPanel]);

  function commitSaveTemplate() {
    const trimmed = templateName.trim();
    if (!trimmed) return;
    onSaveTemplate(trimmed);
    setTemplateName('');
    setShowTemplatesPanel(false);
  }

  function relWeek(relOffset: number) {
    const d = new Date();
    d.setDate(d.getDate() + (weekOffset + relOffset) * 7);
    return getISOWeek(d);
  }

  const copyOptions = [
    { label: 'Copy from last week', ...relWeek(-1) },
    { label: 'Copy from 2 weeks ago', ...relWeek(-2) },
    { label: 'Copy from 3 weeks ago', ...relWeek(-3) },
  ];

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

  function commitRename(key: string) {
    const trimmed = editingLabel.trim();
    if (trimmed) onRenameRecurring(key, trimmed);
    setEditingKey(null);
  }

  function commitAdd() {
    const trimmed = addLabel.trim();
    if (trimmed) {
      onAddRecurring(trimmed);
      setAddLabel('');
      setShowAddInput(false);
    }
  }

  return (
    <div className={styles.view}>
      <div className={styles.weekNav}>
        <div>
          <div className={styles.weekLabel}>{weekRange}</div>
          {weekContext && <div className={styles.weekBadge}>{weekContext}</div>}
        </div>
        <div className={styles.navBtns}>
          <div className={styles.copyWrap} ref={menuRef}>
            <button
              className={styles.utilBtn}
              aria-label="Copy week meals"
              onClick={() => setShowCopyMenu((v) => !v)}
            >
              <Copy size={13} strokeWidth={2} />
              <span>Copy from</span>
            </button>
            {showCopyMenu && (
              <div className={styles.copyMenu}>
                {copyOptions.map((opt) => (
                  <button
                    key={opt.label}
                    className={styles.copyOption}
                    onClick={() => {
                      onCopyWeek(opt.weekYear, opt.weekNum);
                      setShowCopyMenu(false);
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className={styles.copyWrap} ref={templatesRef}>
            <button
              className={styles.utilBtn}
              aria-label="Week templates"
              onClick={() => { setShowTemplatesPanel((v) => !v); setShowCopyMenu(false); }}
            >
              <LayoutTemplate size={13} strokeWidth={2} />
              <span>Templates</span>
            </button>
            {showTemplatesPanel && (
              <div className={styles.templatesPanel}>
                <div className={styles.tplSaveRow}>
                  <input
                    className={styles.tplInput}
                    placeholder="Template name…"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitSaveTemplate();
                      if (e.key === 'Escape') setShowTemplatesPanel(false);
                    }}
                    autoFocus
                  />
                  <button
                    className={styles.tplSaveBtn}
                    disabled={!templateName.trim()}
                    onClick={commitSaveTemplate}
                  >
                    Save
                  </button>
                </div>
                <div className={styles.tplDivider} />
                {templates.length === 0 ? (
                  <div className={styles.tplEmpty}>No templates yet</div>
                ) : (
                  templates.map((tpl) => (
                    <div key={tpl.id} className={styles.tplRow}>
                      <button
                        className={styles.tplName}
                        onClick={() => { onApplyTemplate(tpl.id); setShowTemplatesPanel(false); }}
                      >
                        {tpl.name}
                      </button>
                      <button
                        className={styles.tplDelete}
                        aria-label={`Delete template ${tpl.name}`}
                        onClick={() => onDeleteTemplate(tpl.id)}
                      >
                        <X size={13} strokeWidth={2.5} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <button className={styles.wkBtn} aria-label="Previous week" onClick={() => onShiftWeek(-1)}>
            <ChevronLeft size={18} strokeWidth={2.25} />
          </button>
          <button className={styles.wkBtn} aria-label="Next week" onClick={() => onShiftWeek(1)}>
            <ChevronRight size={18} strokeWidth={2.25} />
          </button>
        </div>
      </div>

      {recipes.length === 0 && (
        <div className={styles.noRecipesHint}>
          <span className={styles.noRecipesText}>Your recipe book is empty — add recipes to start planning</span>
          <button className={styles.noRecipesLink} onClick={onGoToRecipes}>
            Go to Recipes <Caret size={13} strokeWidth={2.5} />
          </button>
        </div>
      )}

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
                            <div className={styles.slotHeader}>
                              <span className={styles.slotLabel}>{meal.name}</span>
                              {mealRecipes.length > 0 && (
                                <button
                                  className={`${styles.slotCooked} ${meal.cookedAt ? styles.slotCookedDone : ''}`}
                                  aria-label={meal.cookedAt ? 'Cooked' : 'Mark as cooked'}
                                  onClick={(e) => { e.stopPropagation(); if (!meal.cookedAt) onMarkCooked(meal.id); }}
                                >
                                  <CheckCircle size={14} strokeWidth={2} />
                                </button>
                              )}
                            </div>
                            <div className={styles.slotChips}>
                              {mealRecipes.map((r) => (
                                <span
                                  key={r.id}
                                  className={styles.slotChip}
                                  style={{ background: `${r.color}1a`, color: r.color }}
                                  onClick={(e) => { e.stopPropagation(); onViewRecipe(r.id, meal.id, key, i); }}
                                >
                                  <span className={styles.slotChipEmoji}>{r.emoji}</span>
                                  <span className={styles.slotChipName}>{r.name}</span>
                                </span>
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
      <div className={styles.sectionSub}>Meals that repeat week to week, separate from your daily plan</div>

      {recurring.map((r) => {
        const recipe = r.recipeId ? recipes.find((rec) => rec.id === r.recipeId) : null;
        const col = recColor(r.key);

        if (editingKey === r.key) {
          return (
            <div key={r.key} className={styles.recCard}>
              <div className={styles.recEmoji} style={{ background: `${col}1a` }}>
                {recipe?.emoji ?? <UtensilsCrossed size={22} strokeWidth={1.75} style={{ color: col }} />}
              </div>
              <div className={styles.recEditRow}>
                <input
                  className={styles.recEditInput}
                  value={editingLabel}
                  onChange={(e) => setEditingLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename(r.key);
                    if (e.key === 'Escape') setEditingKey(null);
                  }}
                  autoFocus
                />
                <button className={styles.recSaveBtn} onClick={() => commitRename(r.key)}>Save</button>
                <button className={styles.recCancelBtn} onClick={() => setEditingKey(null)}>Cancel</button>
              </div>
            </div>
          );
        }

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
            <div className={styles.recActions}>
              <button
                className={styles.recActionBtn}
                aria-label="Rename slot"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingLabel(r.label);
                  setEditingKey(r.key);
                }}
              >
                <Pencil size={14} strokeWidth={2} />
              </button>
              <button
                className={`${styles.recActionBtn} ${styles.recActionDel}`}
                aria-label="Delete slot"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Delete "${r.label}"?`)) onDeleteRecurring(r.key);
                }}
              >
                <Trash2 size={14} strokeWidth={2} />
              </button>
            </div>
            <Caret className={styles.recArrow} size={18} strokeWidth={2} />
          </div>
        );
      })}

      {showAddInput ? (
        <div className={styles.addRecCard}>
          <input
            className={styles.addRecInput}
            placeholder="e.g. Weekend Brunch"
            value={addLabel}
            onChange={(e) => setAddLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitAdd();
              if (e.key === 'Escape') { setShowAddInput(false); setAddLabel(''); }
            }}
            autoFocus
          />
          <button
            className={styles.addRecSubmit}
            disabled={!addLabel.trim()}
            onClick={commitAdd}
          >
            Add
          </button>
          <button
            className={styles.addRecCancel}
            onClick={() => { setShowAddInput(false); setAddLabel(''); }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button className={styles.addRecRow} onClick={() => setShowAddInput(true)}>
          <Plus size={14} strokeWidth={2.5} />
          Add recurring meal
        </button>
      )}
    </div>
  );
}
