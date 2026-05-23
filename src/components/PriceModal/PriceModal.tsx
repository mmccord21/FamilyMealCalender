'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/Modal/Modal';
import styles from './PriceModal.module.css';

interface Props {
  open: boolean;
  itemKey: string;
  name: string;
  amt: string;
  currentPrice: number;
  onClose: () => void;
  onSave: (itemKey: string, price: number) => void;
}

export default function PriceModal({ open, itemKey, name, amt, currentPrice, onClose, onSave }: Props) {
  const [val, setVal] = useState('');

  useEffect(() => {
    if (open) {
      setVal(currentPrice ? currentPrice.toString() : '');
    }
  }, [open, currentPrice]);

  return (
    <Modal open={open} onBackdropClick={onClose}>
      <div className={styles.title}>{name}</div>
      <div className={styles.desc}>Amount needed: {amt}</div>
      
      <div className={styles.inputRow}>
        <span className={styles.dollar}>$</span>
        <input
          className={styles.priceIn}
          type="number" step="0.50" min="0" placeholder="0.00"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          autoFocus
        />
      </div>
      
      <div className={styles.helpTxt}>
        Enter what you paid at Sprouts or Costco for the amount shown. Saves automatically for future weeks.
      </div>
      
      <div className={styles.actions}>
        <button className={styles.btnSec} onClick={onClose}>Cancel</button>
        <button className={styles.btnPri} onClick={() => onSave(itemKey, parseFloat(val) || 0)}>Save</button>
      </div>
    </Modal>
  );
}
