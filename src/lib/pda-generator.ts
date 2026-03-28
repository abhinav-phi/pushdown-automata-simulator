import { PDADefinition, makeTransition, EPSILON } from './pda-types';

export interface ExponentRow {
  symbol: string;
  variable: string;
  coefficient: number; // e.g. 2 for b^{2n}
}

export interface ConditionRow {
  variable: string;
  operator: '≥' | '>' | '=' | '<' | '≤';
  value: number;
}

export interface LanguageSpec {
  exponents: ExponentRow[];
  conditions: ConditionRow[];
}

interface VariableGroup {
  variable: string;
  entries: { symbol: string; coefficient: number; index: number }[];
}

/**
 * Analyze exponent relationships and generate a PDA definition dynamically.
 * Returns either a valid PDADefinition or an error string.
 */
export function generatePDAFromLanguage(spec: LanguageSpec): PDADefinition | string {
  const { exponents, conditions } = spec;

  if (exponents.length === 0) return 'No exponents defined';

  // Group exponents by variable
  const varMap = new Map<string, { symbol: string; coefficient: number; index: number }[]>();
  for (let i = 0; i < exponents.length; i++) {
    const e = exponents[i];
    if (!varMap.has(e.variable)) varMap.set(e.variable, []);
    varMap.get(e.variable)!.push({ symbol: e.symbol, coefficient: e.coefficient, index: i });
  }

  const groups: VariableGroup[] = [];
  for (const [variable, entries] of varMap) {
    groups.push({ variable, entries });
  }

  // Check for context-free feasibility:
  // A PDA can handle at most one "matching" constraint at a time using the stack.
  // If there are 3+ symbols all sharing the same variable that require independent matching
  // across non-adjacent positions, it's likely not context-free.
  // More precisely: we can handle sequential push-then-pop patterns.
  // We need to verify the exponent structure is "nested" or "sequential" — not "crossing".

  // Check for non-context-free: if 3+ distinct symbols share the same exponent variable
  // and they're not reducible to push-pop pairs
  for (const g of groups) {
    if (g.entries.length >= 3) {
      // 3 symbols with the same variable = aⁿbⁿcⁿ pattern = not CF
      return `This language is not context-free — PDA cannot recognise it. Variable "${g.variable}" appears in ${g.entries.length} symbols (${g.entries.map(e => e.symbol).join(', ')}), requiring ${g.entries.length}-way matching.`;
    }
  }

  // Detect crossing dependencies: if we have variables that "cross" each other
  // e.g., a^i b^j c^i d^j where i and j crossings make it non-CF
  // Check if the variable groups can be arranged in a nested/sequential manner
  const crossingError = checkForCrossingDependencies(groups, exponents);
  if (crossingError) return crossingError;

  // Now generate the PDA
  return buildPDA(groups, exponents, conditions);
}

function checkForCrossingDependencies(groups: VariableGroup[], exponents: ExponentRow[]): string | null {
  // For pairs of variables that each appear exactly twice, check if they cross
  const pairedGroups = groups.filter(g => g.entries.length === 2);

  for (let i = 0; i < pairedGroups.length; i++) {
    for (let j = i + 1; j < pairedGroups.length; j++) {
      const a = pairedGroups[i];
      const b = pairedGroups[j];
      // Check positions: a1, b1, a2, b2 pattern = crossing = not CF
      const [a1, a2] = a.entries.map(e => e.index).sort((x, y) => x - y);
      const [b1, b2] = b.entries.map(e => e.index).sort((x, y) => x - y);
      if (a1 < b1 && b1 < a2 && a2 < b2) {
        return `This language is not context-free — PDA cannot recognise it. Variables "${a.variable}" and "${b.variable}" have crossing dependencies (${a.entries[0].symbol}...${b.entries[0].symbol}...${a.entries[1].symbol}...${b.entries[1].symbol}).`;
      }
      if (b1 < a1 && a1 < b2 && b2 < a2) {
        return `This language is not context-free — PDA cannot recognise it. Variables "${a.variable}" and "${b.variable}" have crossing dependencies.`;
      }
    }
  }
  return null;
}

function buildPDA(groups: VariableGroup[], exponents: ExponentRow[], conditions: ConditionRow[]): PDADefinition {
  const states: string[] = [];
  const transitions: ReturnType<typeof makeTransition>[] = [];
  const inputAlphabet = [...new Set(exponents.map(e => e.symbol))];
  const stackAlphabetSet = new Set<string>(['Z']);

  let stateCounter = 0;
  const newState = () => {
    const s = `q${stateCounter++}`;
    states.push(s);
    return s;
  };

  // Separate into: matched pairs (2 entries per variable) and independent (1 entry)
  const matchedPairs = groups.filter(g => g.entries.length === 2);
  const independents = groups.filter(g => g.entries.length === 1);

  // Sort matched pairs by the position of their first entry (to process in order)
  matchedPairs.sort((a, b) => a.entries[0].index - b.entries[0].index);

  // For matched pairs, determine which is the "push" symbol and which is the "pop" symbol
  // The one that appears first is push, second is pop
  interface Phase {
    type: 'push' | 'pop' | 'independent';
    symbol: string;
    coefficient: number;
    variable: string;
    stackSymbol: string;
    index: number;
  }

  const phases: Phase[] = [];

  const gcd = (a: number, b: number): number => {
    let x = Math.abs(a);
    let y = Math.abs(b);
    while (y !== 0) {
      const t = y;
      y = x % y;
      x = t;
    }
    return x || 1;
  };

  for (const pair of matchedPairs) {
    const sorted = [...pair.entries].sort((a, b) => a.index - b.index);
    const stackSym = pair.variable.toUpperCase();
    stackAlphabetSet.add(stackSym);

    const firstCoeff = Math.max(1, sorted[0].coefficient);
    const secondCoeff = Math.max(1, sorted[1].coefficient);
    const divisor = gcd(firstCoeff, secondCoeff);

    // Normalize operation counts so both sides match the same variable n:
    // (pushPerFirst * firstCoeff) === (popPerSecond * secondCoeff)
    // Example: a^(2n) b^n -> pushPerFirst=1, popPerSecond=2
    const pushPerFirst = secondCoeff / divisor;
    const popPerSecond = firstCoeff / divisor;

    phases.push({
      type: 'push',
      symbol: sorted[0].symbol,
      coefficient: pushPerFirst,
      variable: pair.variable,
      stackSymbol: stackSym,
      index: sorted[0].index,
    });
    phases.push({
      type: 'pop',
      symbol: sorted[1].symbol,
      coefficient: popPerSecond,
      variable: pair.variable,
      stackSymbol: stackSym,
      index: sorted[1].index,
    });
  }

  for (const ind of independents) {
    const e = ind.entries[0];
    const stackSym = ind.variable.toUpperCase();
    stackAlphabetSet.add(stackSym);
    phases.push({
      type: 'independent',
      symbol: e.symbol,
      coefficient: e.coefficient,
      variable: ind.variable,
      stackSymbol: stackSym,
      index: e.index,
    });
  }

  // Sort phases by their index (order in the language)
  phases.sort((a, b) => a.index - b.index);

  // Build states and transitions for each phase
  const initialState = newState(); // q0
  let currentState = initialState;

  for (let pi = 0; pi < phases.length; pi++) {
    const phase = phases[pi];
    const nextPhaseState = pi < phases.length - 1 ? newState() : null;

    if (phase.type === 'push') {
      // Push `coefficient` copies of stackSymbol per input symbol
      const pushStr = phase.stackSymbol.repeat(phase.coefficient);

      // On first symbol: push onto Z
      transitions.push(makeTransition(currentState, phase.symbol, 'Z', currentState, pushStr + 'Z'));
      // On subsequent symbols: push onto existing stack symbol
      transitions.push(makeTransition(currentState, phase.symbol, phase.stackSymbol, currentState, pushStr + phase.stackSymbol));

      // Also handle pushing when other stack symbols are on top (from independent phases before)
      // Transition to next phase via epsilon or on next symbol
      if (nextPhaseState) {
        // Always use epsilon transitions to move between phases
        // This ensures the pop phase handles all input reading uniformly
        transitions.push(makeTransition(currentState, EPSILON, phase.stackSymbol, nextPhaseState, phase.stackSymbol));
        transitions.push(makeTransition(currentState, EPSILON, 'Z', nextPhaseState, 'Z'));
      }
    } else if (phase.type === 'pop') {
      // Pop `coefficient` copies of stackSymbol per input symbol
      if (phase.coefficient === 1) {
        transitions.push(makeTransition(currentState, phase.symbol, phase.stackSymbol, currentState, EPSILON));
      } else {
        // For coefficient > 1, need intermediate states to pop multiple
        let popState = currentState;
        for (let c = 0; c < phase.coefficient; c++) {
          if (c < phase.coefficient - 1) {
            const intermediateState = newState();
            if (c === 0) {
              transitions.push(makeTransition(popState, phase.symbol, phase.stackSymbol, intermediateState, EPSILON));
            } else {
              transitions.push(makeTransition(popState, EPSILON, phase.stackSymbol, intermediateState, EPSILON));
            }
            popState = intermediateState;
          } else {
            if (c === 0) {
              transitions.push(makeTransition(popState, phase.symbol, phase.stackSymbol, currentState, EPSILON));
            } else {
              transitions.push(makeTransition(popState, EPSILON, phase.stackSymbol, currentState, EPSILON));
            }
          }
        }
      }

      // Transition to next phase
      if (nextPhaseState) {
        transitions.push(makeTransition(currentState, EPSILON, 'Z', nextPhaseState, 'Z'));
        // Also when other stack symbols might be present
        for (const sym of stackAlphabetSet) {
          if (sym !== 'Z' && sym !== phase.stackSymbol) {
            transitions.push(makeTransition(currentState, EPSILON, sym, nextPhaseState, sym));
          }
        }
      }
    } else {
      // Independent: just read symbols without stack matching (push and immediately allow skip)
      // For independent variables, we just read the symbols freely
      transitions.push(makeTransition(currentState, phase.symbol, 'Z', currentState, 'Z'));
      for (const sym of stackAlphabetSet) {
        if (sym !== 'Z') {
          transitions.push(makeTransition(currentState, phase.symbol, sym, currentState, sym));
        }
      }

      if (nextPhaseState) {
        transitions.push(makeTransition(currentState, EPSILON, 'Z', nextPhaseState, 'Z'));
        for (const sym of stackAlphabetSet) {
          if (sym !== 'Z') {
            transitions.push(makeTransition(currentState, EPSILON, sym, nextPhaseState, sym));
          }
        }
      }
    }

    if (nextPhaseState) {
      currentState = nextPhaseState;
    }
  }

  // Final accept state
  const acceptState = newState();
  transitions.push(makeTransition(currentState, EPSILON, 'Z', acceptState, 'Z'));

  // Build description
  const desc = buildLanguageDescription(exponents, conditions);

  return {
    states,
    acceptStates: [acceptState],
    initialState,
    initialStackSymbol: 'Z',
    inputAlphabet,
    stackAlphabet: [...stackAlphabetSet],
    acceptanceMode: 'finalState',
    transitions,
    languageDescription: desc,
  };
}

export function buildLanguageDescription(exponents: ExponentRow[], conditions: ConditionRow[]): string {
  if (exponents.length === 0) return '';

  const superscriptMap: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    'n': 'ⁿ', 'm': 'ᵐ', 'i': 'ⁱ', 'j': 'ʲ', 'k': 'ᵏ',
    'p': 'ᵖ', '+': '⁺', '*': '*',
  };

  const toSuperscript = (s: string): string => {
    return s.split('').map(c => superscriptMap[c] || c).join('');
  };

  const parts = exponents.map(e => {
    const exp = e.coefficient > 1
      ? toSuperscript(String(e.coefficient) + e.variable)
      : toSuperscript(e.variable);
    return `${e.symbol}${exp}`;
  });

  const vars = [...new Set(exponents.map(e => e.variable))];
  const condParts = conditions.length > 0
    ? conditions.map(c => `${c.variable} ${c.operator} ${c.value}`).join(', ')
    : vars.map(v => `${v} ≥ 1`).join(', ');

  return `L = { ${parts.join(' ')} | ${condParts} }`;
}

/**
 * Parse a regex-like language string into a LanguageSpec.
 * Supports patterns like: a^n b^n, a^n b^{2n}, a^i b^j c^i d^j
 */
/**
 * Generate the smallest valid string for a language spec by substituting all variables = 1.
 */
export function generateSmallestString(spec: LanguageSpec): string {
  const { exponents, conditions } = spec;
  if (exponents.length === 0) return '';

  // Determine minimum value for each variable from conditions
  const varMin = new Map<string, number>();
  for (const e of exponents) {
    if (!varMin.has(e.variable)) varMin.set(e.variable, 1);
  }
  for (const c of conditions) {
    let min = 1;
    if (c.operator === '≥') min = c.value;
    else if (c.operator === '>') min = c.value + 1;
    else if (c.operator === '=') min = c.value;
    else min = 1;
    const current = varMin.get(c.variable) ?? 1;
    if (min > current) varMin.set(c.variable, min);
  }

  let result = '';
  for (const e of exponents) {
    const varValue = varMin.get(e.variable) ?? 1;
    const count = e.coefficient * varValue;
    result += e.symbol.repeat(Math.max(0, count));
  }
  return result;
}

export function parseLanguageString(input: string): LanguageSpec | string {
  const exponents: ExponentRow[] = [];
  const conditions: ConditionRow[] = [];

  // Remove spaces and parse token by token
  const cleaned = input.replace(/\s+/g, '');

  // Match patterns like: a^n, a^{2n}, a^m, b^{n+m}
  const regex = /([a-zA-Z0-9(){}[\]])\^?\{?(\d*)([a-z])\}?/g;
  let match;

  while ((match = regex.exec(cleaned)) !== null) {
    const symbol = match[1];
    const coeffStr = match[2];
    const variable = match[3];
    const coefficient = coeffStr ? parseInt(coeffStr) : 1;

    exponents.push({ symbol, variable, coefficient });
  }

  if (exponents.length === 0) {
    // Try simpler pattern: just symbols with superscript unicode
    const superscriptVars: Record<string, string> = {
      'ⁿ': 'n', 'ᵐ': 'm', 'ⁱ': 'i', 'ʲ': 'j', 'ᵏ': 'k', 'ᵖ': 'p',
    };
    const unicodeRegex = /([a-zA-Z0-9])([²³⁴⁵⁶⁷⁸⁹]?)([ⁿᵐⁱʲᵏᵖ])/g;
    while ((match = unicodeRegex.exec(input)) !== null) {
      const symbol = match[1];
      const coeffChar = match[2];
      const varChar = match[3];
      const coeffMap: Record<string, number> = { '²': 2, '³': 3, '⁴': 4, '⁵': 5, '⁶': 6, '⁷': 7, '⁸': 8, '⁹': 9 };
      const coefficient = coeffChar ? (coeffMap[coeffChar] || 1) : 1;
      const variable = superscriptVars[varChar] || 'n';
      exponents.push({ symbol, variable, coefficient });
    }
  }

  if (exponents.length === 0) {
    return 'Could not parse language pattern';
  }

  // Auto-generate conditions: each variable ≥ 1
  const vars = [...new Set(exponents.map(e => e.variable))];
  for (const v of vars) {
    conditions.push({ variable: v, operator: '≥', value: 1 });
  }

  return { exponents, conditions };
}
// ============================================================
// REGEX-BASED PDA GENERATION
// ============================================================

type RegexNode =
  | { type: 'literal'; value: string }
  | { type: 'concat'; left: RegexNode; right: RegexNode }
  | { type: 'union'; left: RegexNode; right: RegexNode }
  | { type: 'star'; child: RegexNode }
  | { type: 'plus'; child: RegexNode }
  | { type: 'epsilon' };

// ---- Parser ----
class RegexParser {
  private pos = 0;
  constructor(private input: string) {}

  parse(): RegexNode {
    const node = this.parseUnion();
    if (this.pos < this.input.length)
      throw new Error(`Unexpected character: ${this.input[this.pos]}`);
    return node;
  }

  private parseUnion(): RegexNode {
    let left = this.parseConcat();
    while (this.pos < this.input.length && this.input[this.pos] === '|') {
      this.pos++;
      const right = this.parseConcat();
      left = { type: 'union', left, right };
    }
    return left;
  }

  private parseConcat(): RegexNode {
    let left = this.parseStar();
    while (
      this.pos < this.input.length &&
      this.input[this.pos] !== ')' &&
      this.input[this.pos] !== '|'
    ) {
      const right = this.parseStar();
      left = { type: 'concat', left, right };
    }
    return left;
  }

  private parseStar(): RegexNode {
    let node = this.parseAtom();
    while (this.pos < this.input.length) {
      if (this.input[this.pos] === '*') {
        this.pos++;
        node = { type: 'star', child: node };
      } else if (this.input[this.pos] === '+') {
        this.pos++;
        node = { type: 'plus', child: node };
      } else {
        break;
      }
    }
    return node;
  }

  private parseAtom(): RegexNode {
    if (this.pos >= this.input.length)
      throw new Error('Unexpected end of regex');

    const ch = this.input[this.pos];

    if (ch === '(') {
      this.pos++;
      const node = this.parseUnion();
      if (this.input[this.pos] !== ')')
        throw new Error('Missing closing )');
      this.pos++;
      return node;
    }

    if (ch === 'ε' || ch === 'e') {
      this.pos++;
      return { type: 'epsilon' };
    }

    if (ch !== ')' && ch !== '|' && ch !== '*' && ch !== '+') {
      this.pos++;
      return { type: 'literal', value: ch };
    }

    throw new Error(`Unexpected character: ${ch}`);
  }
}

// ---- NFA State ----
interface NFAState {
  id: string;
  transitions: { symbol: string | null; to: string }[]; // null = epsilon
}

let nfaCounter = 0;
function newNFAState(): NFAState {
  return { id: `n${nfaCounter++}`, transitions: [] };
}

interface NFAFragment {
  start: NFAState;
  accept: NFAState;
  states: Map<string, NFAState>;
}

// ---- Thompson's Construction ----
function buildNFA(node: RegexNode): NFAFragment {
  const allStates = new Map<string, NFAState>();

  const reg = (s: NFAState) => { allStates.set(s.id, s); return s; };

  function build(n: RegexNode): { start: NFAState; accept: NFAState } {
    switch (n.type) {
      case 'epsilon': {
        const s = reg(newNFAState());
        const a = reg(newNFAState());
        s.transitions.push({ symbol: null, to: a.id });
        return { start: s, accept: a };
      }
      case 'literal': {
        const s = reg(newNFAState());
        const a = reg(newNFAState());
        s.transitions.push({ symbol: n.value, to: a.id });
        return { start: s, accept: a };
      }
      case 'concat': {
        const left = build(n.left);
        const right = build(n.right);
        left.accept.transitions.push({ symbol: null, to: right.start.id });
        return { start: left.start, accept: right.accept };
      }
      case 'union': {
        const s = reg(newNFAState());
        const a = reg(newNFAState());
        const left = build(n.left);
        const right = build(n.right);
        s.transitions.push({ symbol: null, to: left.start.id });
        s.transitions.push({ symbol: null, to: right.start.id });
        left.accept.transitions.push({ symbol: null, to: a.id });
        right.accept.transitions.push({ symbol: null, to: a.id });
        return { start: s, accept: a };
      }
      case 'star': {
        const s = reg(newNFAState());
        const a = reg(newNFAState());
        const child = build(n.child);
        s.transitions.push({ symbol: null, to: child.start.id });
        s.transitions.push({ symbol: null, to: a.id });
        child.accept.transitions.push({ symbol: null, to: child.start.id });
        child.accept.transitions.push({ symbol: null, to: a.id });
        return { start: s, accept: a };
      }
      case 'plus': {
        const child = build(n.child);
        const s = reg(newNFAState());
        const a = reg(newNFAState());
        s.transitions.push({ symbol: null, to: child.start.id });
        child.accept.transitions.push({ symbol: null, to: child.start.id });
        child.accept.transitions.push({ symbol: null, to: a.id });
        return { start: s, accept: a };
      }
    }
  }

  const { start, accept } = build(node);
  return { start, accept, states: allStates };
}

// ---- NFA → PDADefinition ----
export function generatePDAFromRegex(regexStr: string): PDADefinition | string {
  // Reset NFA counter for clean state names
  nfaCounter = 0;

  const cleaned = regexStr.trim().replace(/\s+/g, '');
  if (!cleaned) return 'Empty regex';

  let ast: RegexNode;
  try {
    ast = new RegexParser(cleaned).parse();
  } catch (e: any) {
    return `Parse error: ${e.message}`;
  }

  const nfa = buildNFA(ast);

  // Collect all input symbols
  const inputAlphabetSet = new Set<string>();
  for (const state of nfa.states.values()) {
    for (const t of state.transitions) {
      if (t.symbol !== null) inputAlphabetSet.add(t.symbol);
    }
  }

  // Build PDA states from NFA states (1:1 mapping, stack is just Z always)
  const pdaStates: string[] = [];
  const pdaTransitions: ReturnType<typeof makeTransition>[] = [];

  // Rename NFA states to q0, q1, ...
  const nameMap = new Map<string, string>();
  let qCounter = 0;
  for (const id of nfa.states.keys()) {
    nameMap.set(id, `q${qCounter++}`);
  }

  for (const id of nfa.states.keys()) {
    pdaStates.push(nameMap.get(id)!);
  }

  for (const state of nfa.states.values()) {
    const from = nameMap.get(state.id)!;
    for (const t of state.transitions) {
      const to = nameMap.get(t.to)!;
      const sym = t.symbol ?? EPSILON;
      // Stack: always keep Z (regular language — no stack needed)
      pdaTransitions.push(makeTransition(from, sym, 'Z', to, 'Z'));
    }
  }

  const initialState = nameMap.get(nfa.start.id)!;
  const acceptState = nameMap.get(nfa.accept.id)!;

  return {
    states: pdaStates,
    acceptStates: [acceptState],
    initialState,
    initialStackSymbol: 'Z',
    inputAlphabet: [...inputAlphabetSet],
    stackAlphabet: ['Z'],
    acceptanceMode: 'finalState',
    transitions: pdaTransitions,
    languageDescription: `L = { ${regexStr} }`,
  };
}