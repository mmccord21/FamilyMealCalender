'use client';

import { useState } from 'react';
import { ChefHat, BookOpen, CalendarDays, ShoppingCart } from 'lucide-react';
import styles from './OnboardingModal.module.css';

interface Props {
  open: boolean;
  onDone: () => void;
}

const STEPS = [
  {
    icon: <ChefHat size={48} strokeWidth={1.25} />,
    title: 'Welcome to Family Meal Planner',
    body: "Plan your family's meals for the week, build a smart grocery list, and never wonder 'what's for dinner?' again.",
  },
  {
    icon: <BookOpen size={48} strokeWidth={1.25} />,
    title: 'Build your recipe book',
    body: "Add your family's favorites — paste a URL, snap a photo, or type it in. Ingredients import automatically.",
  },
  {
    icon: <CalendarDays size={48} strokeWidth={1.25} />,
    title: 'Plan your week',
    body: 'Tap any day to assign a meal. Adjust servings on the spot. Set up recurring meals for things you make every week.',
  },
  {
    icon: <ShoppingCart size={48} strokeWidth={1.25} />,
    title: 'Shop smarter',
    body: "Your grocery list builds itself from the week's plan. Pantry items you already have are skipped automatically.",
  },
];

export default function OnboardingModal({ open, onDone }: Props) {
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);

  if (!open) return null;

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const advance = () => {
    if (isLast) {
      finish();
    } else {
      setStep((s) => s + 1);
    }
  };

  const finish = () => {
    setExiting(true);
    setTimeout(onDone, 280);
  };

  return (
    <div className={`${styles.overlay} ${exiting ? styles.exit : ''}`}>
      <div className={`${styles.card} ${exiting ? styles.cardExit : ''}`}>
        <div className={styles.iconWrap}>{current.icon}</div>

        <div className={styles.content}>
          <h2 className={styles.title}>{current.title}</h2>
          <p className={styles.body}>{current.body}</p>
        </div>

        <div className={styles.dots}>
          {STEPS.map((_, i) => (
            <span key={i} className={`${styles.dot} ${i === step ? styles.dotActive : ''}`} />
          ))}
        </div>

        <div className={styles.actions}>
          <button className={styles.ctaBtn} onClick={advance}>
            {isLast ? 'Get Started' : 'Next'}
          </button>
          {!isLast && (
            <button className={styles.skipBtn} onClick={finish}>
              Skip
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
