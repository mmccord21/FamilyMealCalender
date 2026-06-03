'use client';

import { useState, useEffect, useRef } from 'react';
import { Link2, Camera, FileText, Store as StoreIcon, Minus, Plus, ChevronUp, X, Check, Copy, Upload, UtensilsCrossed } from 'lucide-react';
import Modal from '@/components/Modal/Modal';
import type { Recipe, Ingredient, IngredientCat, UserStore } from '@/types';
import { CAT_KEYS, CATS, catIcon, catColor } from '@/lib/helpers';
import styles from './RecipeEditorModal.module.css';

interface Props {
  open: boolean;
  recipe: Recipe | null;
  stores: UserStore[];
  onClose: () => void;
  onSave: (recipe: Partial<Recipe>) => void | Promise<void>;
  onDelete: (id: string) => void;
  onDuplicate: (recipe: Partial<Recipe>) => void | Promise<void>;
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objUrl);
      const SIZE = 200;
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('canvas')); return; }
      const scale = Math.max(SIZE / img.width, SIZE / img.height);
      const sw = SIZE / scale;
      const sh = SIZE / scale;
      const sx = (img.width - sw) / 2;
      const sy = (img.height - sh) / 2;
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, SIZE, SIZE);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    img.onerror = reject;
    img.src = objUrl;
  });
}

export default function RecipeEditorModal({ open, recipe, stores = [], onClose, onSave, onDelete, onDuplicate }: Props) {
  const [imageUrl, setImageUrl] = useState('');
  const [imageInput, setImageInput] = useState('');
  const [name, setName] = useState('');
  const [sub, setSub] = useState('');
  const [tags, setTags] = useState('');
  const [instructions, setInstructions] = useState('');
  const [servings, setServings] = useState(4);
  const [prepTime, setPrepTime] = useState<string>('');
  const [cookTime, setCookTime] = useState<string>('');
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  const [showIngForm, setShowIngForm] = useState(false);
  const [draftIng, setDraftIng] = useState<{
    name: string; qty: string; unit: string; cat: IngredientCat; store: string; noScale: boolean;
  }>({ name: '', qty: '', unit: '', cat: 'produce', store: '', noScale: false });

  const [importMode, setImportMode] = useState<'url' | 'text' | null>(null);
  const [importUrl, setImportUrl] = useState('');
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Sync state when recipe changes
  useEffect(() => {
    if (open) {
      const url = recipe?.imageUrl ?? '';
      setImageUrl(url);
      setImageInput(url.startsWith('http') ? url : '');
      setName(recipe?.name ?? '');
      setSub(recipe?.sub ?? '');
      setTags(recipe?.tags?.join(', ') ?? '');
      setInstructions(recipe?.instructions ?? '');
      setServings(recipe?.servings ?? 4);
      setPrepTime(recipe?.prepTime ? String(recipe.prepTime) : '');
      setCookTime(recipe?.cookTime ? String(recipe.cookTime) : '');
      setIngredients(recipe?.ingredients ?? []);
      setShowIngForm(false);
      setDraftIng({ name: '', qty: '', unit: '', cat: 'produce', store: stores[0]?.name ?? '', noScale: false });
      setImportMode(null);
      setImportUrl('');
      setImportText('');
      setImportError('');
    }
  }, [open, recipe]);

  const applyImport = (data: { name: string; sub: string; tags: string[]; instructions?: string; servings?: number; prepTime?: number | null; cookTime?: number | null; ingredients: Ingredient[]; imageUrl?: string | null }) => {
    setName(data.name);
    setSub(data.sub);
    setTags(data.tags.join(', '));
    setInstructions(data.instructions ?? '');
    if (data.servings) setServings(data.servings);
    setPrepTime(data.prepTime ? String(data.prepTime) : '');
    setCookTime(data.cookTime ? String(data.cookTime) : '');
    setIngredients(data.ingredients);
    if (data.imageUrl) { setImageUrl(data.imageUrl); setImageInput(data.imageUrl.startsWith('http') ? data.imageUrl : ''); }
    setImportMode(null);
    setImportUrl('');
    setImportText('');
    setImportError('');
  };

  const handleTextImport = async () => {
    if (!importText.trim()) return;
    setImporting(true);
    setImportError('');
    try {
      const res = await fetch('/api/import-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: importText }),
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      setImageUrl(dataUrl);
      setImageInput('');
    } catch {
      alert('Could not process image');
    }
    e.target.value = '';
  };

  const commitImageInput = () => {
    if (imageInput.startsWith('http')) {
      setImageUrl(imageInput);
    }
  };

  const handleSave = () => {
    if (!name.trim()) return alert('Name required');
    const tagsArr = tags.split(',').map((t) => t.trim()).filter(Boolean);
    onSave({
      ...(recipe ? { id: recipe.id } : {}),
      emoji: '',
      imageUrl: imageUrl || null,
      name,
      sub,
      tags: tagsArr,
      instructions: instructions.trim() || null,
      servings,
      prepTime: prepTime ? parseInt(prepTime, 10) : null,
      cookTime: cookTime ? parseInt(cookTime, 10) : null,
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
    setDraftIng({ name: '', qty: '', unit: '', cat: 'produce', store: stores[0]?.name ?? '', noScale: false });
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
            <Link2 size={14} strokeWidth={2} /> URL
          </button>
          <button
            className={`${styles.importBtn} ${importMode === 'text' ? styles.importBtnOn : ''}`}
            onClick={() => { setImportMode(importMode === 'text' ? null : 'text'); setImportError(''); }}
            disabled={importing}
          >
            <FileText size={14} strokeWidth={2} /> Paste Text
          </button>
          <label className={`${styles.importBtn} ${importing ? styles.importBtnDisabled : ''}`}>
            <Camera size={14} strokeWidth={2} /> Photo
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
        {importMode === 'text' && (
          <div className={styles.importTextCol}>
            <textarea
              className={styles.importTextArea}
              placeholder="Paste a full recipe here — ingredients and steps…"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              autoFocus
            />
            <button className={styles.importGo} onClick={handleTextImport} disabled={importing || !importText.trim()}>
              {importing ? '…' : 'Extract Recipe'}
            </button>
          </div>
        )}
        {importing && <div className={styles.importStatus}>Importing recipe…</div>}
        {importError && <div className={styles.importError}>{importError}</div>}
      </div>

      <div className={styles.lbl}>Photo</div>
      <div className={styles.imageSection}>
        <div className={styles.imagePreview}>
          {imageUrl ? (
            <img src={imageUrl} alt="" className={styles.imagePreviewImg} onError={() => setImageUrl('')} />
          ) : (
            <UtensilsCrossed size={28} strokeWidth={1.5} style={{ color: 'var(--mu)' }} />
          )}
        </div>
        <div className={styles.imageControls}>
          <label className={styles.imageUploadBtn}>
            <Upload size={13} strokeWidth={2} /> Upload Photo
            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
          </label>
          <input
            className={styles.imageUrlInput}
            placeholder="or paste image URL…"
            value={imageInput}
            onChange={(e) => setImageInput(e.target.value)}
            onBlur={commitImageInput}
            onKeyDown={(e) => { if (e.key === 'Enter') commitImageInput(); }}
          />
          {imageUrl && (
            <button className={styles.imageRemoveBtn} onClick={() => { setImageUrl(''); setImageInput(''); }}>
              Remove photo
            </button>
          )}
        </div>
      </div>

      <input className={styles.mIn} placeholder="Recipe name…" value={name} onChange={(e) => setName(e.target.value)} />
      <input className={styles.mInSm} placeholder="Short description…" value={sub} onChange={(e) => setSub(e.target.value)} />

      <div className={styles.servingsRow}>
        <span className={styles.servingsLbl}>Serves</span>
        <div className={styles.servingsStepper}>
          <button className={styles.servingsBtn} onClick={() => setServings(Math.max(1, servings - 1))} aria-label="Fewer servings">
            <Minus size={14} strokeWidth={2} />
          </button>
          <span className={styles.servingsNum}>{servings}</span>
          <button className={styles.servingsBtn} onClick={() => setServings(servings + 1)} aria-label="More servings">
            <Plus size={14} strokeWidth={2} />
          </button>
        </div>
      </div>

      <input className={styles.mInSm} placeholder="Tags — keto, 30 min, date night…" value={tags} onChange={(e) => setTags(e.target.value)} />

      <div className={styles.lbl}>Instructions</div>
      <textarea
        className={styles.instrArea}
        placeholder="Step-by-step instructions…"
        value={instructions}
        onChange={(e) => setInstructions(e.target.value)}
      />

      <div className={styles.timeRow}>
        <div className={styles.timeField}>
          <span className={styles.timeLbl}>Prep</span>
          <input
            className={styles.timeInput}
            type="number"
            min="0"
            placeholder="0"
            value={prepTime}
            onChange={(e) => setPrepTime(e.target.value)}
          />
          <span className={styles.timeSuffix}>min</span>
        </div>
        <div className={styles.timeField}>
          <span className={styles.timeLbl}>Cook</span>
          <input
            className={styles.timeInput}
            type="number"
            min="0"
            placeholder="0"
            value={cookTime}
            onChange={(e) => setCookTime(e.target.value)}
          />
          <span className={styles.timeSuffix}>min</span>
        </div>
      </div>

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
                  {ing.qty ? `${ing.qty} ` : ''}{ing.unit}{ing.noScale ? ' · fixed' : ''}{ing.store ? ` · ${ing.store}` : ''}
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

          {stores.length > 0 && (
            <>
              <div className={styles.lbl}>Store</div>
              <div className={styles.storePills}>
                {stores.map((s) => (
                  <button
                    key={s.id}
                    className={`${styles.storePill} ${draftIng.store === s.name ? styles.storePillOn : ''}`}
                    onClick={() => setDraftIng({ ...draftIng, store: s.name })}
                  ><StoreIcon size={13} strokeWidth={2} /> {s.name}</button>
                ))}
              </div>
            </>
          )}

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
        {recipe && (
          <button
            className={styles.mSec}
            onClick={() => {
              const tagsArr = tags.split(',').map((t) => t.trim()).filter(Boolean);
              onDuplicate({ emoji: '', imageUrl: imageUrl || null, name: `Copy of ${name}`, sub, tags: tagsArr, instructions: instructions.trim() || null, ingredients });
            }}
          >
            <Copy size={15} strokeWidth={2} /> Duplicate
          </button>
        )}
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
