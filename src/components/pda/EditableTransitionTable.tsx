import { usePDA } from '@/hooks/use-pda';
import { EPSILON, PDATransition, makeTransition, validateTransition } from '@/lib/pda-types';
import { useState, useCallback, useEffect, useRef, Fragment } from 'react';
import { Trash2, ChevronUp, ChevronDown, Pencil, Check, X, Plus, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const romanNumerals = [
  'i','ii','iii','iv','v','vi','vii','viii','ix','x',
  'xi','xii','xiii','xiv','xv','xvi','xvii','xviii','xix','xx',
  'xxi','xxii','xxiii','xxiv','xxv','xxvi','xxvii','xxviii','xxix','xxx',
];

interface EditRow {
  currentState: string;
  inputSymbol: string;
  stackTop: string;
  nextState: string;
  stackOperation: string;
}

function blankRow(def: { states: string[]; stackAlphabet: string[] }): EditRow {
  return {
    currentState: def.states[0] ?? '',
    inputSymbol: EPSILON,
    stackTop: def.stackAlphabet[0] ?? 'Z',
    nextState: def.states[0] ?? '',
    stackOperation: def.stackAlphabet[0] ?? 'Z',
  };
}

export default function EditableTransitionTable() {
  const { definition, setDefinition, resetSimulation } = usePDA();

  // Working copy of transitions — edited locally, applied on "Update PDA"
  const [rows, setRows] = useState<(PDATransition & { _dirty?: boolean })[]>(
    () => definition.transitions.map(t => ({ ...t }))
  );
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editBuf, setEditBuf] = useState<EditRow | null>(null);
  const [addBuf, setAddBuf] = useState<EditRow | null>(null);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [highlightedIdx, setHighlightedIdx] = useState<number | null>(null);

  // Keep a ref to rows so applyToPDA always reads the latest without needing
  // rows in its useCallback dependency array (avoids stale-closure issues)
  const rowsRef = useRef(rows);
  useEffect(() => { rowsRef.current = rows; }, [rows]);

  const { states, stackAlphabet, inputAlphabet } = definition;

  // ─── Sync rows when definition.transitions changes externally ──────────────
  // Triggered by: language generator, preset loader, or any external setDefinition call.
  // We compare transition IDs; if they differ AND no row is being edited, reset local rows.
  const defTransitionKey = definition.transitions.map(t => t.id).join(',');
  const prevDefKeyRef = useRef(defTransitionKey);
  useEffect(() => {
    if (prevDefKeyRef.current === defTransitionKey) return;
    prevDefKeyRef.current = defTransitionKey;
    // Only sync if user isn't mid-edit (don't clobber their in-progress changes)
    if (editingIdx === null && addBuf === null) {
      setRows(definition.transitions.map(t => ({ ...t })));
      setErrors({});
      setGlobalError(null);
    }
  }, [defTransitionKey, editingIdx, addBuf]);

  // ─── Start editing a row ─────────────────────────────────────────────────
  const startEdit = (idx: number) => {
    const t = rows[idx];
    setEditingIdx(idx);
    setEditBuf({
      currentState: t.currentState,
      inputSymbol: t.inputSymbol,
      stackTop: t.stackTop,
      nextState: t.nextState,
      stackOperation: t.stackOperation,
    });
  };

  // ─── Commit edit ─────────────────────────────────────────────────────────
  const commitEdit = (idx: number) => {
    if (!editBuf) return;
    const err = validateTransition(editBuf, definition);
    if (err) {
      setErrors(prev => ({ ...prev, [idx]: err }));
      return;
    }
    setErrors(prev => { const n = { ...prev }; delete n[idx]; return n; });
    setRows(prev =>
      prev.map((r, i) =>
        i === idx ? { ...r, ...editBuf, _dirty: true } : r
      )
    );
    setEditingIdx(null);
    setEditBuf(null);
  };

  const cancelEdit = () => {
    setEditingIdx(null);
    setEditBuf(null);
    setErrors(prev => { const n = { ...prev }; delete n[editingIdx!]; return n; });
  };

  // ─── Delete row ──────────────────────────────────────────────────────────
  const deleteRow = (idx: number) => {
    setRows(prev => prev.filter((_, i) => i !== idx));
    if (editingIdx === idx) { setEditingIdx(null); setEditBuf(null); }
  };

  // ─── Reorder ─────────────────────────────────────────────────────────────
  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setRows(prev => {
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
    if (editingIdx === idx) setEditingIdx(idx - 1);
    else if (editingIdx === idx - 1) setEditingIdx(idx);
  };

  const moveDown = (idx: number) => {
    if (idx >= rows.length - 1) return;
    setRows(prev => {
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
    if (editingIdx === idx) setEditingIdx(idx + 1);
    else if (editingIdx === idx + 1) setEditingIdx(idx);
  };

  // ─── Add new row ─────────────────────────────────────────────────────────
  const startAdd = () => {
    setAddBuf(blankRow(definition));
    setGlobalError(null);
  };

  const commitAdd = () => {
    if (!addBuf) return;
    const err = validateTransition(addBuf, definition);
    if (err) { setGlobalError(err); return; }
    const newT = makeTransition(
      addBuf.currentState,
      addBuf.inputSymbol,
      addBuf.stackTop,
      addBuf.nextState,
      addBuf.stackOperation
    );
    setRows(prev => [...prev, { ...newT, _dirty: true }]);
    setAddBuf(null);
    setGlobalError(null);
    // Highlight new row briefly
    setTimeout(() => {
      setHighlightedIdx(rows.length);
      setTimeout(() => setHighlightedIdx(null), 1500);
    }, 50);
  };

  // ─── Apply to PDA ("Update PDA") ─────────────────────────────────────────
  const applyToPDA = useCallback(() => {
    const currentRows = rowsRef.current;

    // Validate all rows against current definition
    for (let i = 0; i < currentRows.length; i++) {
      const err = validateTransition(currentRows[i], definition);
      if (err) {
        setErrors(prev => ({ ...prev, [i]: err }));
        setGlobalError(`Row ${i + 1}: ${err}`);
        return;
      }
    }
    setGlobalError(null);
    setErrors({});

    // Strip _dirty flag, build clean transition list
    const cleanTransitions = currentRows.map(({ _dirty, ...rest }) => rest);

    // Update central definition with new transitions — triggers re-render of
    // StateDiagram, StackVisualizer, and all consumers of `definition`
    setDefinition(prev => ({ ...prev, transitions: cleanTransitions }));

    // Reset any active simulation so it doesn't use stale step data
    resetSimulation();

    setUpdateSuccess(true);
    setTimeout(() => setUpdateSuccess(false), 2000);
  }, [definition, setDefinition, resetSimulation]);
  // NOTE: `rows` deliberately NOT in deps — we read it via rowsRef to avoid
  // a stale closure when the user clicks Update immediately after an edit.

  // ─── Cell editor ─────────────────────────────────────────────────────────
  const CellInput = ({
    field,
    value,
    onChange,
    type = 'text',
  }: {
    field: string;
    value: string;
    onChange: (v: string) => void;
    type?: 'state' | 'stackSym' | 'inputSym' | 'stackOp' | 'text';
  }) => {
    if (type === 'state') {
      return (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-16 h-6 text-[11px] px-1 rounded border border-primary/40 bg-background text-foreground font-mono"
        >
          {states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      );
    }
    if (type === 'stackSym') {
      return (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-14 h-6 text-[11px] px-1 rounded border border-primary/40 bg-background text-foreground font-mono"
        >
          {stackAlphabet.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      );
    }
    if (type === 'inputSym') {
      return (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-14 h-6 text-[11px] px-1 rounded border border-primary/40 bg-background text-foreground font-mono"
        >
          <option value={EPSILON}>ε</option>
          {inputAlphabet.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      );
    }
    // stackOp: free text (can be multi-char or ε)
    return (
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="e.g. AZ or ε"
        className="w-16 h-6 text-[11px] px-1 rounded border border-primary/40 bg-background text-foreground font-mono"
      />
    );
  };

  if (rows.length === 0 && addBuf === null) {
    return (
      <div className="panel">
        <div className="flex items-center justify-between mb-2">
          <h2 className="panel-title mb-0">Transition Table</h2>
          <button
            onClick={startAdd}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
        <p className="text-xs text-muted-foreground text-center py-4">No transitions defined</p>
      </div>
    );
  }

  return (
    <div className="panel">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="panel-title mb-0">Transition Table</h2>
        <div className="flex gap-1.5">
          <button
            onClick={startAdd}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
          <button
            onClick={applyToPDA}
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded transition-colors font-semibold ${
              updateSuccess
                ? 'bg-success/20 text-success border border-success/40'
                : 'bg-primary text-primary-foreground hover:bg-primary/90'
            }`}
          >
            {updateSuccess ? (
              <><Check className="w-3 h-3" /> Applied!</>
            ) : (
              <><RefreshCw className="w-3 h-3" /> Update PDA</>
            )}
          </button>
        </div>
      </div>

      {/* Global error */}
      {globalError && (
        <div className="mb-2 px-2 py-1.5 rounded bg-destructive/10 border border-destructive/30 text-xs text-destructive">
          {globalError}
        </div>
      )}

      <div className="w-full overflow-hidden">
        <table className="w-full text-xs font-mono border-collapse">
          <thead>
            <tr className="text-muted-foreground border-b border-border">
              <th className="text-left py-1.5 px-1 w-6">#</th>
              <th className="text-left py-1.5 px-1">From</th>
              <th className="text-left py-1.5 px-1">In</th>
              <th className="text-left py-1.5 px-1">Top</th>
              <th className="text-center py-1.5 px-1 text-muted-foreground/50">→</th>
              <th className="text-left py-1.5 px-1">To</th>
              <th className="text-left py-1.5 px-1">Op</th>
              <th className="text-right py-1.5 px-1 w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
            {rows.map((t, i) => {
              const isEditing = editingIdx === i;
              const rowErr = errors[i];
              const isHighlighted = highlightedIdx === i;

              return (
                <Fragment key={t.id}>
                  <motion.tr
                    layout
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  key={t.id}
                  className={`border-b border-border/40 transition-colors ${
                    isEditing
                      ? 'bg-primary/5'
                      : isHighlighted
                      ? 'bg-success/10'
                      : 'hover:bg-secondary/20'
                  }`}
                >
                  {/* Row number */}
                  <td className="py-1 px-1 text-muted-foreground text-[10px]">
                    ({romanNumerals[i] ?? i + 1})
                  </td>

                  {isEditing && editBuf ? (
                    <>
                      <td className="py-1 px-1"><CellInput field="currentState" value={editBuf.currentState} onChange={v => setEditBuf(b => b && ({ ...b, currentState: v }))} type="state" /></td>
                      <td className="py-1 px-1"><CellInput field="inputSymbol" value={editBuf.inputSymbol} onChange={v => setEditBuf(b => b && ({ ...b, inputSymbol: v }))} type="inputSym" /></td>
                      <td className="py-1 px-1"><CellInput field="stackTop" value={editBuf.stackTop} onChange={v => setEditBuf(b => b && ({ ...b, stackTop: v }))} type="stackSym" /></td>
                      <td className="py-1 px-1 text-center text-muted-foreground/50">→</td>
                      <td className="py-1 px-1"><CellInput field="nextState" value={editBuf.nextState} onChange={v => setEditBuf(b => b && ({ ...b, nextState: v }))} type="state" /></td>
                      <td className="py-1 px-1"><CellInput field="stackOperation" value={editBuf.stackOperation} onChange={v => setEditBuf(b => b && ({ ...b, stackOperation: v }))} type="stackOp" /></td>
                    </>
                  ) : (
                    <>
                      <td className="py-1 px-1 text-primary">{t.currentState}</td>
                      <td className="py-1 px-1 text-accent">{t.inputSymbol}</td>
                      <td className="py-1 px-1 text-muted-foreground">{t.stackTop}</td>
                      <td className="py-1 px-1 text-center text-muted-foreground/40">→</td>
                      <td className="py-1 px-1 text-primary">{t.nextState}</td>
                      <td className="py-1 px-1 text-success">{t.stackOperation}</td>
                    </>
                  )}

                  <td className="py-1 px-1 w-20">
                    <div className="flex items-center justify-end gap-0.5">
                      {isEditing ? (
                        <>
                          <button onClick={() => commitEdit(i)} title="Save" className="p-1 text-success hover:bg-success/10 rounded transition-colors"><Check className="w-3 h-3" /></button>
                          <button onClick={cancelEdit} title="Cancel" className="p-1 text-muted-foreground hover:bg-secondary rounded transition-colors"><X className="w-3 h-3" /></button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(i)} title="Edit" className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"><Pencil className="w-3 h-3" /></button>
                          <button onClick={() => moveUp(i)} disabled={i === 0} title="Move up" className="p-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors disabled:opacity-30"><ChevronUp className="w-3 h-3" /></button>
                          <button onClick={() => moveDown(i)} disabled={i === rows.length - 1} title="Move down" className="p-1 text-muted-foreground hover:text-foreground hover:bg-secondary rounded transition-colors disabled:opacity-30"><ChevronDown className="w-3 h-3" /></button>
                          <button onClick={() => deleteRow(i)} title="Delete" className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"><Trash2 className="w-3 h-3" /></button>
                        </>
                      )}
                    </div>
                  </td>
                </motion.tr>
                {rowErr && (
                  <motion.tr
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    key={`${t.id}-err`}
                  >
                    <td colSpan={8} className="px-2 py-0.5 text-[10px] text-destructive bg-destructive/5">
                      ⚠ {rowErr}
                    </td>
                  </motion.tr>
                )}
              </Fragment>
              );
            })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Add new row form */}
      {addBuf !== null && (
        <div className="mt-2 p-2 rounded border border-primary/20 bg-primary/5 space-y-2">
          <div className="text-xs font-medium text-primary">New Transition</div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* From */}
            <select
              value={addBuf.currentState}
              onChange={e => setAddBuf(b => b && ({ ...b, currentState: e.target.value }))}
              className="h-7 text-xs px-1.5 rounded border border-input bg-background text-foreground font-mono"
            >
              {states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span className="text-xs text-muted-foreground">,</span>
            {/* Input */}
            <select
              value={addBuf.inputSymbol}
              onChange={e => setAddBuf(b => b && ({ ...b, inputSymbol: e.target.value }))}
              className="h-7 text-xs px-1.5 rounded border border-input bg-background text-foreground font-mono"
            >
              <option value={EPSILON}>ε</option>
              {inputAlphabet.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span className="text-xs text-muted-foreground">,</span>
            {/* Stack top */}
            <select
              value={addBuf.stackTop}
              onChange={e => setAddBuf(b => b && ({ ...b, stackTop: e.target.value }))}
              className="h-7 text-xs px-1.5 rounded border border-input bg-background text-foreground font-mono"
            >
              {stackAlphabet.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span className="text-xs text-muted-foreground">→</span>
            {/* To */}
            <select
              value={addBuf.nextState}
              onChange={e => setAddBuf(b => b && ({ ...b, nextState: e.target.value }))}
              className="h-7 text-xs px-1.5 rounded border border-input bg-background text-foreground font-mono"
            >
              {states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span className="text-xs text-muted-foreground">,</span>
            {/* Stack op */}
            <input
              value={addBuf.stackOperation}
              onChange={e => setAddBuf(b => b && ({ ...b, stackOperation: e.target.value }))}
              placeholder="push/ε"
              className="w-16 h-7 text-xs px-1.5 rounded border border-input bg-background text-foreground font-mono"
            />
            <button
              onClick={commitAdd}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
            <button
              onClick={() => { setAddBuf(null); setGlobalError(null); }}
              className="px-2 py-1 text-xs rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Stack Op: symbols to push (e.g. <code>AZ</code>) or <code>ε</code> to pop.
            Click <strong>Update PDA</strong> to apply all changes.
          </p>
        </div>
      )}

      {/* Hint */}
      <p className="mt-2 text-[10px] text-muted-foreground/60">
        Edit inline → click <strong>Update PDA</strong> to apply and refresh the diagram.
      </p>
    </div>
  );
}