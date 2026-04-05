// ============================================================
// COMPLETE REGEX → NFA → PDA ENGINE
// File: src/lib/regex-engine.ts
// ============================================================

import { PDADefinition, PDATransition, makeTransition, EPSILON } from './pda-types';

// ─────────────────────────────────────────────────────────────
// AST TYPES
// ─────────────────────────────────────────────────────────────
export type RegexNode =
  | { type: 'literal';  value: string }
  | { type: 'epsilon' }
  | { type: 'empty' }                                      // ∅ – never matches
  | { type: 'concat';  left: RegexNode; right: RegexNode }
  | { type: 'union';   left: RegexNode; right: RegexNode }
  | { type: 'star';    child: RegexNode }
  | { type: 'plus';    child: RegexNode }                  // sugar: a+ = aa*
  | { type: 'optional'; child: RegexNode };                // sugar: a? = a|ε

// ─────────────────────────────────────────────────────────────
// REGEX PARSER
// Supports: literals, () grouping, | union, * + ? quantifiers
// Concatenation is implicit.  Operator precedence:
//   * + ? (highest) > concat > | (lowest)
// Supports ε / e / \e as epsilon literal.
// ─────────────────────────────────────────────────────────────
export class RegexParser {
  private pos = 0;
  private readonly src: string;

  constructor(raw: string) {
    // Normalise: replace + used as union separator (common notation)
    // but only when it is NOT a quantifier (i.e., after a closing char)
    // We keep '+' as quantifier; use '|' or '+' for union decided by context.
    // Strategy: we accept both '|' and '+' as union at the expression level
    // but treat '+' after an atom as a quantifier.
    this.src = raw.trim();
  }

  parse(): RegexNode {
    if (this.src.length === 0) return { type: 'epsilon' };
    const node = this.parseUnion();
    if (this.pos < this.src.length) {
      throw new SyntaxError(
        `Unexpected character '${this.src[this.pos]}' at position ${this.pos}`
      );
    }
    return node;
  }

  // union: concat (| concat)*
  private parseUnion(): RegexNode {
    let node = this.parseConcat();
    while (this.pos < this.src.length && this.src[this.pos] === '|') {
      this.pos++;
      const right = this.parseConcat();
      node = { type: 'union', left: node, right };
    }
    return node;
  }

  // concat: quantified+
  private parseConcat(): RegexNode {
    let node: RegexNode = { type: 'epsilon' };
    let started = false;

    while (
      this.pos < this.src.length &&
      this.src[this.pos] !== ')' &&
      this.src[this.pos] !== '|'
    ) {
      const right = this.parseQuantified();
      node = started ? { type: 'concat', left: node, right } : right;
      started = true;
    }
    return node;
  }

  // quantified: atom (* | + | ?)*
  private parseQuantified(): RegexNode {
    let node = this.parseAtom();
    while (this.pos < this.src.length) {
      const ch = this.src[this.pos];
      if (ch === '*') {
        this.pos++;
        node = { type: 'star', child: node };
      } else if (ch === '+') {
        this.pos++;
        node = { type: 'plus', child: node };
      } else if (ch === '?') {
        this.pos++;
        node = { type: 'optional', child: node };
      } else {
        break;
      }
    }
    return node;
  }

  private parseAtom(): RegexNode {
    if (this.pos >= this.src.length)
      throw new SyntaxError('Unexpected end of expression');

    const ch = this.src[this.pos];

    // Grouped expression
    if (ch === '(') {
      this.pos++;
      if (this.pos < this.src.length && this.src[this.pos] === ')') {
        // () = epsilon
        this.pos++;
        return { type: 'epsilon' };
      }
      const node = this.parseUnion();
      if (this.pos >= this.src.length || this.src[this.pos] !== ')') {
        throw new SyntaxError(`Missing closing ')' — opened near position ${this.pos}`);
      }
      this.pos++;
      return node;
    }

    // Epsilon literals
    if (ch === 'ε' || ch === 'e') {
      // only treat 'e' as epsilon if not followed by a letter (so 'e' alone or 'ε')
      if (ch === 'ε' || (ch === 'e' && (this.pos + 1 >= this.src.length || !/[a-zA-Z0-9]/.test(this.src[this.pos + 1])))) {
        this.pos++;
        return { type: 'epsilon' };
      }
    }

    // Any other printable character is a literal
    if (ch !== ')' && ch !== '|' && ch !== '*' && ch !== '+' && ch !== '?') {
      this.pos++;
      return { type: 'literal', value: ch };
    }

    throw new SyntaxError(`Unexpected character '${ch}' at position ${this.pos}`);
  }
}

// ─────────────────────────────────────────────────────────────
// NFA (Thompson's Construction)
// ─────────────────────────────────────────────────────────────
export interface NFATransition {
  symbol: string | null; // null = ε
  to: number;
}

export interface NFAState {
  id: number;
  isAccept: boolean;
  transitions: NFATransition[];
}

export interface NFA {
  states: NFAState[];
  start: number;
  accept: number;
  alphabet: Set<string>;
}

let _nfaId = 0;

function freshState(isAccept = false): NFAState {
  return { id: _nfaId++, isAccept, transitions: [] };
}

/** Build NFA fragment (start, accept) using Thompson's construction */
function buildFragment(node: RegexNode, alphabet: Set<string>): { start: NFAState; accept: NFAState } {
  switch (node.type) {
    case 'epsilon': {
      const s = freshState();
      const a = freshState(true);
      s.transitions.push({ symbol: null, to: a.id });
      return { start: s, accept: a };
    }

    case 'empty': {
      // No path to accept
      const s = freshState();
      const a = freshState(true);
      // No transition
      return { start: s, accept: a };
    }

    case 'literal': {
      alphabet.add(node.value);
      const s = freshState();
      const a = freshState(true);
      s.transitions.push({ symbol: node.value, to: a.id });
      return { start: s, accept: a };
    }

    case 'concat': {
      const left  = buildFragment(node.left,  alphabet);
      const right = buildFragment(node.right, alphabet);
      // Wire left.accept → right.start via ε
      left.accept.isAccept = false;
      left.accept.transitions.push({ symbol: null, to: right.start.id });
      return { start: left.start, accept: right.accept };
    }

    case 'union': {
      const s = freshState();
      const a = freshState(true);
      const left  = buildFragment(node.left,  alphabet);
      const right = buildFragment(node.right, alphabet);
      s.transitions.push({ symbol: null, to: left.start.id  });
      s.transitions.push({ symbol: null, to: right.start.id });
      left.accept.isAccept  = false;
      right.accept.isAccept = false;
      left.accept.transitions.push({ symbol: null, to: a.id });
      right.accept.transitions.push({ symbol: null, to: a.id });
      return { start: s, accept: a };
    }

    case 'star': {
      const s = freshState();
      const a = freshState(true);
      const child = buildFragment(node.child, alphabet);
      s.transitions.push({ symbol: null, to: child.start.id });
      s.transitions.push({ symbol: null, to: a.id });
      child.accept.isAccept = false;
      child.accept.transitions.push({ symbol: null, to: child.start.id });
      child.accept.transitions.push({ symbol: null, to: a.id });
      return { start: s, accept: a };
    }

    case 'plus': {
      // a+ = a a*
      const child1 = buildFragment(node.child, alphabet);
      const child2 = buildFragment({ type: 'star', child: node.child }, alphabet);
      child1.accept.isAccept = false;
      child1.accept.transitions.push({ symbol: null, to: child2.start.id });
      return { start: child1.start, accept: child2.accept };
    }

    case 'optional': {
      // a? = a | ε
      return buildFragment({ type: 'union', left: node.child, right: { type: 'epsilon' } }, alphabet);
    }
  }
}

export function buildNFA(ast: RegexNode): NFA {
  _nfaId = 0;
  const alphabet = new Set<string>();
  const { start, accept } = buildFragment(ast, alphabet);

  // Collect all states via BFS
  const visited = new Set<number>();
  const queue: NFAState[] = [start];
  const allStates: NFAState[] = [];
  const stateMap = new Map<number, NFAState>();

  // We need to register all states created; use a registry approach
  // Re-traverse via transition graph
  visited.add(start.id);
  stateMap.set(start.id, start);
  allStates.push(start);

  while (queue.length > 0) {
    const cur = queue.shift()!;
    for (const t of cur.transitions) {
      if (!visited.has(t.to)) {
        // We need to find the actual NFAState object for t.to
        // Since we don't have a global registry, we need to search
        // Let's use a different approach: collect all states during build
        visited.add(t.to);
        // The state object is lost — we need a registry
        // We'll fix this with a global registry below
      }
    }
  }

  // ── Use global state registry approach ──
  return buildNFAWithRegistry(ast);
}

function buildNFAWithRegistry(ast: RegexNode): NFA {
  _nfaId = 0;
  const registry = new Map<number, NFAState>();
  const alphabet = new Set<string>();

  function reg(s: NFAState): NFAState {
    registry.set(s.id, s);
    return s;
  }

  function fresh(isAccept = false): NFAState {
    return reg({ id: _nfaId++, isAccept, transitions: [] });
  }

  function build(node: RegexNode): { start: NFAState; accept: NFAState } {
    switch (node.type) {
      case 'epsilon': {
        const s = fresh(); const a = fresh(true);
        s.transitions.push({ symbol: null, to: a.id });
        return { start: s, accept: a };
      }
      case 'empty': {
        const s = fresh(); const a = fresh(true);
        return { start: s, accept: a };
      }
      case 'literal': {
        alphabet.add(node.value);
        const s = fresh(); const a = fresh(true);
        s.transitions.push({ symbol: node.value, to: a.id });
        return { start: s, accept: a };
      }
      case 'concat': {
        const left = build(node.left); const right = build(node.right);
        left.accept.isAccept = false;
        left.accept.transitions.push({ symbol: null, to: right.start.id });
        return { start: left.start, accept: right.accept };
      }
      case 'union': {
        const s = fresh(); const a = fresh(true);
        const left = build(node.left); const right = build(node.right);
        s.transitions.push({ symbol: null, to: left.start.id  });
        s.transitions.push({ symbol: null, to: right.start.id });
        left.accept.isAccept  = false; right.accept.isAccept = false;
        left.accept.transitions.push({ symbol: null, to: a.id });
        right.accept.transitions.push({ symbol: null, to: a.id });
        return { start: s, accept: a };
      }
      case 'star': {
        const s = fresh(); const a = fresh(true);
        const child = build(node.child);
        s.transitions.push({ symbol: null, to: child.start.id });
        s.transitions.push({ symbol: null, to: a.id });
        child.accept.isAccept = false;
        child.accept.transitions.push({ symbol: null, to: child.start.id });
        child.accept.transitions.push({ symbol: null, to: a.id });
        return { start: s, accept: a };
      }
      case 'plus': {
        // a+ = a · a*
        const child  = build(node.child);
        const starNd = build({ type: 'star', child: node.child });
        child.accept.isAccept = false;
        child.accept.transitions.push({ symbol: null, to: starNd.start.id });
        return { start: child.start, accept: starNd.accept };
      }
      case 'optional': {
        return build({ type: 'union', left: node.child, right: { type: 'epsilon' } });
      }
    }
  }

  const { start, accept } = build(ast);

  // Mark accept
  accept.isAccept = true;

  // Collect all reachable states via BFS over registry
  const allStates: NFAState[] = [];
  const visited = new Set<number>();
  const q = [start.id];
  visited.add(start.id);
  while (q.length) {
    const id = q.shift()!;
    const st = registry.get(id);
    if (!st) continue;
    allStates.push(st);
    for (const t of st.transitions) {
      if (!visited.has(t.to)) {
        visited.add(t.to);
        q.push(t.to);
      }
    }
  }

  return { states: allStates, start: start.id, accept: accept.id, alphabet };
}

// ─────────────────────────────────────────────────────────────
// ε-CLOSURE & REACHABILITY HELPERS
// ─────────────────────────────────────────────────────────────
function epsilonClosure(ids: Set<number>, stateMap: Map<number, NFAState>): Set<number> {
  const closure = new Set(ids);
  const stack = [...ids];
  while (stack.length) {
    const id = stack.pop()!;
    const st = stateMap.get(id);
    if (!st) continue;
    for (const t of st.transitions) {
      if (t.symbol === null && !closure.has(t.to)) {
        closure.add(t.to);
        stack.push(t.to);
      }
    }
  }
  return closure;
}

export function nfaToPDA(nfa: NFA, mode: 'finalState' | 'emptyStack' = 'finalState'): PDADefinition {
  const stateMap = new Map<number, NFAState>();
  for (const s of nfa.states) stateMap.set(s.id, s);

  // Renaming: n0, n1, …
  const nameOf = (id: number) => `q${id}`;

  const pdaStates = nfa.states.map(s => nameOf(s.id));
  const transitions: PDATransition[] = [];

  for (const state of nfa.states) {
    const from = nameOf(state.id);
    for (const t of state.transitions) {
      const sym = t.symbol ?? EPSILON;
      const to  = nameOf(t.to);
      // Stack: always keep Z (this is a regular language PDA)
      transitions.push(makeTransition(from, sym, 'Z', to, 'Z'));
    }
  }

  let acceptStates = [nameOf(nfa.accept)];
  const initialState = nameOf(nfa.start);

  if (mode === 'emptyStack') {
    const emptyAccept = `qEmpty`;
    pdaStates.push(emptyAccept);
    transitions.push(makeTransition(nameOf(nfa.accept), EPSILON, 'Z', emptyAccept, EPSILON));
    acceptStates = [emptyAccept];
  }

  return {
    states: pdaStates,
    acceptStates,
    initialState,
    initialStackSymbol: 'Z',
    inputAlphabet: [...nfa.alphabet].sort(),
    stackAlphabet: ['Z'],
    acceptanceMode: mode,
    transitions,
    languageDescription: '',
  };
}

// ─────────────────────────────────────────────────────────────
// PUBLIC API: parse regex string → PDA definition
// ─────────────────────────────────────────────────────────────
// export interface RegexToPDAResult {
//   ok: true;
//   pda: PDADefinition;
//   nfa: NFA;
//   ast: RegexNode;
// } | {
//   ok: false;
//   error: string;
// }
export type RegexToPDAResult =
  | {
      ok: true;
      pda: PDADefinition;
      nfa: NFA;
      ast: RegexNode;
    }
  | {
      ok: false;
      error: string;
    };

export function regexToPDA(regexStr: string, label?: string, mode: 'finalState' | 'emptyStack' = 'finalState'): RegexToPDAResult {
  try {
    if (!regexStr.trim()) {
      return { ok: false, error: 'Empty expression — please enter a regex.' };
    }

    // Parse
    const ast = new RegexParser(regexStr).parse();

    // Build NFA
    const nfa = buildNFAWithRegistry(ast);

    // Convert to PDA
    const pda = nfaToPDA(nfa, mode);
    pda.languageDescription = label ?? `L = { ${regexStr} }`;

    return { ok: true, pda, nfa, ast };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Unknown parse error' };
  }
}

// ─────────────────────────────────────────────────────────────
// REGEX VALIDATION HINTS
// ─────────────────────────────────────────────────────────────
export interface ValidationHint {
  type: 'error' | 'warning' | 'info';
  message: string;
}

export function validateRegex(input: string): ValidationHint[] {
  const hints: ValidationHint[] = [];
  if (!input.trim()) {
    hints.push({ type: 'info', message: 'Enter a regex expression to generate a PDA.' });
    return hints;
  }

  // Check balanced parens
  let depth = 0;
  for (let i = 0; i < input.length; i++) {
    if (input[i] === '(') depth++;
    if (input[i] === ')') depth--;
    if (depth < 0) {
      hints.push({ type: 'error', message: `Unmatched ')' at position ${i + 1}.` });
      return hints;
    }
  }
  if (depth > 0) {
    hints.push({ type: 'error', message: `${depth} unclosed '(' parenthesis${depth > 1 ? 'es' : ''}.` });
    return hints;
  }

  // Check for consecutive operators
  if (/[|][|]/.test(input)) hints.push({ type: 'error', message: "Consecutive '||' not allowed." });
  if (/^[*+?|]/.test(input.trim())) hints.push({ type: 'error', message: 'Expression cannot start with a quantifier or |.' });
  if (/[|]$/.test(input.trim()))   hints.push({ type: 'error', message: 'Expression cannot end with |.' });

  // Tip for plus
  if (input.includes('+') && !input.includes('|')) {
    hints.push({ type: 'info', message: "Use '+' as Kleene plus (one or more). For union use '|'." });
  }

  return hints;
}

// ─────────────────────────────────────────────────────────────
// NFA VISUALISATION HELPER (for optional NFA display)
// Returns a simple adjacency description for rendering
// ─────────────────────────────────────────────────────────────
export interface NFAVizEdge {
  from: string;
  to: string;
  label: string;
}
export interface NFAVizData {
  states: { id: string; isStart: boolean; isAccept: boolean }[];
  edges: NFAVizEdge[];
}

export function nfaToVizData(nfa: NFA): NFAVizData {
  const nameOf = (id: number) => `q${id}`;
  const states = nfa.states.map(s => ({
    id: nameOf(s.id),
    isStart:  s.id === nfa.start,
    isAccept: s.id === nfa.accept,
  }));
  const edges: NFAVizEdge[] = [];
  for (const s of nfa.states) {
    for (const t of s.transitions) {
      edges.push({
        from:  nameOf(s.id),
        to:    nameOf(t.to),
        label: t.symbol ?? 'ε',
      });
    }
  }
  return { states, edges };
}