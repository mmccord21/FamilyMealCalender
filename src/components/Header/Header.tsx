'use client';

import styles from './Header.module.css';
import { SignInButton, UserButton, useAuth } from '@clerk/nextjs';

interface Props {
  total: number;
}

export default function Header({ total }: Props) {
  const { isLoaded, isSignedIn } = useAuth();
  return (
    <header className={styles.hdr}>
      <div className={styles.row}>
        <div>
          <div className={styles.eyebrow}>Weekly Meal Planner</div>
          <h1 className={styles.title}>
            Your Week,<br /><em>Beautifully Planned</em>
          </h1>
          <div className={styles.sub}>Keto · Sprouts &amp; Costco</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
          <div className={styles.budget}>
            <div className={styles.budgetNum}>${total}</div>
            <div className={styles.budgetLabel}>Est. Week</div>
          </div>
          {isLoaded && isSignedIn && (
            <UserButton />
          )}
          {isLoaded && !isSignedIn && (
            <SignInButton mode="modal">
              <button style={{ background: 'var(--sage)', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '100px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Sign In</button>
            </SignInButton>
          )}
        </div>
      </div>
    </header>
  );
}
