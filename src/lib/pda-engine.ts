import { PDADefinition, PDATransition, SimulationStep, SimulationResult, EPSILON } from './pda-types';

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

function applyStackOperation(stack: string[], transition: PDATransition): string[] {
  const newStack = [...stack];
  if (transition.stackTop !== EPSILON && newStack.length > 0) {
    newStack.pop();
  }
  if (transition.stackOperation !== EPSILON) {
    const symbols = transition.stackOperation.split('').reverse();
    for (const sym of symbols) {
      newStack.push(sym);
    }
  }
  return newStack;
}

function describeStackOp(transition: PDATransition): string {
  if (transition.stackTop === EPSILON && transition.stackOperation === EPSILON) return 'No stack change';
  if (transition.stackOperation === EPSILON) return `Pop ${transition.stackTop}`;
  if (transition.stackTop === EPSILON) return `Push ${transition.stackOperation}`;
  if (transition.stackOperation === transition.stackTop) return `Keep ${transition.stackTop}`;
  return `Replace ${transition.stackTop} → ${transition.stackOperation}`;
}

interface Config {
  state: string;
  inputPos: number;
  stack: string[];
  steps: SimulationStep[];
}

function runDFS(definition: PDADefinition, input: string): SimulationResult {
  const initialStack = [definition.initialStackSymbol];
  const initialStep: SimulationStep = {
    stepNumber: 0,
    currentState: definition.initialState,
    remainingInput: input,
    stackContents: [...initialStack],
    transitionApplied: null,
    stackOperation: 'Initial configuration',
  };

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

    const inputTransitions = !inputConsumed
      ? definition.transitions.filter(t =>
          t.currentState === config.state &&
          t.inputSymbol === currentInput &&
          (t.stackTop === stackTop || t.stackTop === EPSILON)
        )
      : [];

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

  return {
    accepted: false,
    steps: [initialStep],
    reason: iterations >= maxSteps ? 'Exceeded maximum steps' : 'No accepting configuration found',
  };
}

export function simulatePDA(definition: PDADefinition, input: string): SimulationResult {
  return runDFS(definition, input);
}

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
 * Step-by-step simulation using DFS with backtracking (nondeterministic)
 */
export function* simulateStepByStep(
  definition: PDADefinition,
  input: string
): Generator<SimulationStep, SimulationResult, void> {
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

  // Run full DFS to find accepting path
  const result = runDFS(definition, input);

  if (result.accepted) {
    // Yield the accepting path steps (skip step 0, already yielded)
    for (let i = 1; i < result.steps.length; i++) {
      yield result.steps[i];
    }
    return { accepted: true, steps: result.steps, reason: result.reason };
  }

  // Not accepted — yield a few steps to show attempt, then reject
  const initialConfig: Config = {
    state: definition.initialState,
    inputPos: 0,
    stack: [...initialStack],
    steps: [initialStep],
  };

  // Walk one deterministic path to show some steps
  let config = initialConfig;
  let stepNum = 1;

  while (stepNum < 20) {
    const currentInput = config.inputPos >= input.length ? EPSILON : input[config.inputPos];
    const stackTop = config.stack.length > 0 ? config.stack[config.stack.length - 1] : EPSILON;

    const inputT = definition.transitions.find(t =>
      t.currentState === config.state &&
      t.inputSymbol === currentInput &&
      currentInput !== EPSILON &&
      (t.stackTop === stackTop || t.stackTop === EPSILON)
    );

    const epsT = definition.transitions.find(t =>
      t.currentState === config.state &&
      t.inputSymbol === EPSILON &&
      (t.stackTop === stackTop || t.stackTop === EPSILON)
    );

    const matched = inputT
      ? { transition: inputT, consumeInput: true }
      : epsT
      ? { transition: epsT, consumeInput: false }
      : null;

    if (!matched) break;

    const newStack = applyStackOperation(config.stack, matched.transition);
    const newInputPos = matched.consumeInput ? config.inputPos + 1 : config.inputPos;

    const step: SimulationStep = {
      stepNumber: stepNum,
      currentState: matched.transition.nextState,
      remainingInput: input.slice(newInputPos),
      stackContents: [...newStack],
      transitionApplied: matched.transition,
      stackOperation: describeStackOp(matched.transition),
    };

    yield step;

    config = {
      state: matched.transition.nextState,
      inputPos: newInputPos,
      stack: newStack,
      steps: [...config.steps, step],
    };

    stepNum++;
  }

  return {
    accepted: false,
    steps: config.steps,
    reason: 'No accepting configuration found',
  };
}