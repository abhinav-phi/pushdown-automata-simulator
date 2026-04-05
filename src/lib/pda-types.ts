export interface PDATransition {
  id: string;
  currentState: string;
  inputSymbol: string; // 'ε' for epsilon
  stackTop: string;
  nextState: string;
  stackOperation: string; // 'AZ' = replace top with AZ (push), 'ε' = pop
}

export interface PDADefinition {
  states: string[];
  acceptStates: string[];
  initialState: string;
  initialStackSymbol: string;
  inputAlphabet: string[];
  stackAlphabet: string[];
  acceptanceMode: 'finalState' | 'emptyStack';
  transitions: PDATransition[];
  languageDescription: string;
}

export interface SimulationStep {
  stepNumber: number;
  currentState: string;
  remainingInput: string;
  stackContents: string[];
  transitionApplied: PDATransition | null;
  stackOperation: 'PUSH' | 'POP' | 'EPSILON' | 'NO_OP' | 'REPLACE';
  stackSymbol: string;
}

export interface SimulationResult {
  accepted: boolean;
  steps: SimulationStep[];
  reason: string;
}

export interface HistoryEntry {
  input: string;
  accepted: boolean;
  steps: number;
}

// Snapshot used for back-step undo
export interface SimulationSnapshot {
  stepIndex: number;
  step: SimulationStep;
}

export const EPSILON = 'ε';

export function createEmptyDefinition(): PDADefinition {
  return {
    states: ['q0'],
    acceptStates: [],
    initialState: 'q0',
    initialStackSymbol: 'Z',
    inputAlphabet: [],
    stackAlphabet: ['Z'],
    acceptanceMode: 'finalState',
    transitions: [],
    languageDescription: '',
  };
}

let _transitionId = 0;
export function makeTransition(
  currentState: string,
  inputSymbol: string,
  stackTop: string,
  nextState: string,
  stackOperation: string
): PDATransition {
  return {
    id: `t${_transitionId++}`,
    currentState,
    inputSymbol,
    stackTop,
    nextState,
    stackOperation,
  };
}

/** Validate a transition's fields. Returns an error string or null. */
export function validateTransition(
  t: Omit<PDATransition, 'id'>,
  def: PDADefinition
): string | null {
  if (!t.currentState) return 'From-state is required';
  if (!t.nextState) return 'To-state is required';
  if (!t.stackTop) return 'Stack top symbol is required';
  if (!t.stackOperation) return 'Stack operation is required';
  if (!def.states.includes(t.currentState))
    return `State "${t.currentState}" not in states list`;
  if (!def.states.includes(t.nextState))
    return `State "${t.nextState}" not in states list`;
  if (!def.stackAlphabet.includes(t.stackTop))
    return `Stack symbol "${t.stackTop}" not in stack alphabet`;
  // stackOperation can be EPSILON or a sequence of stack symbols
  if (t.stackOperation !== EPSILON) {
    for (const ch of t.stackOperation.split('')) {
      if (!def.stackAlphabet.includes(ch))
        return `Stack operation symbol "${ch}" not in stack alphabet`;
    }
  }
  return null;
}