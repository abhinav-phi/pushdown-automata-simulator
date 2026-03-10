import React, { useState } from 'react';
import { PDADefinition, PDATransition, EPSILON } from '@/lib/pda-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Props {
  definition: PDADefinition;
  onChange: (def: PDADefinition) => void;
}

let transitionIdCounter = 0;

export default function PDADefinitionPanel({ definition, onChange }: Props) {
  const [newState, setNewState] = useState('');
  const [newInputSym, setNewInputSym] = useState('');
  const [newStackSym, setNewStackSym] = useState('');

  // Transition form
  const [tFrom, setTFrom] = useState('');
  const [tInput, setTInput] = useState('');
  const [tStackTop, setTStackTop] = useState('');
  const [tTo, setTTo] = useState('');
  const [tStackOp, setTStackOp] = useState('');

  const addState = () => {
    const s = newState.trim();
    if (s && !definition.states.includes(s)) {
      onChange({ ...definition, states: [...definition.states, s] });
      setNewState('');
    }
  };

  const removeState = (s: string) => {
    onChange({
      ...definition,
      states: definition.states.filter(x => x !== s),
      acceptStates: definition.acceptStates.filter(x => x !== s),
      initialState: definition.initialState === s ? '' : definition.initialState,
      transitions: definition.transitions.filter(t => t.currentState !== s && t.nextState !== s),
    });
  };

  const addInputSymbol = () => {
    const s = newInputSym.trim();
    if (s && !definition.inputAlphabet.includes(s)) {
      onChange({ ...definition, inputAlphabet: [...definition.inputAlphabet, s] });
      setNewInputSym('');
    }
  };

  const addStackSymbol = () => {
    const s = newStackSym.trim();
    if (s && !definition.stackAlphabet.includes(s)) {
      onChange({ ...definition, stackAlphabet: [...definition.stackAlphabet, s] });
      setNewStackSym('');
    }
  };

  const addTransition = () => {
    if (!tFrom || !tInput || !tStackTop || !tTo || !tStackOp) return;
    const t: PDATransition = {
      id: `t${++transitionIdCounter}`,
      currentState: tFrom,
      inputSymbol: tInput,
      stackTop: tStackTop,
      nextState: tTo,
      stackOperation: tStackOp,
    };
    onChange({ ...definition, transitions: [...definition.transitions, t] });
    setTFrom(''); setTInput(''); setTStackTop(''); setTTo(''); setTStackOp('');
  };

  const removeTransition = (id: string) => {
    onChange({ ...definition, transitions: definition.transitions.filter(t => t.id !== id) });
  };

  const toggleAcceptState = (s: string) => {
    const isAccept = definition.acceptStates.includes(s);
    onChange({
      ...definition,
      acceptStates: isAccept
        ? definition.acceptStates.filter(x => x !== s)
        : [...definition.acceptStates, s],
    });
  };

  return (
    <div className="panel-card space-y-5">
      <h2 className="panel-title">PDA Definition</h2>

      {/* States */}
      <div>
        <Label className="text-xs font-medium text-muted-foreground">States</Label>
        <div className="flex flex-wrap gap-1.5 mt-1 mb-2">
          {definition.states.map(s => (
            <Badge
              key={s}
              variant={definition.acceptStates.includes(s) ? 'default' : 'secondary'}
              className="gap-1 cursor-pointer group"
              onClick={() => toggleAcceptState(s)}
            >
              {s === definition.initialState && <span className="text-accent">→</span>}
              {s}
              {definition.acceptStates.includes(s) && <span className="text-[10px]">✓</span>}
              <X
                className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => { e.stopPropagation(); removeState(s); }}
              />
            </Badge>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="State name (e.g. q0)"
            value={newState}
            onChange={e => setNewState(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addState()}
            className="h-8 text-sm font-mono"
          />
          <Button size="sm" variant="outline" onClick={addState} className="h-8 px-3">
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Initial State & Stack Symbol */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Initial State</Label>
          <Select value={definition.initialState} onValueChange={v => onChange({ ...definition, initialState: v })}>
            <SelectTrigger className="h-8 text-sm font-mono"><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {definition.states.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Initial Stack Symbol</Label>
          <Input
            value={definition.initialStackSymbol}
            onChange={e => onChange({ ...definition, initialStackSymbol: e.target.value })}
            className="h-8 text-sm font-mono"
            placeholder="Z"
          />
        </div>
      </div>

      {/* Accept States info */}
      <p className="text-[11px] text-muted-foreground">Click a state badge to toggle accept state</p>

      {/* Alphabets */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground">Input Alphabet</Label>
          <div className="flex flex-wrap gap-1 mt-1 mb-1">
            {definition.inputAlphabet.map(s => (
              <Badge key={s} variant="outline" className="font-mono text-xs gap-1">
                {s}
                <X className="h-2.5 w-2.5 cursor-pointer" onClick={() =>
                  onChange({ ...definition, inputAlphabet: definition.inputAlphabet.filter(x => x !== s) })
                } />
              </Badge>
            ))}
          </div>
          <div className="flex gap-1">
            <Input placeholder="Symbol" value={newInputSym} onChange={e => setNewInputSym(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addInputSymbol()} className="h-7 text-xs font-mono" />
            <Button size="sm" variant="outline" onClick={addInputSymbol} className="h-7 px-2">
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Stack Alphabet</Label>
          <div className="flex flex-wrap gap-1 mt-1 mb-1">
            {definition.stackAlphabet.map(s => (
              <Badge key={s} variant="outline" className="font-mono text-xs gap-1">
                {s}
                <X className="h-2.5 w-2.5 cursor-pointer" onClick={() =>
                  onChange({ ...definition, stackAlphabet: definition.stackAlphabet.filter(x => x !== s) })
                } />
              </Badge>
            ))}
          </div>
          <div className="flex gap-1">
            <Input placeholder="Symbol" value={newStackSym} onChange={e => setNewStackSym(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addStackSymbol()} className="h-7 text-xs font-mono" />
            <Button size="sm" variant="outline" onClick={addStackSymbol} className="h-7 px-2">
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Acceptance Mode */}
      <div>
        <Label className="text-xs text-muted-foreground">Acceptance Mode</Label>
        <Select
          value={definition.acceptanceMode}
          onValueChange={(v: 'finalState' | 'emptyStack') => onChange({ ...definition, acceptanceMode: v })}
        >
          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="finalState">Final State</SelectItem>
            <SelectItem value="emptyStack">Empty Stack</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Add Transition */}
      <div>
        <Label className="text-xs text-muted-foreground">Add Transition</Label>
        <div className="grid grid-cols-5 gap-1.5 mt-1">
          <Input placeholder="From" value={tFrom} onChange={e => setTFrom(e.target.value)} className="h-7 text-xs font-mono" />
          <Input placeholder="Input" value={tInput} onChange={e => setTInput(e.target.value)} className="h-7 text-xs font-mono" />
          <Input placeholder="Stack Top" value={tStackTop} onChange={e => setTStackTop(e.target.value)} className="h-7 text-xs font-mono" />
          <Input placeholder="To" value={tTo} onChange={e => setTTo(e.target.value)} className="h-7 text-xs font-mono" />
          <Input placeholder="Stack Op" value={tStackOp} onChange={e => setTStackOp(e.target.value)} className="h-7 text-xs font-mono" />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">Use ε for epsilon. Stack Op: symbols to push (e.g. AZ), ε to pop</p>
        <Button size="sm" variant="outline" onClick={addTransition} className="mt-2 h-7 text-xs">
          <Plus className="h-3 w-3 mr-1" /> Add Transition
        </Button>
      </div>

      {/* Transitions Table */}
      {definition.transitions.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="text-left py-1 px-1">State</th>
                <th className="text-left py-1 px-1">Input</th>
                <th className="text-left py-1 px-1">Stack</th>
                <th className="text-left py-1 px-1">→ State</th>
                <th className="text-left py-1 px-1">→ Stack</th>
                <th className="py-1 px-1"></th>
              </tr>
            </thead>
            <tbody>
              {definition.transitions.map(t => (
                <tr key={t.id} className="border-b border-border/50 hover:bg-muted/50">
                  <td className="py-1 px-1">{t.currentState}</td>
                  <td className="py-1 px-1">{t.inputSymbol}</td>
                  <td className="py-1 px-1">{t.stackTop}</td>
                  <td className="py-1 px-1">{t.nextState}</td>
                  <td className="py-1 px-1">{t.stackOperation}</td>
                  <td className="py-1 px-1">
                    <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => removeTransition(t.id)}>
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
