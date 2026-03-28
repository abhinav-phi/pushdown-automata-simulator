import { usePDA } from '@/hooks/use-pda';
import { useState, KeyboardEvent } from 'react';
import { PDADefinition, makeTransition, EPSILON, createEmptyDefinition } from '@/lib/pda-types';
import { X, Plus, Check } from 'lucide-react';

export default function PDADefinitionPanel() {
  const { definition, setDefinition } = usePDA();
  const [newState, setNewState] = useState('');
  const [newInputSym, setNewInputSym] = useState('');
  const [newStackSym, setNewStackSym] = useState('');
  const [tFrom, setTFrom] = useState('');
  const [tInput, setTInput] = useState('');
  const [tStackTop, setTStackTop] = useState('');
  const [tTo, setTTo] = useState('');
  const [tStackOp, setTStackOp] = useState('');

  const update = (partial: Partial<PDADefinition>) =>
    setDefinition(prev => ({ ...prev, ...partial }));

  const addState = () => {
    const s = newState.trim();
    if (s && !definition.states.includes(s)) {
      update({ states: [...definition.states, s] });
      setNewState('');
    }
  };

  const removeState = (s: string) => {
    update({
      states: definition.states.filter(x => x !== s),
      acceptStates: definition.acceptStates.filter(x => x !== s),
      transitions: definition.transitions.filter(t => t.currentState !== s && t.nextState !== s),
    });
  };

  const toggleAccept = (s: string) => {
    update({
      acceptStates: definition.acceptStates.includes(s)
        ? definition.acceptStates.filter(x => x !== s)
        : [...definition.acceptStates, s],
    });
  };

  const addInputSymbol = () => {
    const s = newInputSym.trim();
    if (s && !definition.inputAlphabet.includes(s)) {
      update({ inputAlphabet: [...definition.inputAlphabet, s] });
      setNewInputSym('');
    }
  };

  const addStackSymbol = () => {
    const s = newStackSym.trim();
    if (s && !definition.stackAlphabet.includes(s)) {
      update({ stackAlphabet: [...definition.stackAlphabet, s] });
      setNewStackSym('');
    }
  };

  const addTransition = () => {
    if (!tFrom || !tStackTop || !tTo || !tStackOp) return;
    const t = makeTransition(tFrom, tInput || EPSILON, tStackTop, tTo, tStackOp);
    update({ transitions: [...definition.transitions, t] });
    setTInput('');
    setTStackOp('');
  };

  const removeTransition = (id: string) => {
    update({ transitions: definition.transitions.filter(t => t.id !== id) });
  };

  const clearAll = () => {
    setDefinition(createEmptyDefinition());
  };

  const saveCustom = () => {
    localStorage.setItem('pda-custom', JSON.stringify(definition));
  };

  const handleKeyDown = (action: () => void) => (e: KeyboardEvent) => {
    if (e.key === 'Enter') action();
  };

  return (
    <div className="panel space-y-3 overflow-auto max-h-[calc(100vh-420px)]">
      <div className="flex items-center justify-between">
        <h2 className="panel-title mb-0">PDA Definition</h2>
        <div className="flex gap-1.5">
          <button onClick={clearAll} className="text-xs px-2 py-1 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
            Clear All
          </button>
          <button onClick={saveCustom} className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
            Save Custom
          </button>
        </div>
      </div>

      {/* States */}
      <div>
        <label className="text-xs text-muted-foreground font-medium">States (click to toggle accept)</label>
        <div className="flex flex-wrap gap-1.5 mt-1">
          {definition.states.map(s => (
            <span
              key={s}
              className={`pill cursor-pointer select-none ${definition.acceptStates.includes(s) ? 'pill-success' : ''}`}
              onClick={() => toggleAccept(s)}
            >
              {definition.acceptStates.includes(s) && <Check className="w-3 h-3" />}
              {s}
              <button onClick={(e) => { e.stopPropagation(); removeState(s); }} className="ml-0.5 hover:text-destructive">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <div className="flex items-center gap-1">
            <input
              value={newState}
              onChange={e => setNewState(e.target.value)}
              onKeyDown={handleKeyDown(addState)}
              placeholder="q..."
              className="w-16 px-2 py-1 text-xs rounded bg-secondary border border-border text-foreground"
            />
            <button onClick={addState} className="text-primary hover:text-primary/80"><Plus className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      </div>

      {/* Initial State */}
      <div className="flex gap-4">
        <div>
          <label className="text-xs text-muted-foreground font-medium">Initial State</label>
          <select
            value={definition.initialState}
            onChange={e => update({ initialState: e.target.value })}
            className="mt-1 block w-full px-2 py-1 text-xs rounded bg-secondary border border-border text-foreground"
          >
            {definition.states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground font-medium">Initial Stack Symbol</label>
          <input
            value={definition.initialStackSymbol}
            onChange={e => update({ initialStackSymbol: e.target.value })}
            className="mt-1 block w-20 px-2 py-1 text-xs rounded bg-secondary border border-border text-foreground"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground font-medium">Acceptance</label>
          <select
            value={definition.acceptanceMode}
            onChange={e => update({ acceptanceMode: e.target.value as 'finalState' | 'emptyStack' })}
            className="mt-1 block w-full px-2 py-1 text-xs rounded bg-secondary border border-border text-foreground"
          >
            <option value="finalState">Final State</option>
            <option value="emptyStack">Empty Stack</option>
          </select>
        </div>
      </div>

      {/* Alphabets */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-muted-foreground font-medium">Input Alphabet</label>
          <div className="flex flex-wrap gap-1 mt-1">
            {definition.inputAlphabet.map(s => (
              <span key={s} className="pill pill-accent">
                {s}
                <button onClick={() => update({ inputAlphabet: definition.inputAlphabet.filter(x => x !== s) })}><X className="w-3 h-3" /></button>
              </span>
            ))}
            <div className="flex items-center gap-1">
              <input value={newInputSym} onChange={e => setNewInputSym(e.target.value)} onKeyDown={handleKeyDown(addInputSymbol)} placeholder="sym" className="w-12 px-2 py-1 text-xs rounded bg-secondary border border-border text-foreground" />
              <button onClick={addInputSymbol} className="text-primary"><Plus className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground font-medium">Stack Alphabet</label>
          <div className="flex flex-wrap gap-1 mt-1">
            {definition.stackAlphabet.map(s => (
              <span key={s} className="pill">
                {s}
                <button onClick={() => update({ stackAlphabet: definition.stackAlphabet.filter(x => x !== s) })}><X className="w-3 h-3" /></button>
              </span>
            ))}
            <div className="flex items-center gap-1">
              <input value={newStackSym} onChange={e => setNewStackSym(e.target.value)} onKeyDown={handleKeyDown(addStackSymbol)} placeholder="sym" className="w-12 px-2 py-1 text-xs rounded bg-secondary border border-border text-foreground" />
              <button onClick={addStackSymbol} className="text-primary"><Plus className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Transition */}
      <div>
        <label className="text-xs text-muted-foreground font-medium">Add Transition</label>
        <div className="flex items-center gap-1 mt-1 flex-wrap">
          <select value={tFrom} onChange={e => setTFrom(e.target.value)} className="w-16 px-1.5 py-1 text-xs rounded bg-secondary border border-border text-foreground">
            <option value="">From</option>
            {definition.states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input value={tInput} onChange={e => setTInput(e.target.value)} placeholder="input/ε" className="w-14 px-1.5 py-1 text-xs rounded bg-secondary border border-border text-foreground" />
          <input value={tStackTop} onChange={e => setTStackTop(e.target.value)} placeholder="top" className="w-12 px-1.5 py-1 text-xs rounded bg-secondary border border-border text-foreground" />
          <span className="text-muted-foreground text-xs">→</span>
          <select value={tTo} onChange={e => setTTo(e.target.value)} className="w-16 px-1.5 py-1 text-xs rounded bg-secondary border border-border text-foreground">
            <option value="">To</option>
            {definition.states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input value={tStackOp} onChange={e => setTStackOp(e.target.value)} placeholder="push/ε" className="w-14 px-1.5 py-1 text-xs rounded bg-secondary border border-border text-foreground" />
          <button onClick={addTransition} className="px-2 py-1 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">Use ε for epsilon. Stack Op: push symbols e.g. AZ, or ε to pop</p>
      </div>

      {/* Transition list with delete */}
      {definition.transitions.length > 0 && (
        <div>
          <label className="text-xs text-muted-foreground font-medium">Transitions</label>
          <div className="space-y-1 mt-1 max-h-32 overflow-auto">
            {definition.transitions.map(t => (
              <div key={t.id} className="flex items-center justify-between text-xs font-mono bg-secondary/50 rounded px-2 py-1">
                <span>
                  <span className="text-primary">{t.currentState}</span>, <span className="text-accent">{t.inputSymbol}</span>, {t.stackTop} → <span className="text-primary">{t.nextState}</span>, <span className="text-success">{t.stackOperation}</span>
                </span>
                <button onClick={() => removeTransition(t.id)} className="text-destructive hover:text-destructive/80 ml-2">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
