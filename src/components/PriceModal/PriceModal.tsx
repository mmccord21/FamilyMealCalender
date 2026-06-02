'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/Modal/Modal';
import styles from './PriceModal.module.css';

interface Props {
  open: boolean;
  itemKey: string;
  name: string;
  amt: string;
  qty: number;
  unit: string;
  currentPrice: number;
  isEstimated?: boolean;
  onClose: () => void;
  onSave: (itemKey: string, price: number) => void;
}

export default function PriceModal({ open, itemKey, name, amt, qty, unit, currentPrice, isEstimated, onClose, onSave }: Props) {
  const [val, setVal] = useState('');

  useEffect(() => {
    if (open) setVal(currentPrice ? currentPrice.toString() : '');
  }, [open, currentPrice]);

  const unitLabel = unit || 'item';
  const parsed = parseFloat(val) || 0;
  const total = qty > 0 ? parsed * qty : parsed;
  const showTotal = qty > 0 && parsed > 0;

  return (
    <Modal open={open} onBackdropClick={onClose}>
      <div className={styles.title}>{name}</div>
      <div className={styles.desc}>Needed: {amt}</div>

      <div className={styles.unitLabel}>Price per {unitLabel}</div>
      <div className={styles.inputRow}>
        <span className={styles.dollar}>$</span>
        <input
          className={styles.priceIn}
          type="number" step="0.25" min="0" placeholder="0.00"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          autoFocus
        />
      </div>

      {showTotal && (
        <div className={styles.totalPreview}>
          × {qty} {unit} = <strong>${total.toFixed(2)}</strong> estimated total
        </div>
      )}

      <div className={styles.helpTxt}>
        {isEstimated
          ? 'AI estimate — may not match your store. Update with what you actually pay.'
          : 'Saves for future weeks. Price is per unit so it scales with quantity.'}
      </div>

      <div className={styles.actions}>
        <button className={styles.btnSec} onClick={onClose}>Cancel</button>
        <button className={styles.btnPri} onClick={() => onSave(itemKey, parsed)}>Save</button>
      </div>
    </Modal>
  );
}
