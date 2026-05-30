'use client';

import { useState } from 'react';
import { Search, SearchX } from 'lucide-react';
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
      <div className={styles.searchWrap}>
        <Search size={16} strokeWidth={2} className={styles.searchIcon} />
        <input
          className={styles.search}
          placeholder="Search recipes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>
      <div>
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}><SearchX size={26} strokeWidth={1.75} /></div>
            <div className={styles.emptyTxt}>No recipes found</div>
          </div>
        ) : (
          filtered.map((r) => (
            <div key={r.id} className={styles.item} onClick={() => { onSelect(r.id); onClose(); setQuery(''); }}>
              <span className={styles.emoji} style={{ background: `${r.color}1a` }}>{r.emoji}</span>
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
