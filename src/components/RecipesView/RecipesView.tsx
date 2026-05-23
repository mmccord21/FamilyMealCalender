'use client';

import type { Recipe } from '@/types';
import styles from './RecipesView.module.css';
import { useState } from 'react';

interface Props {
  recipes: Recipe[];
  prices: Record<string, number>;
  onOpenEditor: (id: string | null) => void;
}

export default function RecipesView({ recipes, prices, onOpenEditor }: Props) {
  const [query, setQuery] = useState('');

  const filtered = recipes.filter((r) =>
    r.name.toLowerCase().includes(query.toLowerCase()) ||
    (r.sub ?? '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className={styles.view}>
      <input
        className={styles.searchBox}
        placeholder="🔍  Search recipes…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className={styles.list}>
        {filtered.length === 0 && !query ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateIcon}>📚</div>
            <div className={styles.emptyStateTxt}>
              Your recipe library is empty.<br />
              Add your first recipe below!
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyStateTxt}>No recipes found matching "{query}"</div>
          </div>
        ) : (
          filtered.map((r) => {
            const totalPrice = r.ingredients.reduce((s, ing) => {
              const p = prices[ing.name.toLowerCase().trim()] || 0;
              return s + p;
            }, 0);

            return (
              <div key={r.id} className={styles.recipeCard} onClick={() => onOpenEditor(r.id)}>
                <span className={styles.rcEmoji}>{r.emoji}</span>
                <div className={styles.rcInfo}>
                  <div className={styles.rcName}>{r.name}</div>
                  <div className={styles.rcMeta}>
                    {r.sub} · {r.ingredients.length} ingredient{r.ingredients.length === 1 ? '' : 's'}
                  </div>
                </div>
                {totalPrice > 0 && <span className={styles.rcPrice}>${totalPrice.toFixed(2)}</span>}
              </div>
            );
          })
        )}
      </div>

      <button className={styles.addRecipeCard} onClick={() => onOpenEditor(null)}>
        <span className={styles.arcIcon}>＋</span>
        <span className={styles.arcLbl}>Add a Recipe</span>
      </button>
    </div>
  );
}
