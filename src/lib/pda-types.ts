// PDA Types and Interfaces

export interface PDATransition {
  id: string;
  currentState: string;
  inputSymbol: string; // 'ε' for epsilon
  stackTop: string;
  nextState: string;
  stackOperation: string; // e.g., 'AZ' pushes A then Z, 'ε' pops
}

export interface PDADefinition {
  states: string[];
  inputAlphabet: string[];
  stackAlphabet: string[];
  initialState: string;
  initialStackSymbol: string;
  acceptStates: string[];
  transitions: PDATransition[];
  acceptanceMode: 'finalState' | 'emptyStack';
}

export interface SimulationStep {
  stepNumber: number;
  currentState: string;
  remainingInput: string;
  stackContents: string[];
  transitionApplied: PDATransition | null;
  stackOperation: string; // description
}

export interface SimulationResult {
  accepted: boolean;
  steps: SimulationStep[];
  reason: string;
}

export interface PDAExample {
  name: string;
  description: string;
  definition: PDADefinition;
  testStrings: string[];
}

export const EPSILON = 'ε';
