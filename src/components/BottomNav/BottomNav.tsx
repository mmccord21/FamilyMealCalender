'use client';

import { CalendarDays, BookOpen, ShoppingCart } from 'lucide-react';
import styles from './BottomNav.module.css';

type Tab = 'plan' | 'recipes' | 'shop';

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const ITEMS: { id: Tab; Icon: typeof CalendarDays; label: string }[] = [
  { id: 'plan',    Icon: CalendarDays,  label: 'Week' },
  { id: 'recipes', Icon: BookOpen,      label: 'Recipes' },
  { id: 'shop',    Icon: ShoppingCart,  label: 'Shopping' },
];

export default function BottomNav({ active, onChange }: Props) {
  return (
    <nav className={styles.nav}>
      {ITEMS.map(({ id, Icon, label }) => (
        <button
          key={id}
          id={`nb-${id}`}
          className={`${styles.btn} ${active === id ? styles.on : ''}`}
          onClick={() => onChange(id)}
        >
          <span className={styles.icon}>
            <Icon size={22} strokeWidth={2} />
          </span>
          <span className={styles.label}>{label}</span>
        </button>
      ))}
    </nav>
  );
}
