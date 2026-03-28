import { PDADefinition, PDATransition, SimulationStep, SimulationResult, EPSILON } from './pda-types';

const MAX_STEPS = 1000;

interface Configuration {
  state: string;
  inputPos: number;
  stack: string[];
  steps: SimulationStep[];
}

function findTransitions(
  def: PDADefinition,
  state: string,
  inputChar: string | null,
  stackTop: string | undefined
): PDATransition[] {
  return def.transitions.filter(t => {
    if (t.currentState !== state) return false;
    const matchInput = t.inputSymbol === EPSILON
      ? true
      : t.inputSymbol === inputChar;
    const matchStack = stackTop === undefined
      ? false
      : t.stackTop === stackTop;
    if (t.inputSymbol !== EPSILON && inputChar === null) return false;
    return matchInput && matchStack;
  });
}

function applyTransition(
  stack: string[],
  transition: PDATransition
): { newStack: string[]; operation: SimulationStep['stackOperation']; symbol: string } {
  const newStack = [...stack];
  // Pop the stack top (we matched it)
  const popped = newStack.pop() || '';

  if (transition.stackOperation === EPSILON) {
    // Just pop, don't push anything back
    return { newStack, operation: 'POP', symbol: popped };
  }

  // Push the stack operation string (right-to-left so first char ends on top)
  const symbols = transition.stackOperation.split('');
  for (let i = symbols.length - 1; i >= 0; i--) {
    newStack.push(symbols[i]);
  }

  if (transition.stackOperation === popped) {
    // Same symbol pushed back = no change
    if (transition.inputSymbol === EPSILON) {
      return { newStack, operation: 'EPSILON', symbol: '' };
    }
    return { newStack, operation: 'NO_OP', symbol: '' };
  }

  if (transition.stackOperation.length > 1) {
    // Replaced top with multiple = push
    return { newStack, operation: 'PUSH', symbol: symbols[0] };
  }

  if (symbols.length === 1 && symbols[0] !== popped) {
    return { newStack, operation: 'REPLACE', symbol: symbols[0] };
  }

  return { newStack, operation: 'PUSH', symbol: symbols[0] };
}

export function simulatePDA(def: PDADefinition, input: string): SimulationResult {
  const steps = Array.from(simulateStepByStep(def, input));
  const lastStep = steps[steps.length - 1];

  if (!lastStep) {
    return { accepted: false, steps: [], reason: 'No steps generated' };
  }

  // Check the result from the generator
  const accepted = checkAcceptance(def, lastStep);
  const reason = accepted
    ? def.acceptanceMode === 'finalState'
      ? `Accepted — reached accept state ${lastStep.currentState}`
      : 'Accepted — stack is empty'
    : lastStep.remainingInput.length > 0
      ? `Rejected — input not fully consumed (remaining: ${lastStep.remainingInput})`
      : def.acceptanceMode === 'finalState'
        ? `Rejected — state ${lastStep.currentState} is not an accept state`
        : 'Rejected — stack is not empty';

  return { accepted, steps, reason };
}

function checkAcceptance(def: PDADefinition, step: SimulationStep): boolean {
  if (step.remainingInput.length > 0) return false;
  if (def.acceptanceMode === 'finalState') {
    return def.acceptStates.includes(step.currentState);
  }
  return step.stackContents.length === 0;
}

export function* simulateStepByStep(
  def: PDADefinition,
  input: string
): Generator<SimulationStep> {
  // Use DFS with backtracking for nondeterminism
  const initialStack = [def.initialStackSymbol];
  const initialStep: SimulationStep = {
    stepNumber: 0,
    currentState: def.initialState,
    remainingInput: input,
    stackContents: [...initialStack],
    transitionApplied: null,
    stackOperation: 'NO_OP',
    stackSymbol: '',
  };

  // Try DFS to find accepting path
  const result = dfs(def, input, 0, def.initialState, initialStack, [initialStep], 0);

  if (result) {
    for (const step of result) {
      yield step;
    }
  } else {
    // No accepting path found, just yield initial step
    yield initialStep;
  }
}

function dfs(
  def: PDADefinition,
  fullInput: string,
  inputPos: number,
  state: string,
  stack: string[],
  pathSoFar: SimulationStep[],
  depth: number
): SimulationStep[] | null {
  if (depth > MAX_STEPS) return null;

  const remainingInput = fullInput.substring(inputPos);
  const lastStep = pathSoFar[pathSoFar.length - 1];

  // Check if we've accepted
  if (inputPos >= fullInput.length) {
    if (def.acceptanceMode === 'finalState' && def.acceptStates.includes(state)) {
      return pathSoFar;
    }
    if (def.acceptanceMode === 'emptyStack' && stack.length === 0) {
      return pathSoFar;
    }
  }

  const stackTop = stack.length > 0 ? stack[stack.length - 1] : undefined;
  const inputChar = inputPos < fullInput.length ? fullInput[inputPos] : null;

  // Try epsilon transitions first
  const epsilonTransitions = findTransitions(def, state, null, stackTop)
    .filter(t => t.inputSymbol === EPSILON);

  for (const t of epsilonTransitions) {
    const { newStack, operation, symbol } = applyTransition(stack, t);
    const newStep: SimulationStep = {
      stepNumber: pathSoFar.length,
      currentState: t.nextState,
      remainingInput: fullInput.substring(inputPos),
      stackContents: [...newStack],
      transitionApplied: t,
      stackOperation: operation,
      stackSymbol: symbol,
    };
    const result = dfs(def, fullInput, inputPos, t.nextState, newStack, [...pathSoFar, newStep], depth + 1);
    if (result) return result;
  }

  // Try input-consuming transitions
  if (inputChar !== null) {
    const inputTransitions = findTransitions(def, state, inputChar, stackTop)
      .filter(t => t.inputSymbol !== EPSILON);

    for (const t of inputTransitions) {
      const { newStack, operation, symbol } = applyTransition(stack, t);
      const newStep: SimulationStep = {
        stepNumber: pathSoFar.length,
        currentState: t.nextState,
        remainingInput: fullInput.substring(inputPos + 1),
        stackContents: [...newStack],
        transitionApplied: t,
        stackOperation: operation,
        stackSymbol: symbol,
      };
      const result = dfs(def, fullInput, inputPos + 1, t.nextState, newStack, [...pathSoFar, newStep], depth + 1);
      if (result) return result;
    }
  }

  // No accepting path from here — if at end of input, return current path for rejection info
  if (inputPos >= fullInput.length && stack.length > 0) {
    return pathSoFar;
  }

  return null;
}

export function validatePDA(def: PDADefinition): string[] {
  const errors: string[] = [];
  if (def.states.length === 0) errors.push('At least one state is required');
  if (!def.initialState) errors.push('Initial state must be set');
  if (!def.states.includes(def.initialState)) errors.push('Initial state must be in states list');
  for (const s of def.acceptStates) {
    if (!def.states.includes(s)) errors.push(`Accept state ${s} not in states list`);
  }
  if (!def.initialStackSymbol) errors.push('Initial stack symbol required');
  return errors;
}
