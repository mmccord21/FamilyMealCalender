'use client';

import { useState, useRef } from 'react';
import { ShoppingCart, ShoppingBag, Copy, Check, CalendarDays, Plus, X, Settings2, Sparkles, Info } from 'lucide-react';
import type { ShoppingItem, ManualShoppingItem, UserStore } from '@/types';
import { CATS, fmtShopAmt } from '@/lib/helpers';
import styles from './ShopView.module.css';

interface Props {
  shoppingList: ShoppingItem[];
  checkedItems: Record<string, boolean>;
  hiddenItems: Record<string, boolean>;
  prices: Record<string, number>;
  estimatedPrices: Record<string, boolean>;
  qtyOverrides: Record<string, number>;
  manualItems: ManualShoppingItem[];
  stores: UserStore[];
  onToggleCheck: (itemKey: string, checked: boolean) => void;
  onResetChecked: () => void;
  onClearChecked: () => void;
  onOpenPrice: (itemKey: string, name: string, amt: string, qty: number, unit: string) => void;
  onCopy: (txt: string) => void;
  onAddManualItem: (name: string) => void;
  onDeleteManualItem: (id: string) => void;
  onSetQtyOverride: (itemKey: string, qty: number) => void;
  onHideItem: (itemKey: string) => void;
  onRestoreHidden: () => void;
  onAddStore: (name: string) => void;
  onDeleteStore: (id: string) => void;
  onEstimatePrices: () => Promise<void>;
}

export default function ShopView({
  shoppingList, checkedItems, hiddenItems, prices, estimatedPrices, qtyOverrides, manualItems, stores = [],
  onToggleCheck, onResetChecked, onClearChecked, onOpenPrice, onCopy,
  onAddManualItem, onDeleteManualItem, onSetQtyOverride,
  onHideItem, onRestoreHidden,
  onAddStore, onDeleteStore, onEstimatePrices,
}: Props) {
  const [storeF, setStoreF] = useState<string>('all');
  const [showStoreManager, setShowStoreManager] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [newItem, setNewItem] = useState('');
  const [editingQty, setEditingQty] = useState<string | null>(null);
  const [qtyDraft, setQtyDraft] = useState('');
  const [estimating, setEstimating] = useState(false);
  const qtyInputRef = useRef<HTMLInputElement>(null);

  const storeFiltered = storeF === 'all' ? shoppingList : shoppingList.filter((i) => i.store?.toLowerCase() === storeF.toLowerCase());
  const visible = storeFiltered.filter((i) => !hiddenItems[i.name.toLowerCase().trim()]);
  const hiddenCount = shoppingList.filter((i) => hiddenItems[i.name.toLowerCase().trim()]).length;
  const checkedCount = visible.filter((i) => checkedItems[i.name.toLowerCase().trim()]).length
    + manualItems.filter((i) => checkedItems[`m:${i.id}`]).length;
  const totalCount = visible.length + manualItems.length;

  const itemCost = (mk: string, item: ShoppingItem) => {
    const p = prices[mk] || 0;
    if (!p) return 0;
    const qty = qtyOverrides[mk] ?? item.totalQty;
    return qty > 0 ? p * qty : p;
  };
  const total = visible.reduce((s, item) => s + itemCost(item.name.toLowerCase().trim(), item), 0);
  const hasUnpriced = visible.some((i) => !prices[i.name.toLowerCase().trim()]);
  const hasEstimates = visible.some((i) => estimatedPrices[i.name.toLowerCase().trim()]);

  const commitQty = (mk: string) => {
    const n = parseFloat(qtyDraft);
    if (!isNaN(n) && n > 0) onSetQtyOverride(mk, n);
    setEditingQty(null);
  };

  const handleEstimate = async () => {
    setEstimating(true);
    try { await onEstimatePrices(); } finally { setEstimating(false); }
  };

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

  const handleAddStore = () => {
    const t = newStoreName.trim();
    if (!t) return;
    onAddStore(t);
    setNewStoreName('');
  };

  return (
    <div className={styles.view}>
      <div className={styles.filterRow}>
        <button className={`${styles.sfBtn} ${storeF === 'all' ? styles.on : ''}`} onClick={() => setStoreF('all')}><ShoppingCart size={14} strokeWidth={2} /> All</button>
        {stores.map((s) => (
          <button key={s.id} className={`${styles.sfBtn} ${storeF === s.name ? styles.on : ''}`} onClick={() => setStoreF(s.name)}>
            <ShoppingBag size={14} strokeWidth={2} /> {s.name}
          </button>
        ))}
      </div>

      {showStoreManager && (
        <div className={styles.storePanel}>
          {stores.map((s) => (
            <div key={s.id} className={styles.storePanelItem}>
              <span className={styles.storePanelName}>{s.name}</span>
              <button className={styles.storePanelDel} onClick={() => { onDeleteStore(s.id); if (storeF === s.name) setStoreF('all'); }} aria-label={`Delete ${s.name}`}><X size={14} strokeWidth={2.5} /></button>
            </div>
          ))}
          <div className={styles.storePanelAdd}>
            <input
              className={styles.storePanelInput}
              placeholder="New store name…"
              value={newStoreName}
              onChange={(e) => setNewStoreName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddStore()}
            />
            <button className={styles.storePanelBtn} onClick={handleAddStore} disabled={!newStoreName.trim()}>Add</button>
          </div>
        </div>
      )}

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className={styles.prog}><strong>{checkedCount}</strong> of <strong>{totalCount}</strong> checked</span>
          <button className={styles.manageLink} onClick={() => setShowStoreManager((v) => !v)} aria-label="Manage stores">
            <Settings2 size={13} strokeWidth={2} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(hasUnpriced || hasEstimates) && (
            <button
              className={`${styles.btnSm} ${styles.btnE}`}
              onClick={handleEstimate}
              disabled={estimating}
              aria-label="Estimate prices with AI"
            >
              <Sparkles size={13} strokeWidth={2} />
              {estimating ? 'Estimating…' : 'Estimate $'}
            </button>
          )}
          <button className={`${styles.btnSm} ${styles.btnC}`} onClick={handleCopy}><Copy size={13} strokeWidth={2} /> Copy</button>
          {checkedCount > 0 && (
            <button className={`${styles.btnSm} ${styles.btnDel}`} onClick={onClearChecked}>Clear checked</button>
          )}
          <button className={`${styles.btnSm} ${styles.btnR}`} onClick={onResetChecked}>Reset</button>
        </div>
      </div>

      {hasEstimates && (
        <div className={styles.estimateBar}>
          <Info size={13} strokeWidth={2} className={styles.estimateBarIcon} />
          <span>AI price estimates — tap any <strong>~$</strong> to update</span>
        </div>
      )}

      {hiddenCount > 0 && (
        <div className={styles.hiddenBar}>
          <span>{hiddenCount} item{hiddenCount !== 1 ? 's' : ''} hidden</span>
          <button className={styles.restoreBtn} onClick={onRestoreHidden}>Restore</button>
        </div>
      )}

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
                        <div className={styles.iAmt}>
                          {editingQty === mk ? (
                            <input
                              ref={qtyInputRef}
                              className={styles.qtyInput}
                              type="number"
                              min="0"
                              step="any"
                              value={qtyDraft}
                              autoFocus
                              onChange={(e) => setQtyDraft(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') { e.preventDefault(); commitQty(mk); }
                                if (e.key === 'Escape') setEditingQty(null);
                              }}
                              onBlur={() => commitQty(mk)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <button
                              className={`${styles.qtyBtn} ${qtyOverrides[mk] != null ? styles.qtyOverridden : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                const cur = qtyOverrides[mk] ?? item.totalQty;
                                setQtyDraft(String(cur));
                                setEditingQty(mk);
                              }}
                              aria-label="Edit quantity"
                            >
                              {qtyOverrides[mk] != null
                                ? `${qtyOverrides[mk]}${item.unit ? ` ${item.unit}` : ''}`
                                : fmtShopAmt(item)}
                            </button>
                          )}
                          {qtyOverrides[mk] != null && editingQty !== mk && (
                            <span className={styles.qtyDot} aria-label="edited" />
                          )}
                        </div>
                        <div className={styles.iChips}>
                          {item.days.map((d, idx) => (
                            <span key={idx} className={styles.mChip}>{d.key}</span>
                          ))}
                          {item.days.length > 1 && <span className={styles.sharedChip}>SHARED</span>}
                          {item.store && (
                            <span className={styles.storeChip}>
                              <ShoppingBag size={11} strokeWidth={2.25} />{item.store}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={styles.iRight}>
                        <span
                          className={`${styles.priceBadge} ${p ? (estimatedPrices[mk] ? styles.priceEst : styles.priceSet) : styles.priceNone}`}
                          onClick={(e) => { e.stopPropagation(); onOpenPrice(mk, item.name, fmtShopAmt(item), qtyOverrides[mk] ?? item.totalQty, item.unit); }}
                        >
                          {p ? (() => {
                            const cost = itemCost(mk, item);
                            const display = `$${cost.toFixed(2)}`;
                            return estimatedPrices[mk] ? `~${display}` : display;
                          })() : 'set $'}
                        </span>
                        <button
                          className={styles.hideBtn}
                          onClick={(e) => { e.stopPropagation(); onHideItem(mk); }}
                          aria-label="Remove from list"
                        >
                          <X size={13} strokeWidth={2.5} />
                        </button>
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
