'use client';

import styles from './BottomNav.module.css';

type Tab = 'plan' | 'recipes' | 'shop';

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const ITEMS: { id: Tab; icon: string; label: string }[] = [
  { id: 'plan',    icon: '🗓', label: 'WEEK' },
  { id: 'recipes', icon: '📚', label: 'RECIPES' },
  { id: 'shop',    icon: '🛒', label: 'SHOPPING' },
];

export default function BottomNav({ active, onChange }: Props) {
  return (
    <nav className={styles.nav}>
      {ITEMS.map((item) => (
        <button
          key={item.id}
          id={`nb-${item.id}`}
          className={`${styles.btn} ${active === item.id ? styles.on : ''}`}
          onClick={() => onChange(item.id)}
        >
          <span className={styles.icon}>{item.icon}</span>
          <span className={styles.label}>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
