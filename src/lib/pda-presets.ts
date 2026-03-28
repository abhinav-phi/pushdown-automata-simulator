import { PDADefinition, makeTransition, EPSILON } from './pda-types';

export interface Preset {
  name: string;
  description: string;
  definition: PDADefinition;
}

export const presets: Preset[] = [
  {
    name: 'aⁿbⁿ',
    description: 'L = { aⁿbⁿ | n ≥ 1 }',
    definition: {
      states: ['q0', 'q1', 'q2'],
      acceptStates: ['q2'],
      initialState: 'q0',
      initialStackSymbol: 'Z',
      inputAlphabet: ['a', 'b'],
      stackAlphabet: ['Z', 'A'],
      acceptanceMode: 'finalState',
      transitions: [
        makeTransition('q0', 'a', 'Z', 'q0', 'AZ'),
        makeTransition('q0', 'a', 'A', 'q0', 'AA'),
        makeTransition('q0', 'b', 'A', 'q1', EPSILON),
        makeTransition('q1', 'b', 'A', 'q1', EPSILON),
        makeTransition('q1', EPSILON, 'Z', 'q2', 'Z'),
      ],
      languageDescription: 'L = { aⁿbⁿ | n ≥ 1 }',
    },
  },
  {
    name: 'aⁿb²ⁿ',
    description: 'L = { aⁿb²ⁿ | n ≥ 1 }',
    definition: {
      states: ['q0', 'q1', 'q2'],
      acceptStates: ['q2'],
      initialState: 'q0',
      initialStackSymbol: 'Z',
      inputAlphabet: ['a', 'b'],
      stackAlphabet: ['Z', 'A'],
      acceptanceMode: 'finalState',
      transitions: [
        makeTransition('q0', 'a', 'Z', 'q0', 'AAZ'),
        makeTransition('q0', 'a', 'A', 'q0', 'AAA'),
        makeTransition('q0', 'b', 'A', 'q1', EPSILON),
        makeTransition('q1', 'b', 'A', 'q1', EPSILON),
        makeTransition('q1', EPSILON, 'Z', 'q2', 'Z'),
      ],
      languageDescription: 'L = { aⁿb²ⁿ | n ≥ 1 }',
    },
  },
  {
    name: 'Palindrome',
    description: 'L = { wwᴿ | w ∈ {a,b}⁺ }',
    definition: {
      states: ['q0', 'q1', 'q2'],
      acceptStates: ['q2'],
      initialState: 'q0',
      initialStackSymbol: 'Z',
      inputAlphabet: ['a', 'b'],
      stackAlphabet: ['Z', 'A', 'B'],
      acceptanceMode: 'finalState',
      transitions: [
        makeTransition('q0', 'a', 'Z', 'q0', 'AZ'),
        makeTransition('q0', 'b', 'Z', 'q0', 'BZ'),
        makeTransition('q0', 'a', 'A', 'q0', 'AA'),
        makeTransition('q0', 'a', 'B', 'q0', 'AB'),
        makeTransition('q0', 'b', 'A', 'q0', 'BA'),
        makeTransition('q0', 'b', 'B', 'q0', 'BB'),
        makeTransition('q0', EPSILON, 'A', 'q1', 'A'),
        makeTransition('q0', EPSILON, 'B', 'q1', 'B'),
        makeTransition('q1', 'a', 'A', 'q1', EPSILON),
        makeTransition('q1', 'b', 'B', 'q1', EPSILON),
        makeTransition('q1', EPSILON, 'Z', 'q2', 'Z'),
      ],
      languageDescription: 'L = { wwᴿ | w ∈ {a,b}⁺ }',
    },
  },
  {
    name: 'Balanced Parens',
    description: 'L = { balanced parentheses }',
    definition: {
      states: ['q0', 'q1'],
      acceptStates: ['q1'],
      initialState: 'q0',
      initialStackSymbol: 'Z',
      inputAlphabet: ['(', ')'],
      stackAlphabet: ['Z', 'P'],
      acceptanceMode: 'finalState',
      transitions: [
        makeTransition('q0', '(', 'Z', 'q0', 'PZ'),
        makeTransition('q0', '(', 'P', 'q0', 'PP'),
        makeTransition('q0', ')', 'P', 'q0', EPSILON),
        makeTransition('q0', EPSILON, 'Z', 'q1', 'Z'),
      ],
      languageDescription: 'L = { balanced parentheses }',
    },
  },
  {
    name: '0ⁿ1ⁿ',
    description: 'L = { 0ⁿ1ⁿ | n ≥ 1 }',
    definition: {
      states: ['q0', 'q1', 'q2'],
      acceptStates: ['q2'],
      initialState: 'q0',
      initialStackSymbol: 'Z',
      inputAlphabet: ['0', '1'],
      stackAlphabet: ['Z', 'X'],
      acceptanceMode: 'finalState',
      transitions: [
        makeTransition('q0', '0', 'Z', 'q0', 'XZ'),
        makeTransition('q0', '0', 'X', 'q0', 'XX'),
        makeTransition('q0', '1', 'X', 'q1', EPSILON),
        makeTransition('q1', '1', 'X', 'q1', EPSILON),
        makeTransition('q1', EPSILON, 'Z', 'q2', 'Z'),
      ],
      languageDescription: 'L = { 0ⁿ1ⁿ | n ≥ 1 }',
    },
  },
  {
    name: 'Equal a\'s and b\'s',
    description: 'L = { w ∈ {a,b}* | #a = #b }',
    definition: {
      states: ['q0', 'q1'],
      acceptStates: ['q1'],
      initialState: 'q0',
      initialStackSymbol: 'Z',
      inputAlphabet: ['a', 'b'],
      stackAlphabet: ['Z', 'A', 'B'],
      acceptanceMode: 'finalState',
      transitions: [
        // a on Z or B: push A
        makeTransition('q0', 'a', 'Z', 'q0', 'AZ'),
        makeTransition('q0', 'a', 'A', 'q0', 'AA'),
        makeTransition('q0', 'a', 'B', 'q0', EPSILON),
        // b on Z or A: push B
        makeTransition('q0', 'b', 'Z', 'q0', 'BZ'),
        makeTransition('q0', 'b', 'B', 'q0', 'BB'),
        makeTransition('q0', 'b', 'A', 'q0', EPSILON),
        // accept when stack has only Z
        makeTransition('q0', EPSILON, 'Z', 'q1', 'Z'),
      ],
      languageDescription: 'L = { w ∈ {a,b}* | #a(w) = #b(w) }',
    },
  },
];
