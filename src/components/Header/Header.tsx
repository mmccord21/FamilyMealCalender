'use client';

import { UtensilsCrossed } from 'lucide-react';
import styles from './Header.module.css';
import { SignInButton, UserButton, useAuth } from '@clerk/nextjs';

interface Props {
  total: number;
}

export default function Header({ total }: Props) {
  const { isLoaded, isSignedIn } = useAuth();
  return (
    <header className={styles.hdr}>
      <div className={styles.brand}>
        <span className={styles.mark}>
          <UtensilsCrossed size={16} strokeWidth={2} />
        </span>
        <span className={styles.wordmark}>Meal Planner</span>
      </div>

      <div className={styles.right}>
        <div className={styles.budget}>
          <span className={styles.budgetNum}>${total}</span>
          <span className={styles.budgetLabel}>est. week</span>
        </div>
        {isLoaded && isSignedIn && <UserButton />}
        {isLoaded && !isSignedIn && (
          <SignInButton mode="modal">
            <button className={styles.signIn}>Sign In</button>
          </SignInButton>
        )}
      </div>
    </header>
  );
}
