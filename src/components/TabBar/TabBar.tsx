'use client';

import { CalendarDays, BookOpen, ShoppingCart, Package } from 'lucide-react';
import { haptic } from '@/lib/haptic';
import styles from './TabBar.module.css';

type Tab = 'plan' | 'recipes' | 'shop' | 'pantry';

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string; Icon: typeof CalendarDays }[] = [
  { id: 'plan',    label: 'Week',     Icon: CalendarDays },
  { id: 'recipes', label: 'Recipes',  Icon: BookOpen },
  { id: 'shop',    label: 'Shopping', Icon: ShoppingCart },
  { id: 'pantry',  label: 'Pantry',   Icon: Package },
];

export default function TabBar({ active, onChange }: Props) {
  return (
    <div className={styles.tabBar}>
      {TABS.map(({ id, label, Icon }) => (
        <button
          key={id}
          id={`tb-${id}`}
          className={`${styles.tab} ${active === id ? styles.on : ''}`}
          onClick={() => { haptic('select'); onChange(id); }}
        >
          <Icon size={16} strokeWidth={2} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
