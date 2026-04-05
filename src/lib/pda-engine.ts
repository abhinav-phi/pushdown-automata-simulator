import { PDADefinition, PDATransition, SimulationStep, SimulationResult, EPSILON } from './pda-types';

const MAX_STEPS = 1000;

function findTransitions(
  def: PDADefinition,
  state: string,
  inputChar: string | null,
  stackTop: string | undefined
): PDATransition[] {
  return def.transitions.filter(t => {
    if (t.currentState !== state) return false;
    if (stackTop === undefined) return false;
    if (t.stackTop !== stackTop) return false;

    if (t.inputSymbol === EPSILON) {
      // epsilon transitions don't consume input — always eligible
      return true;
    }
    // input-consuming transition: only valid when there IS a current char
    if (inputChar === null) return false;
    return t.inputSymbol === inputChar;
  });
}

function applyTransition(
  stack: string[],
  transition: PDATransition
): { newStack: string[]; operation: SimulationStep['stackOperation']; symbol: string } {
  const newStack = [...stack];
  const popped = newStack.pop() || '';

  if (transition.stackOperation === EPSILON) {
    // Pure pop — don't push anything back
    return { newStack, operation: 'POP', symbol: popped };
  }

  // Push the stack operation string right-to-left so first char ends on top
  const symbols = transition.stackOperation.split('');
  for (let i = symbols.length - 1; i >= 0; i--) {
    newStack.push(symbols[i]);
  }

  // Classify operation type
  if (symbols.length === 1 && symbols[0] === popped) {
    // Same symbol — no net change
    if (transition.inputSymbol === EPSILON) {
      return { newStack, operation: 'EPSILON', symbol: '' };
    }
    return { newStack, operation: 'NO_OP', symbol: '' };
  }

  if (symbols.length > 1) {
    return { newStack, operation: 'PUSH', symbol: symbols[0] };
  }

  if (symbols.length === 1 && symbols[0] !== popped) {
    return { newStack, operation: 'REPLACE', symbol: symbols[0] };
  }

  return { newStack, operation: 'PUSH', symbol: symbols[0] };
}

/**
 * Check whether a given simulation step satisfies the acceptance condition.
 * Acceptance is ONLY valid when the input is FULLY consumed.
 */
function checkAcceptance(def: PDADefinition, step: SimulationStep): boolean {
  // STRICT: input must be fully consumed
  if (step.remainingInput.length > 0) return false;

  if (def.acceptanceMode === 'finalState') {
    return def.acceptStates.includes(step.currentState);
  }

  // emptyStack: stack must be completely empty
  return step.stackContents.length === 0;
}

/**
 * Run the PDA simulation using DFS over the configuration space.
 * Returns a SimulationResult with the accepting path (if found) or the
 * best-effort rejection path.
 */
export function simulatePDA(def: PDADefinition, input: string): SimulationResult {
  const steps = Array.from(simulateStepByStep(def, input));

  if (steps.length === 0) {
    return { accepted: false, steps: [], reason: 'No steps generated' };
  }

  const lastStep = steps[steps.length - 1];
  const accepted = checkAcceptance(def, lastStep);

  let reason: string;
  if (accepted) {
    reason =
      def.acceptanceMode === 'finalState'
        ? `Accepted — reached accept state "${lastStep.currentState}" with input fully consumed`
        : 'Accepted — input fully consumed and stack is empty';
  } else if (lastStep.remainingInput.length > 0) {
    reason = `Rejected — input not fully consumed (remaining: "${lastStep.remainingInput}")`;
  } else if (def.acceptanceMode === 'finalState') {
    reason = `Rejected — state "${lastStep.currentState}" is not an accept state`;
  } else {
    if (def.acceptanceMode === 'emptyStack' && lastStep.stackContents.length === 1 && lastStep.stackContents[0] === def.initialStackSymbol) {
      reason = `Rejected — stack not empty. Missing ε-transition to pop '${def.initialStackSymbol}'?`;
    } else {
      reason = `Rejected — stack is not empty (depth: ${lastStep.stackContents.length})`;
    }
  }

  return { accepted, steps, reason };
}

export function* simulateStepByStep(
  def: PDADefinition,
  input: string
): Generator<SimulationStep> {
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

  const result = dfs(def, input, 0, def.initialState, initialStack, [initialStep], 0);

  if (result) {
    for (const step of result) {
      yield step;
    }
  } else {
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

  // Check if current configuration is accepting
  const currentStep = pathSoFar[pathSoFar.length - 1];
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

  // Try epsilon transitions first (they don't consume input)
  const epsilonTransitions = findTransitions(def, state, null, stackTop).filter(
    t => t.inputSymbol === EPSILON
  );

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
    const result = dfs(
      def,
      fullInput,
      inputPos,
      t.nextState,
      newStack,
      [...pathSoFar, newStep],
      depth + 1
    );
    if (result) return result;
  }

  // Try input-consuming transitions
  if (inputChar !== null) {
    const inputTransitions = findTransitions(def, state, inputChar, stackTop).filter(
      t => t.inputSymbol !== EPSILON
    );

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
      const result = dfs(
        def,
        fullInput,
        inputPos + 1,
        t.nextState,
        newStack,
        [...pathSoFar, newStep],
        depth + 1
      );
      if (result) return result;
    }
  }

  // No accepting path — return partial path for rejection info when input exhausted
  if (inputPos >= fullInput.length) {
    return pathSoFar;
  }

  return null;
}

export function validatePDA(def: PDADefinition): string[] {
  const errors: string[] = [];
  if (def.states.length === 0) errors.push('At least one state is required');
  if (!def.initialState) errors.push('Initial state must be set');
  if (!def.states.includes(def.initialState))
    errors.push('Initial state must be in states list');
  for (const s of def.acceptStates) {
    if (!def.states.includes(s))
      errors.push(`Accept state "${s}" not in states list`);
  }
  if (!def.initialStackSymbol) errors.push('Initial stack symbol required');
  if (!def.stackAlphabet.includes(def.initialStackSymbol))
    errors.push('Initial stack symbol must be in stack alphabet');
  return errors;
}