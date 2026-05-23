'use client';

import styles from './TabBar.module.css';

type Tab = 'plan' | 'recipes' | 'shop';

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'plan',    label: '🗓 Week' },
  { id: 'recipes', label: '📚 Recipes' },
  { id: 'shop',    label: '🛒 Shopping' },
];

export default function TabBar({ active, onChange }: Props) {
  return (
    <div className={styles.tabBar}>
      {TABS.map((t) => (
        <button
          key={t.id}
          id={`tb-${t.id}`}
          className={`${styles.tab} ${active === t.id ? styles.on : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
