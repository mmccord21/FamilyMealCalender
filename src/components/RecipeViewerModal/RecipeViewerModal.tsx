'use client';

import { X, Edit3, Calendar, Users } from 'lucide-react';
import Modal from '@/components/Modal/Modal';
import type { Recipe } from '@/types';
import { TAG_COLORS, CATS, CAT_KEYS, BASE_GUESTS } from '@/lib/helpers';
import styles from './RecipeViewerModal.module.css';

interface Props {
  open: boolean;
  recipe: Recipe | null;
  guests?: number;
  onClose: () => void;
  onEditDay?: () => void;
  onEditRecipe: () => void;
}

function parseSteps(instructions: string): string[] {
  const trimmed = instructions.trim();
  if (/^\d+\.\s+/m.test(trimmed)) {
    return trimmed.split(/\n?\d+\.\s+/).filter((s) => s.trim()).map((s) => s.trim());
  }
  return trimmed.split('\n').map((s) => s.trim()).filter(Boolean);
}

export default function RecipeViewerModal({
  open, recipe, guests = BASE_GUESTS, onClose, onEditDay, onEditRecipe,
}: Props) {
  if (!recipe) return null;

  const scale = guests / BASE_GUESTS;

  const grouped = CAT_KEYS.reduce<Record<string, typeof recipe.ingredients>>((acc, cat) => {
    const items = recipe.ingredients.filter((i) => i.cat === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  const steps = recipe.instructions ? parseSteps(recipe.instructions) : [];
  const hasIngredients = recipe.ingredients.length > 0;
  const hasInstructions = steps.length > 0;

  return (
    <Modal open={open} onBackdropClick={onClose}>
      <div className={styles.header}>
        <div className={styles.emojiWrap} style={{ background: `${recipe.color}1a` }}>
          <span className={styles.emoji}>{recipe.emoji}</span>
        </div>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
          <X size={18} strokeWidth={2.25} />
        </button>
      </div>

      <div className={styles.name}>{recipe.name}</div>
      {recipe.sub && <div className={styles.sub}>{recipe.sub}</div>}

      {recipe.tags.length > 0 && (
        <div className={styles.tags}>
          {recipe.tags.map((t) => {
            const c = TAG_COLORS[t] ?? '#9B8B7B';
            return (
              <span key={t} className={styles.tag} style={{ color: c, background: `${c}1a` }}>{t}</span>
            );
          })}
        </div>
      )}

      {guests !== BASE_GUESTS && (
        <div className={styles.guestBadge}>
          <Users size={13} strokeWidth={2.25} />
          Scaled for {guests} {guests === 1 ? 'person' : 'people'}
        </div>
      )}

      {hasIngredients && (
        <section className={styles.section}>
          <div className={styles.sectionLbl}>Ingredients</div>
          {CAT_KEYS.map((cat) => {
            const items = grouped[cat];
            if (!items) return null;
            const { l: label, c: color } = CATS[cat];
            return (
              <div key={cat} className={styles.catGroup}>
                <div className={styles.catLbl} style={{ color }}>{label}</div>
                {items.map((ing) => {
                  const qty = ing.noScale ? ing.qty : ing.qty * scale;
                  const display = Number.isInteger(qty) ? qty : parseFloat(qty.toFixed(1));
                  return (
                    <div key={ing.id} className={styles.ingRow}>
                      <span className={styles.ingName}>{ing.name}</span>
                      <span className={styles.ingAmt}>{display}{ing.unit ? ` ${ing.unit}` : ''}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </section>
      )}

      {hasInstructions && (
        <section className={styles.section}>
          <div className={styles.sectionLbl}>Instructions</div>
          <ol className={styles.steps}>
            {steps.map((step, i) => (
              <li key={i} className={styles.step}>
                <span className={styles.stepNum}>{i + 1}</span>
                <span className={styles.stepText}>{step}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {!hasIngredients && !hasInstructions && (
        <div className={styles.empty}>No ingredients or instructions added yet.</div>
      )}

      <div className={styles.actions}>
        {onEditDay && (
          <button className={styles.btnSec} onClick={onEditDay}>
            <Calendar size={15} strokeWidth={2} /> Edit Day
          </button>
        )}
        <button className={styles.btnPri} onClick={onEditRecipe}>
          <Edit3 size={15} strokeWidth={2} /> Edit Recipe
        </button>
      </div>
    </Modal>
  );
}
