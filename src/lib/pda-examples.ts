import { PDAExample, EPSILON } from './pda-types';

let nextId = 1000;
const id = () => `t${nextId++}`;

export const predefinedExamples: PDAExample[] = [
  {
    name: 'Language aⁿbⁿ',
    description: 'Accepts strings with equal number of a\'s followed by b\'s (e.g., ab, aabb, aaabbb)',
    definition: {
      states: ['q0', 'q1', 'q2'],
      inputAlphabet: ['a', 'b'],
      stackAlphabet: ['Z', 'A'],
      initialState: 'q0',
      initialStackSymbol: 'Z',
      acceptStates: ['q2'],
      acceptanceMode: 'finalState',
      transitions: [
        { id: id(), currentState: 'q0', inputSymbol: 'a', stackTop: 'Z', nextState: 'q0', stackOperation: 'AZ' },
        { id: id(), currentState: 'q0', inputSymbol: 'a', stackTop: 'A', nextState: 'q0', stackOperation: 'AA' },
        { id: id(), currentState: 'q0', inputSymbol: 'b', stackTop: 'A', nextState: 'q1', stackOperation: EPSILON },
        { id: id(), currentState: 'q1', inputSymbol: 'b', stackTop: 'A', nextState: 'q1', stackOperation: EPSILON },
        { id: id(), currentState: 'q1', inputSymbol: EPSILON, stackTop: 'Z', nextState: 'q2', stackOperation: 'Z' },
      ],
    },
    testStrings: ['ab', 'aabb', 'aaabbb', 'aab', 'abb', 'ba', ''],
  },
  {
    name: 'Balanced Parentheses',
    description: 'Accepts strings with balanced parentheses (e.g., (), (()), (()()))',
    definition: {
      states: ['q0', 'q1'],
      inputAlphabet: ['(', ')'],
      stackAlphabet: ['Z', 'X'],
      initialState: 'q0',
      initialStackSymbol: 'Z',
      acceptStates: ['q1'],
      acceptanceMode: 'finalState',
      transitions: [
        { id: id(), currentState: 'q0', inputSymbol: '(', stackTop: 'Z', nextState: 'q0', stackOperation: 'XZ' },
        { id: id(), currentState: 'q0', inputSymbol: '(', stackTop: 'X', nextState: 'q0', stackOperation: 'XX' },
        { id: id(), currentState: 'q0', inputSymbol: ')', stackTop: 'X', nextState: 'q0', stackOperation: EPSILON },
        { id: id(), currentState: 'q0', inputSymbol: EPSILON, stackTop: 'Z', nextState: 'q1', stackOperation: 'Z' },
      ],
    },
    testStrings: ['()', '(())', '(()())', '(()', '())', '(', ''],
  },
  {
    name: 'Palindrome (even length)',
    description: 'Accepts even-length palindromes over {a, b} using nondeterminism',
    definition: {
      states: ['q0', 'q1', 'q2'],
      inputAlphabet: ['a', 'b'],
      stackAlphabet: ['Z', 'A', 'B'],
      initialState: 'q0',
      initialStackSymbol: 'Z',
      acceptStates: ['q2'],
      acceptanceMode: 'finalState',
      transitions: [
        { id: id(), currentState: 'q0', inputSymbol: 'a', stackTop: 'Z', nextState: 'q0', stackOperation: 'AZ' },
        { id: id(), currentState: 'q0', inputSymbol: 'b', stackTop: 'Z', nextState: 'q0', stackOperation: 'BZ' },
        { id: id(), currentState: 'q0', inputSymbol: 'a', stackTop: 'A', nextState: 'q0', stackOperation: 'AA' },
        { id: id(), currentState: 'q0', inputSymbol: 'a', stackTop: 'B', nextState: 'q0', stackOperation: 'AB' },
        { id: id(), currentState: 'q0', inputSymbol: 'b', stackTop: 'A', nextState: 'q0', stackOperation: 'BA' },
        { id: id(), currentState: 'q0', inputSymbol: 'b', stackTop: 'B', nextState: 'q0', stackOperation: 'BB' },
        // Nondeterministic guess: switch to matching mode
        { id: id(), currentState: 'q0', inputSymbol: EPSILON, stackTop: 'A', nextState: 'q1', stackOperation: 'A' },
        { id: id(), currentState: 'q0', inputSymbol: EPSILON, stackTop: 'B', nextState: 'q1', stackOperation: 'B' },
        // Match second half
        { id: id(), currentState: 'q1', inputSymbol: 'a', stackTop: 'A', nextState: 'q1', stackOperation: EPSILON },
        { id: id(), currentState: 'q1', inputSymbol: 'b', stackTop: 'B', nextState: 'q1', stackOperation: EPSILON },
        { id: id(), currentState: 'q1', inputSymbol: EPSILON, stackTop: 'Z', nextState: 'q2', stackOperation: 'Z' },
      ],
    },
    testStrings: ['abba', 'aa', 'abab', 'aabbaa', 'aba', ''],
  },
  {
    name: 'Language 0ⁿ1ⁿ',
    description: 'Accepts strings with equal number of 0\'s followed by 1\'s',
    definition: {
      states: ['q0', 'q1', 'q2'],
      inputAlphabet: ['0', '1'],
      stackAlphabet: ['Z', 'X'],
      initialState: 'q0',
      initialStackSymbol: 'Z',
      acceptStates: ['q2'],
      acceptanceMode: 'finalState',
      transitions: [
        { id: id(), currentState: 'q0', inputSymbol: '0', stackTop: 'Z', nextState: 'q0', stackOperation: 'XZ' },
        { id: id(), currentState: 'q0', inputSymbol: '0', stackTop: 'X', nextState: 'q0', stackOperation: 'XX' },
        { id: id(), currentState: 'q0', inputSymbol: '1', stackTop: 'X', nextState: 'q1', stackOperation: EPSILON },
        { id: id(), currentState: 'q1', inputSymbol: '1', stackTop: 'X', nextState: 'q1', stackOperation: EPSILON },
        { id: id(), currentState: 'q1', inputSymbol: EPSILON, stackTop: 'Z', nextState: 'q2', stackOperation: 'Z' },
      ],
    },
    testStrings: ['01', '0011', '000111', '001', '011', '10', ''],
  },
];
