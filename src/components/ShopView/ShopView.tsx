'use client';

import { useState } from 'react';
import { ShoppingCart, Leaf, Package, Copy, Check, CalendarDays, Plus, X } from 'lucide-react';
import type { Store, ShoppingItem, ManualShoppingItem } from '@/types';
import { CATS, fmtShopAmt } from '@/lib/helpers';
import styles from './ShopView.module.css';

interface Props {
  shoppingList: ShoppingItem[];
  checkedItems: Record<string, boolean>;
  prices: Record<string, number>;
  manualItems: ManualShoppingItem[];
  onToggleCheck: (itemKey: string, checked: boolean) => void;
  onResetChecked: () => void;
  onOpenPrice: (itemKey: string, name: string, amt: string) => void;
  onCopy: (txt: string) => void;
  onAddManualItem: (name: string) => void;
  onDeleteManualItem: (id: string) => void;
}

export default function ShopView({
  shoppingList, checkedItems, prices, manualItems,
  onToggleCheck, onResetChecked, onOpenPrice, onCopy,
  onAddManualItem, onDeleteManualItem,
}: Props) {
  const [storeF, setStoreF] = useState<Store | 'all'>('all');
  const [newItem, setNewItem] = useState('');

  const visible = storeF === 'all' ? shoppingList : shoppingList.filter((i) => i.store === storeF);
  const checkedCount = visible.filter((i) => checkedItems[i.name.toLowerCase().trim()]).length
    + manualItems.filter((i) => checkedItems[`m:${i.id}`]).length;
  const totalCount = visible.length + manualItems.length;

  const total = visible.reduce((s, item) => s + (prices[item.name.toLowerCase().trim()] || 0), 0);

  const handleAdd = () => {
    const t = newItem.trim();
    if (!t) return;
    onAddManualItem(t);
    setNewItem('');
  };

  const handleCopy = () => {
    const activeItems = visible.filter((i) => !checkedItems[i.name.toLowerCase().trim()]);
    const activeManual = manualItems.filter((i) => !checkedItems[`m:${i.id}`]);
    let txt = '🛒 GROCERY LIST\n\n';
    Object.entries(CATS).forEach(([k, cat]) => {
      const items = activeItems.filter((i) => i.cat === k);
      if (!items.length) return;
      txt += `${cat.i} ${cat.l.toUpperCase()}\n`;
      items.forEach((i) => txt += `• ${i.name} — ${fmtShopAmt(i)}\n`);
      txt += '\n';
    });
    if (activeManual.length) {
      txt += `📝 CUSTOM\n`;
      activeManual.forEach((i) => txt += `• ${i.name}\n`);
      txt += '\n';
    }
    onCopy(txt);
  };

  return (
    <div className={styles.view}>
      <div className={styles.filterRow}>
        <button className={`${styles.sfBtn} ${storeF === 'all' ? styles.on : ''}`} onClick={() => setStoreF('all')}><ShoppingCart size={14} strokeWidth={2} /> All</button>
        <button className={`${styles.sfBtn} ${storeF === 'sprouts' ? styles.on : ''}`} onClick={() => setStoreF('sprouts')}><Leaf size={14} strokeWidth={2} /> Sprouts</button>
        <button className={`${styles.sfBtn} ${storeF === 'costco' ? styles.on : ''}`} onClick={() => setStoreF('costco')}><Package size={14} strokeWidth={2} /> Costco</button>
      </div>

      <div className={styles.addRow}>
        <input
          className={styles.addInput}
          type="text"
          placeholder="Add an item…"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <button className={styles.addBtn} onClick={handleAdd} aria-label="Add item">
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      <div className={styles.shopHdr}>
        <span className={styles.prog}><strong>{checkedCount}</strong> of <strong>{totalCount}</strong> checked</span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button className={`${styles.btnSm} ${styles.btnC}`} onClick={handleCopy}><Copy size={13} strokeWidth={2} /> Copy</button>
          <button className={`${styles.btnSm} ${styles.btnR}`} onClick={onResetChecked}>Reset</button>
        </div>
      </div>

      {shoppingList.length === 0 && manualItems.length === 0 ? (
        <div className={styles.shopEmpty}>
          <div className={styles.shopEmptyIcon}><CalendarDays size={28} strokeWidth={1.75} /></div>
          <div className={styles.shopEmptyTitle}>Nothing to shop for yet</div>
          <div className={styles.shopEmptyTxt}>Assign meals to your week or add items above and your shopping list builds itself automatically.</div>
        </div>
      ) : (
        <>
          {Object.entries(CATS).map(([key, cat]) => {
            const items = visible.filter((i) => i.cat === key);
            if (items.length === 0) return null;

            return (
              <div key={key} className={styles.catSec}>
                <div className={styles.catHdr} style={{ borderColor: cat.c }}>
                  <span className={styles.catIcon}>{cat.i}</span>
                  <span className={styles.catLbl} style={{ color: cat.c }}>{cat.l}</span>
                </div>
                {items.map((item) => {
                  const mk = item.name.toLowerCase().trim();
                  const done = checkedItems[mk];
                  const p = prices[mk] || 0;

                  return (
                    <div key={item.mid} className={`${styles.sItem} ${done ? styles.done : ''}`} onClick={() => onToggleCheck(mk, !done)}>
                      <div className={`${styles.chk} ${done ? styles.chkOn : ''}`}>
                        {done && <Check size={14} strokeWidth={3} className={styles.chkMark} />}
                      </div>
                      <div className={styles.iInfo}>
                        <div className={styles.iName}>{item.name}</div>
                        <div className={styles.iAmt}>{fmtShopAmt(item)}</div>
                        <div className={styles.iChips}>
                          {item.days.map((d, idx) => (
                            <span key={idx} className={styles.mChip}>{d.key}</span>
                          ))}
                          {item.days.length > 1 && <span className={styles.sharedChip}>SHARED</span>}
                          <span className={item.store === 'sprouts' ? styles.storeS : styles.storeC}>
                            {item.store === 'sprouts' ? <Leaf size={11} strokeWidth={2.25} /> : <Package size={11} strokeWidth={2.25} />}
                            {item.store === 'sprouts' ? 'Sprouts' : 'Costco'}
                          </span>
                        </div>
                      </div>
                      <div className={styles.iRight}>
                        <span
                          className={`${styles.priceBadge} ${p ? styles.priceSet : styles.priceNone}`}
                          onClick={(e) => { e.stopPropagation(); onOpenPrice(mk, item.name, fmtShopAmt(item)); }}
                        >
                          {p ? `$${p}` : 'set $'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {manualItems.length > 0 && (
            <div className={styles.catSec}>
              <div className={`${styles.catHdr} ${styles.catHdrCustom}`}>
                <span className={styles.catIcon}>📝</span>
                <span className={`${styles.catLbl} ${styles.catLblCustom}`}>Custom</span>
              </div>
              {manualItems.map((item) => {
                const mk = `m:${item.id}`;
                const done = checkedItems[mk];
                return (
                  <div key={item.id} className={`${styles.sItem} ${done ? styles.done : ''}`} onClick={() => onToggleCheck(mk, !done)}>
                    <div className={`${styles.chk} ${done ? styles.chkOn : ''}`}>
                      {done && <Check size={14} strokeWidth={3} className={styles.chkMark} />}
                    </div>
                    <div className={styles.iInfo}>
                      <div className={styles.iName}>{item.name}</div>
                    </div>
                    <button
                      className={styles.delBtn}
                      onClick={(e) => { e.stopPropagation(); onDeleteManualItem(item.id); }}
                      aria-label="Remove item"
                    >
                      <X size={15} strokeWidth={2.5} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <div className={styles.totalBar}>
        <div>
          <div className={styles.tLbl}>Estimated Total</div>
          <div className={styles.tSub}>tap any price to update</div>
        </div>
        <div className={styles.tNum}>${total.toFixed(2)}</div>
      </div>
    </div>
  );
}
