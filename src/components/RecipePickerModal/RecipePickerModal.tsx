'use client';

import { useState, useEffect } from 'react';
import { Search, SearchX, Minus, Plus, Check, UtensilsCrossed } from 'lucide-react';
import Modal from '@/components/Modal/Modal';
import type { Recipe } from '@/types';
import styles from './RecipePickerModal.module.css';

interface Props {
  open: boolean;
  recipes: Recipe[];
  onClose: () => void;
  onSelect: (id: string, servings: number) => void;
}

function tagColor(tag: string): string {
  if (tag === 'keto') return '#3A6B42';
  if (tag === 'meal-prep' || tag === '30 min') return '#A0652A';
  return '#B5522A';
}

export default function RecipePickerModal({ open, recipes, onClose, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingServings, setPendingServings] = useState(4);

  useEffect(() => {
    if (open) {
      setActiveTag(null);
      setExpandedId(null);
    }
  }, [open]);

  const allTags = Array.from(new Set(recipes.flatMap(r => r.tags))).sort();

  const filtered = recipes.filter((r) => {
    const matchesQuery = r.name.toLowerCase().includes(query.toLowerCase()) ||
      (r.sub ?? '').toLowerCase().includes(query.toLowerCase());
    const matchesTag = !activeTag || r.tags.includes(activeTag);
    return matchesQuery && matchesTag;
  });

  const handleItemClick = (r: Recipe) => {
    if (expandedId === r.id) {
      setExpandedId(null);
    } else {
      setExpandedId(r.id);
      setPendingServings(r.servings);
    }
  };

  const handleAdd = (id: string) => {
    onSelect(id, pendingServings);
    onClose();
    setQuery('');
    setExpandedId(null);
  };

  return (
    <Modal open={open} onBackdropClick={onClose}>
      <div className={styles.title}>Choose a Recipe</div>
      {allTags.length > 0 && (
        <div className={styles.tagRow}>
          {allTags.map((tag) => {
            const color = tagColor(tag);
            const isActive = activeTag === tag;
            return (
              <button
                key={tag}
                className={styles.tagPill}
                onClick={() => setActiveTag(prev => prev === tag ? null : tag)}
                style={isActive ? {
                  background: `${color}1a`,
                  color,
                  borderColor: color,
                } : undefined}
              >
                {tag}
              </button>
            );
          })}
        </div>
      )}
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
            <div key={r.id} className={`${styles.itemWrap} ${expandedId === r.id ? styles.itemWrapOpen : ''}`}>
              <div className={styles.item} onClick={() => handleItemClick(r)}>
                <span className={styles.emoji} style={{ background: `${r.color}1a` }}>
                  {r.imageUrl
                    ? <img src={r.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 'inherit' }} />
                    : <UtensilsCrossed size={18} strokeWidth={1.75} style={{ color: r.color }} />}
                </span>
                <div className={styles.info}>
                  <div className={styles.name}>{r.name}</div>
                  <div className={styles.meta}>{r.sub} · {r.ingredients.length} ingredient{r.ingredients.length === 1 ? '' : 's'} · Serves {r.servings}</div>
                </div>
              </div>
              {expandedId === r.id && (
                <div className={styles.expand}>
                  <span className={styles.expandLbl}>Servings</span>
                  <div className={styles.stepper}>
                    <button
                      className={styles.stepBtn}
                      onClick={(e) => { e.stopPropagation(); setPendingServings(Math.max(1, pendingServings - 1)); }}
                      aria-label="Fewer servings"
                    >
                      <Minus size={13} strokeWidth={2.5} />
                    </button>
                    <span className={styles.stepNum}>{pendingServings}</span>
                    <button
                      className={styles.stepBtn}
                      onClick={(e) => { e.stopPropagation(); setPendingServings(pendingServings + 1); }}
                      aria-label="More servings"
                    >
                      <Plus size={13} strokeWidth={2.5} />
                    </button>
                  </div>
                  <button className={styles.addBtn} onClick={() => handleAdd(r.id)}>
                    <Check size={14} strokeWidth={2.5} /> Add
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}
