'use client';

import { useState } from 'react';
import Modal from '@/components/Modal/Modal';
import type { Recipe } from '@/types';
import styles from './RecipePickerModal.module.css';

interface Props {
  open: boolean;
  recipes: Recipe[];
  onClose: () => void;
  onSelect: (id: string) => void;
}

export default function RecipePickerModal({ open, recipes, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('');

  const filtered = recipes.filter((r) =>
    r.name.toLowerCase().includes(query.toLowerCase()) ||
    (r.sub ?? '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Modal open={open} onBackdropClick={onClose}>
      <div className={styles.title}>Choose a Recipe</div>
      <input
        className={styles.search}
        placeholder="🔍  Search…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        autoFocus
      />
      <div>
        {filtered.length === 0 ? (
          <div className={styles.empty}>No recipes found</div>
        ) : (
          filtered.map((r) => (
            <div key={r.id} className={styles.item} onClick={() => { onSelect(r.id); onClose(); setQuery(''); }}>
              <span className={styles.emoji}>{r.emoji}</span>
              <div className={styles.info}>
                <div className={styles.name}>{r.name}</div>
                <div className={styles.meta}>{r.sub} · {r.ingredients.length} ingredients</div>
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}
