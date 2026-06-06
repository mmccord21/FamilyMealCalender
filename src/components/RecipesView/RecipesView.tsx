'use client';

import { Search, BookOpen, Plus, SearchX, Clock, UtensilsCrossed } from 'lucide-react';
import type { Recipe } from '@/types';
import styles from './RecipesView.module.css';
import { useState } from 'react';

interface Props {
  recipes: Recipe[];
  prices: Record<string, number>;
  onView: (id: string) => void;
  onOpenEditor: (id: string | null) => void;
}

export default function RecipesView({ recipes, prices, onView, onOpenEditor }: Props) {
  const [query, setQuery] = useState('');

  const filtered = recipes.filter((r) =>
    r.name.toLowerCase().includes(query.toLowerCase()) ||
    (r.sub ?? '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className={styles.view}>
      <div className={styles.searchWrap}>
        <Search size={16} strokeWidth={2} className={styles.searchIcon} />
        <input
          className={styles.searchBox}
          placeholder="Search recipes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <button className={styles.addRecipeCard} onClick={() => onOpenEditor(null)}>
        <Plus size={18} strokeWidth={2.5} className={styles.arcIcon} />
        <span className={styles.arcLbl}>Add a Recipe</span>
      </button>

      <div className={styles.list}>
        {filtered.length === 0 && !query ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}><BookOpen size={28} strokeWidth={1.75} /></div>
            <div className={styles.emptyTitle}>Your recipe book is empty</div>
            <div className={styles.emptyStateTxt}>Start here — add your family&rsquo;s go-to meals and they&rsquo;ll be ready to plan and shop from.</div>
            <button className={styles.emptyAddBtn} onClick={() => onOpenEditor(null)}>
              <Plus size={15} strokeWidth={2.5} /> Add your first recipe
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}><SearchX size={28} strokeWidth={1.75} /></div>
            <div className={styles.emptyTitle}>No matches</div>
            <div className={styles.emptyStateTxt}>Nothing found for &ldquo;{query}&rdquo;.</div>
          </div>
        ) : (
          filtered.map((r) => {
            const totalPrice = r.ingredients.reduce((s, ing) => {
              const p = prices[ing.name.toLowerCase().trim()] || 0;
              return s + p;
            }, 0);

            return (
              <div key={r.id} className={styles.recipeCard} onClick={() => onView(r.id)}>
                <span className={styles.rcEmoji} style={{ background: `${r.color}1a` }}>
                  {r.imageUrl
                    ? <img src={r.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 'inherit' }} />
                    : <UtensilsCrossed size={20} strokeWidth={1.75} style={{ color: r.color }} />}
                </span>
                <div className={styles.rcInfo}>
                  <div className={styles.rcName}>{r.name}</div>
                  <div className={styles.rcMeta}>
                    {r.sub} · {r.ingredients.length} ingredient{r.ingredients.length === 1 ? '' : 's'} · Serves {r.servings}
                  </div>
                  {(r.prepTime || r.cookTime) && (
                    <div className={styles.rcTime}>
                      <Clock size={11} strokeWidth={2} style={{ flexShrink: 0 }} />
                      <span className={styles.rcTimeText}>
                        {r.prepTime && r.cookTime
                          ? `${r.prepTime} min prep · ${r.cookTime} min cook`
                          : r.prepTime
                          ? `${r.prepTime} min prep`
                          : `${r.cookTime} min cook`}
                      </span>
                    </div>
                  )}
                </div>
                {totalPrice > 0 && <span className={styles.rcPrice}>${totalPrice.toFixed(2)}</span>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
