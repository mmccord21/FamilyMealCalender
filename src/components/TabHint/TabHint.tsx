'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import styles from './TabHint.module.css';

interface Props {
  tabKey: string;
  icon: ReactNode;
  message: string;
}

export default function TabHint({ tabKey, icon, message }: Props) {
  const storageKey = `tonight_hint_${tabKey}`;
  const [visible, setVisible] = useState(false);
  const [hiding, setHiding] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(storageKey)) setVisible(true);
  }, [storageKey]);

  if (!visible) return null;

  const dismiss = () => {
    setHiding(true);
    localStorage.setItem(storageKey, '1');
    setTimeout(() => setVisible(false), 220);
  };

  return (
    <div className={`${styles.hint} ${hiding ? styles.hide : ''}`}>
      <span className={styles.icon}>{icon}</span>
      <p className={styles.msg}>{message}</p>
      <button className={styles.close} onClick={dismiss} aria-label="Dismiss tip">
        <X size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
}
