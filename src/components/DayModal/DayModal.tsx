'use client';

import { useState } from 'react';
import { UtensilsCrossed, CalendarOff, Plus, Minus, ChevronRight, Trash2, ShoppingCart } from 'lucide-react';
import Modal from '@/components/Modal/Modal';
import type { Recipe, WeekEntry } from '@/types';
import { DAY_FULL, QUICK_NOTES, BASE_GUESTS, getWeekDates } from '@/lib/helpers';
import styles from './DayModal.module.css';

interface Props {
  open: boolean;
  dayKey: string;
  dayIdx: number;
  weekOffset: number;
  entry: WeekEntry | null;
  recipes: Recipe[];
  onClose: () => void;
  onSave: (entry: Partial<WeekEntry>) => void;
  onClear: () => void;
  onOpenPicker: () => void;
  pickedRecipeId: string | null;
  setPickedRecipeId: (id: string | null) => void;
}

export default function DayModal({
  open, dayKey, dayIdx, weekOffset, entry, recipes,
  onClose, onSave, onClear, onOpenPicker,
  pickedRecipeId, setPickedRecipeId,
}: Props) {
  const dates = getWeekDates(weekOffset);
  const d = dates[dayIdx] ?? new Date();

  const [mode, setMode] = useState<'cooking' | 'note'>(
    entry?.type === 'note' ? 'note' : 'cooking'
  );
  const [guests, setGuests] = useState(entry?.guests ?? BASE_GUESTS);
  const [note, setNote] = useState(entry?.note ?? '');
  const [pickedNote, setPickedNote] = useState('');
  const [includeInShopping, setIncludeInShopping] = useState(entry?.includeInShopping !== false);

  const recipe = pickedRecipeId ? recipes.find((r) => r.id === pickedRecipeId) : null;

  function handleSave() {
    if (mode === 'cooking') {
      if (!pickedRecipeId) return;
      onSave({ type: 'meal', recipeId: pickedRecipeId, guests, includeInShopping });
    } else {
      onSave({ type: 'note', note: note.trim() || 'Note' });
    }
  }

  function handleModeChange(m: 'cooking' | 'note') {
    setMode(m);
  }

  function pickQuickNote(n: string) {
    setNote(n);
    setPickedNote(n);
  }

  return (
    <Modal open={open} onBackdropClick={onClose}>
      <div className={styles.title}>{DAY_FULL[dayIdx] ?? dayKey}</div>
      <div className={styles.date}>
        {d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </div>

      <div className={styles.modeToggle}>
        <button
          className={`${styles.modeOpt} ${mode === 'cooking' ? styles.on : ''}`}
          onClick={() => handleModeChange('cooking')}
        ><UtensilsCrossed size={15} strokeWidth={2} /> Cooking</button>
        <button
          className={`${styles.modeOpt} ${mode === 'note' ? styles.on : ''}`}
          onClick={() => handleModeChange('note')}
        ><CalendarOff size={15} strokeWidth={2} /> Not cooking</button>
      </div>

      {mode === 'cooking' ? (
        <div>
          {recipe ? (
            <div className={styles.chosenRecipe} onClick={onOpenPicker}>
              <span className={styles.crEmoji} style={{ background: `${recipe.color}1a` }}>{recipe.emoji}</span>
              <span className={styles.crName}>{recipe.name}</span>
              <span className={styles.crChange}>Change <ChevronRight size={13} strokeWidth={2.5} /></span>
            </div>
          ) : (
            <button className={styles.noRecipeBtn} onClick={onOpenPicker}><Plus size={17} strokeWidth={2.25} /> Choose a Recipe</button>
          )}

          <div className={styles.guestRow}>
            <div>
              <div className={styles.grLbl}>Guests tonight</div>
              <div className={styles.grSub}>Scales this meal&apos;s quantities</div>
            </div>
            <div className={styles.gsCtl}>
              <button className={styles.gsBtn} onClick={() => setGuests(Math.max(1, guests - 1))} aria-label="Fewer guests"><Minus size={16} strokeWidth={2.5} /></button>
              <span className={styles.gsNum}>{guests}</span>
              <button className={styles.gsBtn} onClick={() => setGuests(Math.min(20, guests + 1))} aria-label="More guests"><Plus size={16} strokeWidth={2.5} /></button>
            </div>
          </div>

          {recipe && (
            <button
              className={styles.shopToggleRow}
              onClick={() => setIncludeInShopping((v) => !v)}
              type="button"
            >
              <div className={styles.shopToggleLeft}>
                <span className={`${styles.shopToggleIcon} ${includeInShopping ? styles.shopIconOn : ''}`}>
                  <ShoppingCart size={16} strokeWidth={2} />
                </span>
                <div>
                  <div className={styles.shopToggleLbl}>Add to grocery list</div>
                  <div className={styles.shopToggleSub}>
                    {recipe.ingredients.length} ingredient{recipe.ingredients.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              <div className={`${styles.toggle} ${includeInShopping ? styles.toggleOn : ''}`}>
                <div className={styles.toggleThumb} />
              </div>
            </button>
          )}
        </div>
      ) : (
        <div>
          <div className={styles.mLbl}>What&apos;s happening?</div>
          <div className={styles.quickChips}>
            {QUICK_NOTES.map((n) => (
              <div
                key={n}
                className={`${styles.qc} ${pickedNote === n ? styles.picked : ''}`}
                onClick={() => pickQuickNote(n)}
              >{n}</div>
            ))}
          </div>
          <textarea
            className={styles.textarea}
            placeholder="e.g. Dinner at Vivi's, Leftovers, Mitch traveling…"
            value={note}
            onChange={(e) => { setNote(e.target.value); setPickedNote(''); }}
          />
        </div>
      )}

      <div className={styles.actions}>
        <button className={styles.btnSec} onClick={onClose}>Cancel</button>
        <button className={styles.btnPri} onClick={handleSave}>Save</button>
      </div>
      {entry && entry.type !== 'empty' && (
        <button className={styles.btnDanger} onClick={onClear}><Trash2 size={14} strokeWidth={2} /> Clear this evening</button>
      )}
    </Modal>
  );
}
