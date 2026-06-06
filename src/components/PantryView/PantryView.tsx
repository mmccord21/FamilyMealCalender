'use client';

import { useState, useRef, useEffect } from 'react';
import { Package, Plus, Trash2, AlertTriangle, ChevronDown, ChevronUp, Check, Mic, Square, Loader } from 'lucide-react';
import type { PantryItem, Recipe } from '@/types';
import styles from './PantryView.module.css';

type SpeechResult = { isFinal: boolean; [i: number]: { transcript: string } };
type SpeechResultList = { length: number; [i: number]: SpeechResult };
type SpeechEvt = { resultIndex: number; results: SpeechResultList };
type SpeechRecognitionInstance = {
  continuous: boolean; interimResults: boolean; lang: string;
  onresult: ((e: SpeechEvt) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

interface Props {
  pantryItems: PantryItem[];
  recipes: Recipe[];
  onAddItem: (name: string, qty: number, unit: string) => void;
  onUpdateQty: (name: string, qty: number, unit: string) => void;
  onRemoveItem: (name: string) => void;
}

const COMMON_UNITS = ['whole', 'count', 'oz', 'lbs', 'g', 'kg', 'tsp', 'tbsp', 'cups', 'fl oz', 'ml', 'L', 'can', 'bottle', 'bag', 'bunch', 'clove', 'slice'];

type VoicePhase = 'recording' | 'parsing' | 'reviewing';
type ReviewItem = { name: string; qty: number; unit: string; checked: boolean; editQty: string; editUnit: string };

export default function PantryView({ pantryItems, recipes, onAddItem, onUpdateQty, onRemoveItem }: Props) {
  const [showImport, setShowImport] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editQty, setEditQty] = useState('');
  const [importChecked, setImportChecked] = useState<Record<string, { qty: string; unit: string }>>({});
  const [addName, setAddName] = useState('');
  const [addQty, setAddQty] = useState('');
  const [addUnit, setAddUnit] = useState('whole');
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const addNameRef = useRef<HTMLInputElement>(null);

  const [voicePhase, setVoicePhase] = useState<VoicePhase | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [voiceError, setVoiceError] = useState('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const transcriptRef = useRef('');

  useEffect(() => () => { recognitionRef.current?.abort(); }, []);

  const allIngredients: { name: string; unit: string }[] = [];
  const seen = new Set<string>();
  for (const r of recipes) {
    for (const ing of r.ingredients) {
      const key = ing.name.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        allIngredients.push({ name: ing.name, unit: ing.unit ?? 'whole' });
      }
    }
  }

  const pantryNames = new Set(pantryItems.map((p) => p.name));
  const importCandidates = allIngredients.filter((i) => !pantryNames.has(i.name.toLowerCase().trim()));

  function handleImportToggle(key: string, unit: string) {
    setImportChecked((prev) => {
      if (prev[key]) { const next = { ...prev }; delete next[key]; return next; }
      return { ...prev, [key]: { qty: '1', unit } };
    });
  }

  function commitImport() {
    for (const [name, { qty, unit }] of Object.entries(importChecked)) {
      const n = Number(qty);
      if (!isNaN(n) && n > 0) onAddItem(name, n, unit);
    }
    setImportChecked({});
    setShowImport(false);
  }

  function handleNameInput(val: string) {
    setAddName(val);
    if (!val.trim()) { setNameSuggestions([]); return; }
    const q = val.toLowerCase();
    setNameSuggestions(allIngredients.filter((i) => i.name.toLowerCase().includes(q)).slice(0, 5).map((m) => m.name));
  }

  function selectSuggestion(name: string) {
    setAddName(name);
    const match = allIngredients.find((i) => i.name.toLowerCase() === name.toLowerCase());
    if (match?.unit) setAddUnit(match.unit);
    setNameSuggestions([]);
    addNameRef.current?.focus();
  }

  function commitAdd() {
    const n = Number(addQty);
    if (!addName.trim() || isNaN(n) || n <= 0) return;
    onAddItem(addName.trim(), n, addUnit);
    setAddName(''); setAddQty(''); setAddUnit('whole'); setShowAddForm(false);
  }

  function startEdit(name: string, qty: number) { setEditingName(name); setEditQty(String(qty)); }

  function commitEdit(item: PantryItem) {
    const n = Number(editQty);
    if (!isNaN(n) && n >= 0) onUpdateQty(item.name, n, item.unit);
    setEditingName(null);
  }

  function startVoice() {
    const win = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
    const SpeechRecognitionAPI: SpeechRecognitionCtor | undefined =
      typeof window !== 'undefined' ? (win.SpeechRecognition ?? win.webkitSpeechRecognition) : undefined;

    transcriptRef.current = '';
    setTranscript('');
    setVoiceError('');
    setReviewItems([]);
    setVoicePhase('recording');
    setShowAddForm(false);
    setShowImport(false);

    if (!SpeechRecognitionAPI) {
      setVoiceError('Voice input requires Chrome, Edge, or Safari.');
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (e: SpeechEvt) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) transcriptRef.current += t + ' ';
        else interim += t;
      }
      setTranscript(transcriptRef.current + interim);
    };

    recognition.onerror = () => {
      setIsListening(false);
      setVoiceError('Microphone error — check browser permissions and try again.');
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.start();
    recognitionRef.current = recognition;
    setIsListening(true);
  }

  async function stopAndParse() {
    const rec = recognitionRef.current;
    recognitionRef.current = null;
    rec?.stop();
    setIsListening(false);

    await new Promise((r) => setTimeout(r, 200));

    const text = transcriptRef.current.trim();
    if (!text) {
      setVoiceError("Didn't catch anything — try speaking closer to the microphone.");
      return;
    }

    setVoicePhase('parsing');
    try {
      const res = await fetch('/api/pantry/voice-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: text }),
      });
      const data = await res.json() as { items?: { name: string; qty: number; unit: string }[]; error?: string };
      if (!res.ok || !Array.isArray(data.items) || !data.items.length) {
        setVoiceError("Couldn't find any pantry items — try again.");
        setVoicePhase('recording');
        return;
      }
      setReviewItems(data.items.map((item) => ({
        ...item,
        checked: true,
        editQty: String(item.qty),
        editUnit: item.unit,
      })));
      setVoicePhase('reviewing');
    } catch {
      setVoiceError('Something went wrong — try again.');
      setVoicePhase('recording');
    }
  }

  function commitVoice() {
    for (const item of reviewItems.filter((i) => i.checked)) {
      const n = Number(item.editQty);
      if (!isNaN(n) && n > 0) onAddItem(item.name, n, item.editUnit);
    }
    closeVoice();
  }

  function closeVoice() {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setIsListening(false);
    setVoicePhase(null);
    setTranscript('');
    setReviewItems([]);
    setVoiceError('');
    transcriptRef.current = '';
  }

  const lowStockItems = pantryItems.filter((p) => p.lowStockQty != null && p.qty <= p.lowStockQty);
  const confirmedCount = reviewItems.filter((i) => i.checked).length;

  return (
    <div className={styles.view}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <Package size={18} strokeWidth={2} className={styles.titleIcon} />
          <h2 className={styles.title}>Pantry</h2>
          {pantryItems.length > 0 && <span className={styles.countChip}>{pantryItems.length}</span>}
        </div>
        <div className={styles.headerActions}>
          <button
            className={`${styles.voiceBtn} ${voicePhase ? styles.voiceBtnOpen : ''}`}
            onClick={voicePhase ? closeVoice : startVoice}
          >
            <Mic size={13} strokeWidth={2.5} />
            <span>{voicePhase ? 'Close' : 'Speak'}</span>
          </button>
          <button className={styles.addBtn} onClick={() => { setShowAddForm(true); setShowImport(false); closeVoice(); }}>
            <Plus size={16} strokeWidth={2.5} />
            Add item
          </button>
        </div>
      </div>

      {lowStockItems.length > 0 && (
        <div className={styles.lowStockBanner}>
          <AlertTriangle size={14} strokeWidth={2} />
          <span>{lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} running low — added to grocery list</span>
        </div>
      )}

      {voicePhase && (
        <div className={styles.voicePanel}>
          {voicePhase === 'recording' && (
            <>
              <div className={styles.voicePanelTitle}>Speak your pantry</div>
              <p className={styles.voiceHint}>Walk through your kitchen and name everything you have.</p>
              {voiceError && <div className={styles.voiceError}>{voiceError}</div>}
              <div className={styles.voiceTranscript}>
                {transcript
                  ? <span className={styles.voiceTranscriptText}>{transcript}</span>
                  : <span className={styles.voiceTranscriptPlaceholder}>Listening…</span>
                }
              </div>
              <div className={styles.voiceMicRow}>
                {isListening ? (
                  <button className={styles.voiceMicBtn} onClick={stopAndParse} aria-label="Stop and parse">
                    <span className={styles.voiceMicPulse} />
                    <Square size={16} strokeWidth={0} fill="white" />
                  </button>
                ) : (
                  <button className={`${styles.voiceMicBtn} ${styles.voiceMicBtnIdle}`} onClick={startVoice} aria-label="Start recording">
                    <Mic size={18} strokeWidth={2} />
                  </button>
                )}
                <span className={styles.voiceMicLabel}>
                  {isListening
                    ? 'Recording… tap to stop & parse'
                    : transcript
                      ? 'Tap mic to record more, or parse below'
                      : 'Tap to start recording'}
                </span>
              </div>
              {!isListening && transcript && (
                <button className={styles.voiceParseBtn} onClick={stopAndParse}>
                  Parse with AI →
                </button>
              )}
            </>
          )}

          {voicePhase === 'parsing' && (
            <div className={styles.voiceParsing}>
              <Loader size={18} strokeWidth={2} className={styles.voiceSpinner} />
              <span>Parsing your pantry…</span>
            </div>
          )}

          {voicePhase === 'reviewing' && (
            <>
              <div className={styles.voicePanelTitle}>
                AI found {reviewItems.length} item{reviewItems.length !== 1 ? 's' : ''} — review &amp; confirm
              </div>
              <div className={styles.voiceReviewList}>
                {reviewItems.map((item, i) => (
                  <div key={i} className={`${styles.voiceReviewItem} ${!item.checked ? styles.voiceReviewItemOff : ''}`}>
                    <button
                      className={styles.voiceReviewCheck}
                      onClick={() => setReviewItems((prev) => prev.map((r, j) => j === i ? { ...r, checked: !r.checked } : r))}
                    >
                      <div className={`${styles.voiceCheckBox} ${item.checked ? styles.voiceCheckBoxOn : ''}`}>
                        {item.checked && <Check size={10} strokeWidth={3} />}
                      </div>
                      <span className={styles.voiceReviewName}>{item.name}</span>
                    </button>
                    <div className={styles.voiceReviewQtyRow}>
                      <input
                        className={styles.voiceQtyInput}
                        type="number"
                        min="0"
                        step="any"
                        value={item.editQty}
                        onChange={(e) => setReviewItems((prev) => prev.map((r, j) => j === i ? { ...r, editQty: e.target.value } : r))}
                      />
                      <select
                        className={styles.voiceUnitSelect}
                        value={item.editUnit}
                        onChange={(e) => setReviewItems((prev) => prev.map((r, j) => j === i ? { ...r, editUnit: e.target.value } : r))}
                      >
                        {COMMON_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
              <div className={styles.voiceReviewActions}>
                <button className={styles.voiceConfirmBtn} disabled={confirmedCount === 0} onClick={commitVoice}>
                  Add {confirmedCount} item{confirmedCount !== 1 ? 's' : ''} to Pantry
                </button>
                <button className={styles.voiceCancelBtn} onClick={closeVoice}>Cancel</button>
              </div>
            </>
          )}
        </div>
      )}

      {showAddForm && (
        <div className={styles.addForm}>
          <div className={styles.addFormTitle}>Add pantry item</div>
          <div className={styles.addRow}>
            <div className={styles.nameWrap}>
              <input
                ref={addNameRef}
                className={styles.addInput}
                placeholder="Ingredient name…"
                value={addName}
                onChange={(e) => handleNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') commitAdd(); if (e.key === 'Escape') setShowAddForm(false); }}
                autoFocus
              />
              {nameSuggestions.length > 0 && (
                <div className={styles.suggestions}>
                  {nameSuggestions.map((s) => (
                    <button key={s} className={styles.suggestion} onMouseDown={() => selectSuggestion(s)}>{s}</button>
                  ))}
                </div>
              )}
            </div>
            <input
              className={styles.qtyInput}
              placeholder="Qty"
              type="number"
              min="0"
              step="any"
              value={addQty}
              onChange={(e) => setAddQty(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') commitAdd(); }}
            />
            <select className={styles.unitSelect} value={addUnit} onChange={(e) => setAddUnit(e.target.value)}>
              {COMMON_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className={styles.addFormActions}>
            <button className={styles.addSubmit} disabled={!addName.trim() || !addQty} onClick={commitAdd}>
              Add to Pantry
            </button>
            <button className={styles.addCancel} onClick={() => setShowAddForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {importCandidates.length > 0 && (
        <button className={styles.importRow} onClick={() => { setShowImport((v) => !v); setShowAddForm(false); }}>
          <span>Import from my recipes</span>
          {showImport ? <ChevronUp size={14} strokeWidth={2} /> : <ChevronDown size={14} strokeWidth={2} />}
        </button>
      )}

      {showImport && (
        <div className={styles.importPanel}>
          <div className={styles.importHint}>Tap ingredients you currently have, enter amounts, then tap Add.</div>
          <div className={styles.importList}>
            {importCandidates.map((ing) => {
              const key = ing.name.toLowerCase().trim();
              const checked = !!importChecked[key];
              return (
                <div key={key} className={`${styles.importItem} ${checked ? styles.importItemOn : ''}`}>
                  <button className={styles.importCheck} onClick={() => handleImportToggle(key, ing.unit)}>
                    <div className={`${styles.importCheckBox} ${checked ? styles.importCheckBoxOn : ''}`}>
                      {checked && <Check size={10} strokeWidth={3} />}
                    </div>
                    <span className={styles.importName}>{ing.name}</span>
                  </button>
                  {checked && (
                    <div className={styles.importQtyRow}>
                      <input
                        className={styles.importQtyInput}
                        type="number"
                        min="0"
                        step="any"
                        placeholder="Qty"
                        value={importChecked[key]?.qty ?? ''}
                        onChange={(e) => setImportChecked((prev) => ({ ...prev, [key]: { ...prev[key], qty: e.target.value } }))}
                      />
                      <select
                        className={styles.importUnitSelect}
                        value={importChecked[key]?.unit ?? ing.unit}
                        onChange={(e) => setImportChecked((prev) => ({ ...prev, [key]: { ...prev[key], unit: e.target.value } }))}
                      >
                        {COMMON_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {Object.keys(importChecked).length > 0 && (
            <button className={styles.importSubmit} onClick={commitImport}>
              Add {Object.keys(importChecked).length} item{Object.keys(importChecked).length > 1 ? 's' : ''} to Pantry
            </button>
          )}
        </div>
      )}

      {pantryItems.length === 0 && !showAddForm && !showImport && !voicePhase && (
        <div className={styles.empty}>
          <Package size={40} strokeWidth={1.25} className={styles.emptyIcon} />
          <div className={styles.emptyTitle}>Your pantry is empty</div>
          <div className={styles.emptyBody}>
            Add items manually, speak your pantry, or import from your recipes.
            Items will be deducted automatically when you mark a meal as cooked.
          </div>
        </div>
      )}

      {pantryItems.length > 0 && (
        <div className={styles.list}>
          {pantryItems.map((item) => {
            const isLow = item.lowStockQty != null && item.qty <= item.lowStockQty;
            const isEditing = editingName === item.name;
            return (
              <div key={item.name} className={`${styles.item} ${isLow ? styles.itemLow : ''}`}>
                <div className={styles.itemMain}>
                  <div className={styles.itemName}>{item.name}</div>
                  <div className={styles.itemQtyRow}>
                    {isEditing ? (
                      <input
                        className={styles.itemQtyEdit}
                        type="number"
                        min="0"
                        step="any"
                        value={editQty}
                        autoFocus
                        onChange={(e) => setEditQty(e.target.value)}
                        onBlur={() => commitEdit(item)}
                        onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(item); if (e.key === 'Escape') setEditingName(null); }}
                      />
                    ) : (
                      <button className={styles.itemQty} onClick={() => startEdit(item.name, item.qty)}>
                        {item.qty % 1 === 0 ? item.qty : item.qty.toFixed(2).replace(/\.?0+$/, '')}
                      </button>
                    )}
                    <span className={styles.itemUnit}>{item.unit}</span>
                    {isLow && <AlertTriangle size={12} strokeWidth={2} className={styles.lowIcon} />}
                  </div>
                </div>
                <button className={styles.removeBtn} aria-label={`Remove ${item.name}`} onClick={() => onRemoveItem(item.name)}>
                  <Trash2 size={14} strokeWidth={2} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
