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
