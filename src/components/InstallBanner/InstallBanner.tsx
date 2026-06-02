'use client';

import { useState, useEffect } from 'react';
import { X, Share, Plus } from 'lucide-react';
import styles from './InstallBanner.module.css';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallBanner() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true);

    if (isStandalone) return;

    const dismissed = sessionStorage.getItem('install-banner-dismissed');
    if (dismissed) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios/i.test(navigator.userAgent);
    setIsIOS(ios);

    if (ios) {
      setShow(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    setShow(false);
    sessionStorage.setItem('install-banner-dismissed', '1');
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShow(false);
    setDeferredPrompt(null);
  };

  if (!show) return null;

  return (
    <div className={styles.banner}>
      <div className={styles.iconWrap}>
        <img src="/icon.svg" alt="" className={styles.icon} />
      </div>
      <div className={styles.text}>
        <span className={styles.title}>Add to Home Screen</span>
        {isIOS ? (
          <span className={styles.sub}>
            Tap <Share size={12} className={styles.inlineIcon} /> then &ldquo;Add to Home Screen&rdquo;
          </span>
        ) : (
          <span className={styles.sub}>Install for a faster, offline experience</span>
        )}
      </div>
      {!isIOS && (
        <button className={styles.installBtn} onClick={install}>
          <Plus size={14} />
          Install
        </button>
      )}
      <button className={styles.close} onClick={dismiss} aria-label="Dismiss">
        <X size={16} />
      </button>
    </div>
  );
}
