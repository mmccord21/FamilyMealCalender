'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/Modal/Modal';
import type { Recipe, Ingredient, IngredientCat, Store } from '@/types';
import { EMOJIS, CAT_KEYS, CATS, catIcon, catColor } from '@/lib/helpers';
import styles from './RecipeEditorModal.module.css';

interface Props {
  open: boolean;
  recipe: Recipe | null;
  onClose: () => void;
  onSave: (recipe: Partial<Recipe>) => void;
  onDelete: (id: string) => void;
}

export default function RecipeEditorModal({ open, recipe, onClose, onSave, onDelete }: Props) {
  const [emoji, setEmoji] = useState('🍳');
  const [name, setName] = useState('');
  const [sub, setSub] = useState('');
  const [tags, setTags] = useState('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  const [showIngForm, setShowIngForm] = useState(false);
  const [draftIng, setDraftIng] = useState<{
    name: string; qty: string; unit: string; cat: IngredientCat; store: Store; noScale: boolean;
  }>({ name: '', qty: '', unit: '', cat: 'produce', store: 'sprouts', noScale: false });

  // Sync state when recipe changes
  useEffect(() => {
    if (open) {
      setEmoji(recipe?.emoji ?? '🍳');
      setName(recipe?.name ?? '');
      setSub(recipe?.sub ?? '');
      setTags(recipe?.tags?.join(', ') ?? 'keto');
      setIngredients(recipe?.ingredients ?? []);
      setShowIngForm(false);
      setDraftIng({ name: '', qty: '', unit: '', cat: 'produce', store: 'sprouts', noScale: false });
    }
  }, [open, recipe]);

  const handleSave = () => {
    if (!name.trim()) return alert('Name required');
    const tagsArr = tags.split(',').map((t) => t.trim()).filter(Boolean);
    onSave({
      ...(recipe ? { id: recipe.id } : {}),
      emoji,
      name,
      sub,
      tags: tagsArr,
      ingredients,
    });
  };

  const addIngredient = () => {
    if (!draftIng.name.trim()) return alert('Ingredient name required');
    setIngredients([
      ...ingredients,
      {
        id: Math.random().toString(36).substring(7),
        recipeId: recipe?.id ?? '',
        name: draftIng.name.trim(),
        qty: parseFloat(draftIng.qty) || 0,
        unit: draftIng.unit.trim(),
        cat: draftIng.cat,
        store: draftIng.store,
        noScale: draftIng.noScale,
      },
    ]);
    setDraftIng({ name: '', qty: '', unit: '', cat: 'produce', store: 'sprouts', noScale: false });
  };

  const removeIngredient = (id: string) => {
    setIngredients(ingredients.filter((i) => i.id !== id));
  };

  return (
    <Modal open={open} onBackdropClick={onClose}>
      <div className={styles.title}>{recipe ? recipe.name : 'New Recipe'}</div>

      <div className={styles.lbl}>Emoji</div>
      <div className={styles.emojiGrid}>
        {EMOJIS.map((em) => (
          <div
            key={em}
            className={`${styles.eOpt} ${em === emoji ? styles.eOptPicked : ''}`}
            onClick={() => setEmoji(em)}
          >{em}</div>
        ))}
      </div>

      <input className={styles.mIn} placeholder="Recipe name…" value={name} onChange={(e) => setName(e.target.value)} />
      <input className={styles.mInSm} placeholder="Short description…" value={sub} onChange={(e) => setSub(e.target.value)} />
      <input className={styles.mInSm} placeholder="Tags — keto, 30 min, date night…" value={tags} onChange={(e) => setTags(e.target.value)} />

      <div className={styles.lbl}>Ingredients</div>
      <div className={styles.ingList}>
        {ingredients.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--mu)', padding: '8px 0' }}>No ingredients yet.</div>
        ) : (
          ingredients.map((ing) => (
            <div key={ing.id} className={styles.ingRow}>
              <span className={styles.ingIcon}>{catIcon(ing.cat)}</span>
              <div className={styles.ingInfo}>
                <div className={styles.ingName}>{ing.name}</div>
                <div className={styles.ingQty}>
                  {ing.qty ? `${ing.qty} ` : ''}{ing.unit}{ing.noScale ? ' · fixed' : ''} · {ing.store === 'costco' ? '📦 Costco' : '🌿 Sprouts'}
                </div>
              </div>
              <button className={styles.ingDel} onClick={() => removeIngredient(ing.id)}>×</button>
            </div>
          ))
        )}
      </div>

      <button className={styles.addIngBtn} onClick={() => setShowIngForm(!showIngForm)}>
        {showIngForm ? '↑ Close' : '＋ Add Ingredient'}
      </button>

      {showIngForm && (
        <div className={styles.ingForm}>
          <input
            className={styles.mInSm} style={{ marginBottom: 10 }}
            placeholder="Ingredient name…" value={draftIng.name}
            onChange={(e) => setDraftIng({ ...draftIng, name: e.target.value })}
          />
          <div className={styles.ingFormRow}>
            <input
              className={styles.mInSm} style={{ width: 80, flexShrink: 0, marginTop: 0, paddingTop: 0 }}
              type="number" placeholder="Qty" value={draftIng.qty}
              onChange={(e) => setDraftIng({ ...draftIng, qty: e.target.value })}
            />
            <input
              className={styles.mInSm} style={{ flex: 1, marginTop: 0, paddingTop: 0 }}
              placeholder="Unit (lbs, bunch, oz…)" value={draftIng.unit}
              onChange={(e) => setDraftIng({ ...draftIng, unit: e.target.value })}
            />
          </div>

          <div className={styles.lbl} style={{ marginTop: 6 }}>Category</div>
          <div className={styles.catPills}>
            {CAT_KEYS.map((k) => (
              <button
                key={k}
                className={`${styles.catPill} ${draftIng.cat === k ? styles.catPillOn : ''}`}
                style={draftIng.cat === k ? { background: catColor(k), borderColor: catColor(k) } : {}}
                onClick={() => setDraftIng({ ...draftIng, cat: k })}
              >{CATS[k].i} {CATS[k].l}</button>
            ))}
          </div>

          <div className={styles.lbl}>Store</div>
          <div className={styles.storePills}>
            <button
              className={`${styles.storePill} ${draftIng.store === 'sprouts' ? styles.storePillOn : ''}`}
              onClick={() => setDraftIng({ ...draftIng, store: 'sprouts' })}
            >🌿 Sprouts</button>
            <button
              className={`${styles.storePill} ${draftIng.store === 'costco' ? styles.storePillOn : ''}`}
              onClick={() => setDraftIng({ ...draftIng, store: 'costco' })}
            >📦 Costco</button>
          </div>

          <div className={styles.fixedToggle} onClick={() => setDraftIng({ ...draftIng, noScale: !draftIng.noScale })}>
            <div className={`${styles.toggleBox} ${draftIng.noScale ? styles.toggleBoxOn : ''}`}>
              {draftIng.noScale && <span style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>✓</span>}
            </div>
            Fixed qty — doesn&apos;t scale with guest count
          </div>

          <button className={styles.addIngSubmit} onClick={addIngredient}>Add to Recipe</button>
        </div>
      )}

      <div className={styles.actions}>
        <button className={styles.mSec} onClick={onClose}>Cancel</button>
        <button className={styles.mPri} onClick={handleSave}>Save Recipe</button>
      </div>
      {recipe && (
        <button
          className={styles.mDanger}
          onClick={() => {
            if (confirm('Delete this recipe? It will be removed from any days it is assigned to.')) {
              onDelete(recipe.id);
            }
          }}
        >Delete Recipe</button>
      )}
    </Modal>
  );
}
