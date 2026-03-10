import { PDADefinition, PDATransition, SimulationStep, SimulationResult, EPSILON } from './pda-types';

/**
 * Find matching transitions for current configuration
 */
export function findTransitions(
  definition: PDADefinition,
  state: string,
  inputSymbol: string,
  stackTop: string
): PDATransition[] {
  return definition.transitions.filter(t =>
    t.currentState === state &&
    (t.inputSymbol === inputSymbol || t.inputSymbol === EPSILON) &&
    (t.stackTop === stackTop || t.stackTop === EPSILON)
  );
}

/**
 * Apply a transition's stack operation
 */
function applyStackOperation(stack: string[], transition: PDATransition): string[] {
  const newStack = [...stack];
  
  // Pop the top if stackTop is not epsilon
  if (transition.stackTop !== EPSILON && newStack.length > 0) {
    newStack.pop();
  }
  
  // Push new symbols (right-to-left so first char ends on top)
  if (transition.stackOperation !== EPSILON) {
    const symbols = transition.stackOperation.split('').reverse();
    for (const sym of symbols) {
      newStack.push(sym);
    }
  }
  
  return newStack;
}

/**
 * Describe what the stack operation does
 */
function describeStackOp(transition: PDATransition): string {
  if (transition.stackTop === EPSILON && transition.stackOperation === EPSILON) {
    return 'No stack change';
  }
  if (transition.stackOperation === EPSILON) {
    return `Pop ${transition.stackTop}`;
  }
  if (transition.stackTop === EPSILON) {
    return `Push ${transition.stackOperation}`;
  }
  if (transition.stackOperation === transition.stackTop) {
    return `Keep ${transition.stackTop}`;
  }
  return `Replace ${transition.stackTop} → ${transition.stackOperation}`;
}

/**
 * Run a full PDA simulation (deterministic, depth-first for nondeterministic)
 */
export function simulatePDA(definition: PDADefinition, input: string): SimulationResult {
  const initialStack = [definition.initialStackSymbol];
  
  const initialStep: SimulationStep = {
    stepNumber: 0,
    currentState: definition.initialState,
    remainingInput: input,
    stackContents: [...initialStack],
    transitionApplied: null,
    stackOperation: 'Initial configuration',
  };

  // Use DFS for nondeterministic exploration
  interface Config {
    state: string;
    inputPos: number;
    stack: string[];
    steps: SimulationStep[];
  }

  const queue: Config[] = [{
    state: definition.initialState,
    inputPos: 0,
    stack: [...initialStack],
    steps: [initialStep],
  }];

  const visited = new Set<string>();
  const maxSteps = 1000;
  let iterations = 0;

  while (queue.length > 0 && iterations < maxSteps) {
    iterations++;
    const config = queue.pop()!;
    
    const configKey = `${config.state}|${config.inputPos}|${config.stack.join(',')}`;
    if (visited.has(configKey)) continue;
    visited.add(configKey);

    // Check acceptance
    const inputConsumed = config.inputPos >= input.length;
    
    if (definition.acceptanceMode === 'finalState') {
      if (inputConsumed && definition.acceptStates.includes(config.state)) {
        return { accepted: true, steps: config.steps, reason: 'Accepted by final state' };
      }
    } else {
      if (inputConsumed && config.stack.length === 0) {
        return { accepted: true, steps: config.steps, reason: 'Accepted by empty stack' };
      }
    }

    const currentInput = inputConsumed ? EPSILON : input[config.inputPos];
    const stackTop = config.stack.length > 0 ? config.stack[config.stack.length - 1] : EPSILON;

    // Try transitions with current input symbol
    const inputTransitions = !inputConsumed
      ? definition.transitions.filter(t =>
          t.currentState === config.state &&
          t.inputSymbol === currentInput &&
          (t.stackTop === stackTop || t.stackTop === EPSILON)
        )
      : [];

    // Try epsilon transitions on input
    const epsilonTransitions = definition.transitions.filter(t =>
      t.currentState === config.state &&
      t.inputSymbol === EPSILON &&
      (t.stackTop === stackTop || t.stackTop === EPSILON)
    );

    const allTransitions = [
      ...inputTransitions.map(t => ({ transition: t, consumeInput: true })),
      ...epsilonTransitions.map(t => ({ transition: t, consumeInput: false })),
    ];

    for (const { transition, consumeInput } of allTransitions) {
      const newStack = applyStackOperation(config.stack, transition);
      const newInputPos = consumeInput ? config.inputPos + 1 : config.inputPos;
      
      const step: SimulationStep = {
        stepNumber: config.steps.length,
        currentState: transition.nextState,
        remainingInput: input.slice(newInputPos),
        stackContents: [...newStack],
        transitionApplied: transition,
        stackOperation: describeStackOp(transition),
      };

      queue.push({
        state: transition.nextState,
        inputPos: newInputPos,
        stack: newStack,
        steps: [...config.steps, step],
      });
    }
  }

  // No accepting configuration found
  return {
    accepted: false,
    steps: queue.length > 0 ? queue[0].steps : [initialStep],
    reason: iterations >= maxSteps ? 'Exceeded maximum steps' : 'No accepting configuration found',
  };
}

/**
 * Validate PDA definition
 */
export function validatePDA(def: PDADefinition): string[] {
  const errors: string[] = [];
  
  if (def.states.length === 0) errors.push('At least one state is required');
  if (!def.initialState) errors.push('Initial state is required');
  if (!def.initialStackSymbol) errors.push('Initial stack symbol is required');
  if (!def.states.includes(def.initialState)) errors.push('Initial state must be in the states list');
  if (def.acceptanceMode === 'finalState' && def.acceptStates.length === 0) {
    errors.push('At least one accept state is required for final state acceptance');
  }
  for (const as of def.acceptStates) {
    if (!def.states.includes(as)) errors.push(`Accept state "${as}" is not in the states list`);
  }
  for (const t of def.transitions) {
    if (!def.states.includes(t.currentState)) errors.push(`Transition source "${t.currentState}" not in states`);
    if (!def.states.includes(t.nextState)) errors.push(`Transition target "${t.nextState}" not in states`);
  }
  
  return errors;
}

/**
 * Step-by-step simulation generator
 */
export function* simulateStepByStep(definition: PDADefinition, input: string): Generator<SimulationStep, SimulationResult, void> {
  const initialStack = [definition.initialStackSymbol];
  
  const initialStep: SimulationStep = {
    stepNumber: 0,
    currentState: definition.initialState,
    remainingInput: input,
    stackContents: [...initialStack],
    transitionApplied: null,
    stackOperation: 'Initial configuration',
  };

  yield initialStep;

  let state = definition.initialState;
  let inputPos = 0;
  let stack = [...initialStack];
  const steps: SimulationStep[] = [initialStep];
  let stepNum = 1;

  while (stepNum < 500) {
    const currentInput = inputPos >= input.length ? EPSILON : input[inputPos];
    const stackTop = stack.length > 0 ? stack[stack.length - 1] : EPSILON;

    // Find first matching transition (deterministic approach for step-by-step)
    let matched: { transition: PDATransition; consumeInput: boolean } | null = null;

    // Prefer input-consuming transitions
    const inputT = definition.transitions.find(t =>
      t.currentState === state &&
      t.inputSymbol === currentInput &&
      currentInput !== EPSILON &&
      (t.stackTop === stackTop || t.stackTop === EPSILON)
    );
    if (inputT) {
      matched = { transition: inputT, consumeInput: true };
    } else {
      const epsT = definition.transitions.find(t =>
        t.currentState === state &&
        t.inputSymbol === EPSILON &&
        (t.stackTop === stackTop || t.stackTop === EPSILON)
      );
      if (epsT) {
        matched = { transition: epsT, consumeInput: false };
      }
    }

    if (!matched) break;

    stack = applyStackOperation(stack, matched.transition);
    if (matched.consumeInput) inputPos++;
    state = matched.transition.nextState;

    const step: SimulationStep = {
      stepNumber: stepNum,
      currentState: state,
      remainingInput: input.slice(inputPos),
      stackContents: [...stack],
      transitionApplied: matched.transition,
      stackOperation: describeStackOp(matched.transition),
    };

    steps.push(step);
    yield step;
    stepNum++;

    // Check acceptance
    const inputConsumed = inputPos >= input.length;
    if (definition.acceptanceMode === 'finalState') {
      if (inputConsumed && definition.acceptStates.includes(state)) {
        return { accepted: true, steps, reason: 'Accepted by final state' };
      }
    } else {
      if (inputConsumed && stack.length === 0) {
        return { accepted: true, steps, reason: 'Accepted by empty stack' };
      }
    }
  }

  const inputConsumed = inputPos >= input.length;
  let accepted = false;
  let reason = 'Rejected';
  
  if (definition.acceptanceMode === 'finalState') {
    accepted = inputConsumed && definition.acceptStates.includes(state);
    reason = accepted ? 'Accepted by final state' : 'Rejected: not in accept state or input remaining';
  } else {
    accepted = inputConsumed && stack.length === 0;
    reason = accepted ? 'Accepted by empty stack' : 'Rejected: stack not empty or input remaining';
  }

  return { accepted, steps, reason };
}
