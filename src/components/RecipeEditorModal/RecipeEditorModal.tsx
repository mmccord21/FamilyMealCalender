'use client';

import { useState, useEffect, useRef } from 'react';
import { Link2, Camera, Leaf, Package, Plus, ChevronUp, X, Check } from 'lucide-react';
import Modal from '@/components/Modal/Modal';
import type { Recipe, Ingredient, IngredientCat, Store } from '@/types';
import { EMOJIS, CAT_KEYS, CATS, catIcon, catColor } from '@/lib/helpers';
import styles from './RecipeEditorModal.module.css';

interface Props {
  open: boolean;
  recipe: Recipe | null;
  onClose: () => void;
  onSave: (recipe: Partial<Recipe>) => void | Promise<void>;
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

  const [importMode, setImportMode] = useState<'url' | null>(null);
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);

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
      setImportMode(null);
      setImportUrl('');
      setImportError('');
    }
  }, [open, recipe]);

  const applyImport = (data: { name: string; sub: string; tags: string[]; ingredients: Ingredient[] }) => {
    setName(data.name);
    setSub(data.sub);
    setTags(data.tags.join(', '));
    setIngredients(data.ingredients);
    setImportMode(null);
    setImportUrl('');
    setImportError('');
  };

  const handleUrlImport = async () => {
    if (!importUrl.trim()) return;
    setImporting(true);
    setImportError('');
    try {
      const res = await fetch('/api/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      applyImport(data);
    } catch (e: unknown) {
      setImportError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handlePhotoImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportError('');
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch('/api/import-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mediaType: file.type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      applyImport(data);
    } catch (e: unknown) {
      setImportError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

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

      <div className={styles.importSection}>
        <div className={styles.importBtns}>
          <button
            className={`${styles.importBtn} ${importMode === 'url' ? styles.importBtnOn : ''}`}
            onClick={() => { setImportMode(importMode === 'url' ? null : 'url'); setImportError(''); }}
            disabled={importing}
          >
            <Link2 size={14} strokeWidth={2} /> Import from URL
          </button>
          <label className={`${styles.importBtn} ${importing ? styles.importBtnDisabled : ''}`}>
            <Camera size={14} strokeWidth={2} /> Import from Photo
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoImport}
              disabled={importing}
            />
          </label>
        </div>
        {importMode === 'url' && (
          <div className={styles.importUrlRow}>
            <input
              className={styles.importUrlInput}
              placeholder="Paste recipe URL…"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUrlImport()}
              autoFocus
            />
            <button className={styles.importGo} onClick={handleUrlImport} disabled={importing || !importUrl.trim()}>
              {importing ? '…' : 'Go'}
            </button>
          </div>
        )}
        {importing && <div className={styles.importStatus}>Importing recipe…</div>}
        {importError && <div className={styles.importError}>{importError}</div>}
      </div>

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
                  {ing.qty ? `${ing.qty} ` : ''}{ing.unit}{ing.noScale ? ' · fixed' : ''} · {ing.store === 'costco' ? 'Costco' : 'Sprouts'}
                </div>
              </div>
              <button className={styles.ingDel} onClick={() => removeIngredient(ing.id)} aria-label="Remove ingredient"><X size={16} strokeWidth={2.5} /></button>
            </div>
          ))
        )}
      </div>

      <button className={styles.addIngBtn} onClick={() => setShowIngForm(!showIngForm)}>
        {showIngForm ? <><ChevronUp size={15} strokeWidth={2.25} /> Close</> : <><Plus size={15} strokeWidth={2.25} /> Add Ingredient</>}
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
            ><Leaf size={13} strokeWidth={2} /> Sprouts</button>
            <button
              className={`${styles.storePill} ${draftIng.store === 'costco' ? styles.storePillOn : ''}`}
              onClick={() => setDraftIng({ ...draftIng, store: 'costco' })}
            ><Package size={13} strokeWidth={2} /> Costco</button>
          </div>

          <div className={styles.fixedToggle} onClick={() => setDraftIng({ ...draftIng, noScale: !draftIng.noScale })}>
            <div className={`${styles.toggleBox} ${draftIng.noScale ? styles.toggleBoxOn : ''}`}>
              {draftIng.noScale && <Check size={13} strokeWidth={3} color="white" />}
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
