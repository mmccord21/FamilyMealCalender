'use client';

import { useState, useEffect, useRef } from 'react';
import { CheckCircle, ChevronLeft, ChevronRight, ChevronRight as Caret, Copy, LayoutTemplate, MoreHorizontal, Pencil, Plus, Trash2, UtensilsCrossed, X } from 'lucide-react';
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
  const [showOverflow, setShowOverflow] = useState(false);
  const [showTemplatesPanel, setShowTemplatesPanel] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const overflowRef = useRef<HTMLDivElement>(null);

  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const fetchedIds = useRef<Set<string>>(new Set());

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);
  const [addLabel, setAddLabel] = useState('');

  const dates = getWeekDates(weekOffset);
  const [selectedIdx, setSelectedIdx] = useState<number>(() => {
    const t = dates.findIndex((d) => isToday(d));
    return t >= 0 ? t : 0;
  });

  useEffect(() => {
    if (!showOverflow && !showTemplatesPanel) return;
    const handler = (e: MouseEvent) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setShowOverflow(false);
        setShowTemplatesPanel(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showOverflow, showTemplatesPanel]);

  useEffect(() => {
    const missing = recipes.filter((r) => !r.imageUrl && !fetchedIds.current.has(r.id));
    missing.forEach((r) => {
      fetchedIds.current.add(r.id);
      fetch(`/api/meal-image?q=${encodeURIComponent(r.name)}`)
        .then((res) => res.json())
        .then(({ url }: { url: string | null }) => {
          if (url) setImageUrls((prev) => ({ ...prev, [r.id]: url }));
        })
        .catch(() => {});
    });
  }, [recipes]);

  useEffect(() => {
    const newDates = getWeekDates(weekOffset);
    const t = newDates.findIndex((d) => isToday(d));
    setSelectedIdx(t >= 0 ? t : 0);
  }, [weekOffset]);

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

  function slotTime(name: string): string | null {
    const n = name.toLowerCase();
    if (n.includes('breakfast')) return '8:00 AM';
    if (n.includes('brunch')) return '10:30 AM';
    if (n.includes('lunch')) return '12:30 PM';
    if (n.includes('snack')) return '3:00 PM';
    if (n.includes('dinner') || n.includes('supper')) return '6:30 PM';
    return null;
  }

  const selectedKey = DAY_KEYS[selectedIdx];
  const selectedDate = dates[selectedIdx];
  const isSelectedToday = isToday(selectedDate);
  const selectedDayName = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
  const menuHeading = isSelectedToday ? "Today's Menu" : `${selectedDayName}'s Menu`;
  const selectedMeals = mealMap[selectedKey] ?? [];

  return (
    <div className={styles.view}>
      <div className={styles.weekNav}>
        <div>
          <div className={styles.weekLabel}>{weekRange}</div>
          {weekContext && <div className={styles.weekBadge}>{weekContext}</div>}
        </div>
        <div className={styles.navBtns}>
          <div className={styles.copyWrap} ref={overflowRef}>
            <button
              className={styles.wkBtn}
              aria-label="More options"
              onClick={() => { setShowOverflow((v) => !v); setShowTemplatesPanel(false); }}
            >
              <MoreHorizontal size={18} strokeWidth={2} />
            </button>
            {showOverflow && !showTemplatesPanel && (
              <div className={styles.copyMenu}>
                {copyOptions.map((opt) => (
                  <button
                    key={opt.label}
                    className={styles.copyOption}
                    onClick={() => { onCopyWeek(opt.weekYear, opt.weekNum); setShowOverflow(false); }}
                  >
                    <Copy size={12} strokeWidth={2} style={{ opacity: 0.5 }} /> {opt.label}
                  </button>
                ))}
                <div className={styles.menuDivider} />
                <button
                  className={styles.copyOption}
                  onClick={() => { setShowOverflow(false); setShowTemplatesPanel(true); }}
                >
                  <LayoutTemplate size={12} strokeWidth={2} style={{ opacity: 0.5 }} /> Templates
                </button>
              </div>
            )}
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

      <div className={styles.dayPicker}>
        {DAY_KEYS.map((key, i) => {
          const d = dates[i];
          const today = isToday(d);
          const selected = i === selectedIdx;
          const hasMeals = (mealMap[key] ?? []).some((m) => m.recipes.length > 0);
          return (
            <button
              key={key}
              className={[
                styles.dayPickerBtn,
                today ? styles.dayPickerToday : '',
                selected && !today ? styles.dayPickerSelected : '',
              ].join(' ')}
              onClick={() => setSelectedIdx(i)}
              aria-label={`${DAY_ABBR[key]} ${d.getDate()}`}
            >
              <span className={styles.dayPickerAbbr}>{DAY_ABBR[key].slice(0, 3)}</span>
              <span className={styles.dayPickerNum}>{d.getDate()}</span>
              {hasMeals && !selected && <span className={styles.dayPickerDot} />}
            </button>
          );
        })}
      </div>

      <section className={styles.todaySection}>
        <h2 className={styles.todayHeading}>{menuHeading}</h2>

        {loading ? (
          <>
            {[0, 1, 2].map((i) => (
              <div key={i} className={styles.mealCard}>
                <div className={styles.mealCardPhoto}><div className={styles.skelPhoto} /></div>
                <div className={styles.mealCardContent}>
                  <div className={styles.skelLine} style={{ width: '40%', marginBottom: 6 }} />
                  <div className={styles.skelLine} style={{ width: '70%' }} />
                  <div className={styles.skelLine} style={{ width: '30%', marginTop: 4 }} />
                </div>
              </div>
            ))}
          </>
        ) : selectedMeals.length > 0 ? (
          selectedMeals.map((meal) => {
            const mealRecipes = meal.recipes
              .map((dmr) => recipes.find((r) => r.id === dmr.recipeId))
              .filter((r): r is Recipe => !!r);
            const firstRecipe = mealRecipes[0] ?? null;
            const photo = firstRecipe
              ? (firstRecipe.imageUrl || imageUrls[firstRecipe.id] || null)
              : null;
            const time = slotTime(meal.name);

            return (
              <div
                key={meal.id}
                className={styles.mealCard}
                onClick={() => firstRecipe
                  ? onViewRecipe(firstRecipe.id, meal.id, selectedKey, selectedIdx)
                  : onOpenDay(selectedKey, selectedIdx)
                }
              >
                <div className={styles.mealCardPhoto}>
                  {photo ? (
                    <img src={photo} alt={firstRecipe?.name ?? ''} className={styles.mealCardPhotoImg} />
                  ) : (
                    <div
                      className={styles.mealCardPhotoPlaceholder}
                      style={{ background: firstRecipe ? `${firstRecipe.color}1a` : 'var(--bdr)' }}
                    >
                      <UtensilsCrossed
                        size={26}
                        strokeWidth={1.5}
                        style={{ color: firstRecipe?.color ?? 'var(--mu)' }}
                      />
                    </div>
                  )}
                </div>

                <div className={styles.mealCardContent}>
                  <span className={styles.mealCardCategory}>{meal.name}</span>
                  {firstRecipe ? (
                    <>
                      <span className={styles.mealCardName}>{firstRecipe.name}</span>
                      {time && <span className={styles.mealCardTime}>{time}</span>}
                    </>
                  ) : (
                    <span className={styles.mealCardNoRecipe}>No recipe set</span>
                  )}
                </div>

                <button
                  className={`${styles.mealCardAction} ${meal.cookedAt ? styles.mealCardActionDone : ''}`}
                  aria-label={meal.cookedAt ? 'Cooked' : firstRecipe ? 'Mark as cooked' : 'Add recipe'}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (meal.cookedAt) return;
                    if (firstRecipe) onMarkCooked(meal.id);
                    else onOpenDay(selectedKey, selectedIdx);
                  }}
                >
                  {meal.cookedAt || firstRecipe
                    ? <CheckCircle size={20} strokeWidth={1.75} />
                    : <Plus size={20} strokeWidth={2} />
                  }
                </button>
              </div>
            );
          })
        ) : (
          <div className={styles.emptyDayCard}>
            <div className={styles.emptyDayIcon}>
              <UtensilsCrossed size={28} strokeWidth={1.5} style={{ color: 'var(--terra)' }} />
            </div>
            <div className={styles.emptyDayTitle}>Nothing planned yet</div>
            <div className={styles.emptyDaySub}>Tap below to plan {isSelectedToday ? 'today' : selectedDayName}</div>
            <button className={styles.emptyDayBtn} onClick={() => onOpenDay(selectedKey, selectedIdx)}>
              Plan this day
            </button>
          </div>
        )}

        <button className={styles.addMealBtn} onClick={() => onOpenDay(selectedKey, selectedIdx)}>
          <Plus size={14} strokeWidth={2.5} />
          Add meal slot
        </button>
      </section>

      <div className={styles.sectionLbl}>Recurring this week</div>
      <div className={styles.sectionSub}>Meals that repeat week to week, separate from your daily plan</div>

      {recurring.map((r) => {
        const recipe = r.recipeId ? recipes.find((rec) => rec.id === r.recipeId) : null;
        const col = recColor(r.key);

        if (editingKey === r.key) {
          return (
            <div key={r.key} className={styles.recCard}>
              <div className={styles.recEmoji} style={{ background: `${col}1a` }}>
                {recipe?.imageUrl
                  ? <img src={recipe.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 'inherit' }} />
                  : <UtensilsCrossed size={22} strokeWidth={1.75} style={{ color: col }} />}
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
              {recipe?.imageUrl
                ? <img src={recipe.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 'inherit' }} />
                : <UtensilsCrossed size={22} strokeWidth={1.75} style={{ color: col }} />}
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
