'use client';

import { useState, useRef } from 'react';
import { Package, Plus, Trash2, AlertTriangle, ChevronDown, ChevronUp, Check } from 'lucide-react';
import type { PantryItem, Recipe } from '@/types';
import styles from './PantryView.module.css';

interface Props {
  pantryItems: PantryItem[];
  recipes: Recipe[];
  onAddItem: (name: string, qty: number, unit: string) => void;
  onUpdateQty: (name: string, qty: number, unit: string) => void;
  onRemoveItem: (name: string) => void;
}

const COMMON_UNITS = ['whole', 'count', 'oz', 'lbs', 'g', 'kg', 'tsp', 'tbsp', 'cups', 'fl oz', 'ml', 'L', 'can', 'bottle', 'bag', 'bunch', 'clove', 'slice'];

export default function PantryView({ pantryItems, recipes, onAddItem, onUpdateQty, onRemoveItem }: Props) {
  const [showImport, setShowImport] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editQty, setEditQty] = useState('');

  const [importChecked, setImportChecked] = useState<Record<string, { qty: string; unit: string }>>({});
  const [addName, setAddName] = useState('');
  const [addQty, setAddQty] = useState('');
  const [addUnit, setAddUnit] = useState('whole');
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const addNameRef = useRef<HTMLInputElement>(null);

  const allIngredients: { name: string; unit: string }[] = [];
  const seen = new Set<string>();
  for (const r of recipes) {
    for (const ing of r.ingredients) {
      const key = ing.name.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        allIngredients.push({ name: ing.name, unit: ing.unit ?? 'whole' });
      }
    }
  }

  const pantryNames = new Set(pantryItems.map((p) => p.name));
  const importCandidates = allIngredients.filter((i) => !pantryNames.has(i.name.toLowerCase().trim()));

  function handleImportToggle(key: string, unit: string) {
    setImportChecked((prev) => {
      if (prev[key]) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: { qty: '1', unit } };
    });
  }

  function commitImport() {
    for (const [name, { qty, unit }] of Object.entries(importChecked)) {
      const n = Number(qty);
      if (!isNaN(n) && n > 0) onAddItem(name, n, unit);
    }
    setImportChecked({});
    setShowImport(false);
  }

  function handleNameInput(val: string) {
    setAddName(val);
    if (!val.trim()) { setNameSuggestions([]); return; }
    const q = val.toLowerCase();
    const matches = allIngredients
      .filter((i) => i.name.toLowerCase().includes(q))
      .slice(0, 5);
    setNameSuggestions(matches.map((m) => m.name));
  }

  function selectSuggestion(name: string) {
    setAddName(name);
    const match = allIngredients.find((i) => i.name.toLowerCase() === name.toLowerCase());
    if (match?.unit) setAddUnit(match.unit);
    setNameSuggestions([]);
    addNameRef.current?.focus();
  }

  function commitAdd() {
    const n = Number(addQty);
    if (!addName.trim() || isNaN(n) || n <= 0) return;
    onAddItem(addName.trim(), n, addUnit);
    setAddName('');
    setAddQty('');
    setAddUnit('whole');
    setShowAddForm(false);
  }

  function startEdit(name: string, qty: number) {
    setEditingName(name);
    setEditQty(String(qty));
  }

  function commitEdit(item: PantryItem) {
    const n = Number(editQty);
    if (!isNaN(n) && n >= 0) onUpdateQty(item.name, n, item.unit);
    setEditingName(null);
  }

  const lowStockItems = pantryItems.filter((p) => p.lowStockQty != null && p.qty <= p.lowStockQty);

  return (
    <div className={styles.view}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <Package size={18} strokeWidth={2} className={styles.titleIcon} />
          <h2 className={styles.title}>Pantry</h2>
          {pantryItems.length > 0 && (
            <span className={styles.countChip}>{pantryItems.length}</span>
          )}
        </div>
        <button className={styles.addBtn} onClick={() => { setShowAddForm(true); setShowImport(false); }}>
          <Plus size={16} strokeWidth={2.5} />
          Add item
        </button>
      </div>

      {lowStockItems.length > 0 && (
        <div className={styles.lowStockBanner}>
          <AlertTriangle size={14} strokeWidth={2} />
          <span>{lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} running low — added to grocery list</span>
        </div>
      )}

      {showAddForm && (
        <div className={styles.addForm}>
          <div className={styles.addFormTitle}>Add pantry item</div>
          <div className={styles.addRow}>
            <div className={styles.nameWrap}>
              <input
                ref={addNameRef}
                className={styles.addInput}
                placeholder="Ingredient name…"
                value={addName}
                onChange={(e) => handleNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') commitAdd(); if (e.key === 'Escape') setShowAddForm(false); }}
                autoFocus
              />
              {nameSuggestions.length > 0 && (
                <div className={styles.suggestions}>
                  {nameSuggestions.map((s) => (
                    <button key={s} className={styles.suggestion} onMouseDown={() => selectSuggestion(s)}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              className={styles.qtyInput}
              placeholder="Qty"
              type="number"
              min="0"
              step="any"
              value={addQty}
              onChange={(e) => setAddQty(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') commitAdd(); }}
            />
            <select className={styles.unitSelect} value={addUnit} onChange={(e) => setAddUnit(e.target.value)}>
              {COMMON_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className={styles.addFormActions}>
            <button className={styles.addSubmit} disabled={!addName.trim() || !addQty} onClick={commitAdd}>
              Add to Pantry
            </button>
            <button className={styles.addCancel} onClick={() => setShowAddForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {importCandidates.length > 0 && (
        <button className={styles.importRow} onClick={() => { setShowImport((v) => !v); setShowAddForm(false); }}>
          <span>Import from my recipes</span>
          {showImport ? <ChevronUp size={14} strokeWidth={2} /> : <ChevronDown size={14} strokeWidth={2} />}
        </button>
      )}

      {showImport && (
        <div className={styles.importPanel}>
          <div className={styles.importHint}>Tap ingredients you currently have, enter amounts, then tap Add.</div>
          <div className={styles.importList}>
            {importCandidates.map((ing) => {
              const key = ing.name.toLowerCase().trim();
              const checked = !!importChecked[key];
              return (
                <div key={key} className={`${styles.importItem} ${checked ? styles.importItemOn : ''}`}>
                  <button className={styles.importCheck} onClick={() => handleImportToggle(key, ing.unit)}>
                    <div className={`${styles.importCheckBox} ${checked ? styles.importCheckBoxOn : ''}`}>
                      {checked && <Check size={10} strokeWidth={3} />}
                    </div>
                    <span className={styles.importName}>{ing.name}</span>
                  </button>
                  {checked && (
                    <div className={styles.importQtyRow}>
                      <input
                        className={styles.importQtyInput}
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Qty"
                        value={importChecked[key]?.qty ?? ''}
                        onChange={(e) => setImportChecked((prev) => ({ ...prev, [key]: { ...prev[key], qty: e.target.value } }))}
                      />
                      <select
                        className={styles.importUnitSelect}
                        value={importChecked[key]?.unit ?? ing.unit}
                        onChange={(e) => setImportChecked((prev) => ({ ...prev, [key]: { ...prev[key], unit: e.target.value } }))}
                      >
                        {COMMON_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {Object.keys(importChecked).length > 0 && (
            <button className={styles.importSubmit} onClick={commitImport}>
              Add {Object.keys(importChecked).length} item{Object.keys(importChecked).length > 1 ? 's' : ''} to Pantry
            </button>
          )}
        </div>
      )}

      {pantryItems.length === 0 && !showAddForm && !showImport && (
        <div className={styles.empty}>
          <Package size={40} strokeWidth={1.25} className={styles.emptyIcon} />
          <div className={styles.emptyTitle}>Your pantry is empty</div>
          <div className={styles.emptyBody}>
            Add items manually or import from your recipes.
            Items will be deducted automatically when you mark a meal as cooked.
          </div>
        </div>
      )}

      {pantryItems.length > 0 && (
        <div className={styles.list}>
          {pantryItems.map((item) => {
            const isLow = item.lowStockQty != null && item.qty <= item.lowStockQty;
            const isEditing = editingName === item.name;
            return (
              <div key={item.name} className={`${styles.item} ${isLow ? styles.itemLow : ''}`}>
                <div className={styles.itemMain}>
                  <div className={styles.itemName}>{item.name}</div>
                  <div className={styles.itemQtyRow}>
                    {isEditing ? (
                      <input
                        className={styles.itemQtyEdit}
                        type="number"
                        min="0"
                        step="any"
                        value={editQty}
                        autoFocus
                        onChange={(e) => setEditQty(e.target.value)}
                        onBlur={() => commitEdit(item)}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(item); if (e.key === 'Escape') setEditingName(null); }}
                      />
                    ) : (
                      <button className={styles.itemQty} onClick={() => startEdit(item.name, item.qty)}>
                        {item.qty % 1 === 0 ? item.qty : item.qty.toFixed(2).replace(/\.?0+$/, '')}
                      </button>
                    )}
                    <span className={styles.itemUnit}>{item.unit}</span>
                    {isLow && <AlertTriangle size={12} strokeWidth={2} className={styles.lowIcon} />}
                  </div>
                </div>
                <button
                  className={styles.removeBtn}
                  aria-label={`Remove ${item.name}`}
                  onClick={() => onRemoveItem(item.name)}
                >
                  <Trash2 size={14} strokeWidth={2} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
