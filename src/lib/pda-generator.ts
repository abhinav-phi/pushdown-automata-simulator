// ============================================================
// src/lib/pda-generator.ts  — CLEANED UP
// Regex-based generation is now fully handled by regex-engine.ts
// This file handles structured LANG patterns (aⁿbⁿ etc.) only.
// ============================================================

import { PDADefinition, makeTransition, EPSILON } from './pda-types';

export interface ExponentRow {
  symbol: string;
  variable: string;
  coefficient: number;
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

// ─────────────────────────────────────────────────────────────
// generatePDAFromLanguage
// ─────────────────────────────────────────────────────────────
export function generatePDAFromLanguage(spec: LanguageSpec, mode: 'finalState' | 'emptyStack' = 'finalState'): PDADefinition | string {
  const { exponents, conditions } = spec;
  if (exponents.length === 0) return 'No exponents defined';

  // Group by variable
  const varMap = new Map<string, { symbol: string; coefficient: number; index: number }[]>();
  for (let i = 0; i < exponents.length; i++) {
    const e = exponents[i];
    if (!varMap.has(e.variable)) varMap.set(e.variable, []);
    varMap.get(e.variable)!.push({ symbol: e.symbol, coefficient: e.coefficient, index: i });
  }

  const groups: VariableGroup[] = [];
  for (const [variable, entries] of varMap) groups.push({ variable, entries });

  // Non-CF check: 3+ symbols sharing one variable (e.g., aⁿbⁿcⁿ)
  for (const g of groups) {
    if (g.entries.length >= 3) {
      return `This language is not context-free — PDA cannot recognise it. Variable "${g.variable}" appears in ${g.entries.length} symbols (${g.entries.map(e => e.symbol).join(', ')}), requiring ${g.entries.length}-way matching.`;
    }
  }

  const crossingError = checkForCrossingDependencies(groups, exponents);
  if (crossingError) return crossingError;

  return buildPDA(groups, exponents, conditions, mode);
}

function checkForCrossingDependencies(groups: VariableGroup[], exponents: ExponentRow[]): string | null {
  const pairedGroups = groups.filter(g => g.entries.length === 2);
  for (let i = 0; i < pairedGroups.length; i++) {
    for (let j = i + 1; j < pairedGroups.length; j++) {
      const a = pairedGroups[i];
      const b = pairedGroups[j];
      const [a1, a2] = a.entries.map(e => e.index).sort((x, y) => x - y);
      const [b1, b2] = b.entries.map(e => e.index).sort((x, y) => x - y);
      if ((a1 < b1 && b1 < a2 && a2 < b2) || (b1 < a1 && a1 < b2 && b2 < a2)) {
        return `This language is not context-free — PDA cannot recognise it. Variables "${a.variable}" and "${b.variable}" have crossing dependencies.`;
      }
    }
  }
  return null;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a), y = Math.abs(b);
  while (y) { const t = y; y = x % y; x = t; }
  return x || 1;
}

function buildPDA(groups: VariableGroup[], exponents: ExponentRow[], conditions: ConditionRow[], mode: 'finalState' | 'emptyStack'): PDADefinition {
  const states: string[] = [];
  const transitions: ReturnType<typeof makeTransition>[] = [];
  const inputAlphabet = [...new Set(exponents.map(e => e.symbol))];
  const stackAlphabetSet = new Set<string>(['Z']);

  let stateCounter = 0;
  const newState = () => { const s = `q${stateCounter++}`; states.push(s); return s; };

  const matchedPairs  = groups.filter(g => g.entries.length === 2);
  const independents  = groups.filter(g => g.entries.length === 1);
  matchedPairs.sort((a, b) => a.entries[0].index - b.entries[0].index);

  interface Phase {
    type: 'push' | 'pop' | 'independent';
    symbol: string;
    coefficient: number;
    variable: string;
    stackSymbol: string;
    index: number;
  }

  const phases: Phase[] = [];

  for (const pair of matchedPairs) {
    const sorted = [...pair.entries].sort((a, b) => a.index - b.index);
    const stackSym = pair.variable.toUpperCase();
    stackAlphabetSet.add(stackSym);
    const firstCoeff  = Math.max(1, sorted[0].coefficient);
    const secondCoeff = Math.max(1, sorted[1].coefficient);
    const divisor = gcd(firstCoeff, secondCoeff);
    phases.push({ type: 'push', symbol: sorted[0].symbol, coefficient: secondCoeff / divisor, variable: pair.variable, stackSymbol: stackSym, index: sorted[0].index });
    phases.push({ type: 'pop',  symbol: sorted[1].symbol, coefficient: firstCoeff  / divisor, variable: pair.variable, stackSymbol: stackSym, index: sorted[1].index });
  }

  for (const ind of independents) {
    const e = ind.entries[0];
    const stackSym = ind.variable.toUpperCase();
    stackAlphabetSet.add(stackSym);
    phases.push({ type: 'independent', symbol: e.symbol, coefficient: e.coefficient, variable: ind.variable, stackSymbol: stackSym, index: e.index });
  }

  phases.sort((a, b) => a.index - b.index);

  const initialState = newState();
  let currentState = initialState;

  for (let pi = 0; pi < phases.length; pi++) {
    const phase = phases[pi];
    const nextPhaseState = pi < phases.length - 1 ? newState() : null;

    if (phase.type === 'push') {
      const pushStr = phase.stackSymbol.repeat(phase.coefficient);
      transitions.push(makeTransition(currentState, phase.symbol, 'Z', currentState, pushStr + 'Z'));
      transitions.push(makeTransition(currentState, phase.symbol, phase.stackSymbol, currentState, pushStr + phase.stackSymbol));
      if (nextPhaseState) {
        transitions.push(makeTransition(currentState, EPSILON, phase.stackSymbol, nextPhaseState, phase.stackSymbol));
        transitions.push(makeTransition(currentState, EPSILON, 'Z', nextPhaseState, 'Z'));
      }
    } else if (phase.type === 'pop') {
      if (phase.coefficient === 1) {
        transitions.push(makeTransition(currentState, phase.symbol, phase.stackSymbol, currentState, EPSILON));
      } else {
        let popState = currentState;
        for (let c = 0; c < phase.coefficient; c++) {
          if (c < phase.coefficient - 1) {
            const intermediateState = newState();
            if (c === 0) transitions.push(makeTransition(popState, phase.symbol, phase.stackSymbol, intermediateState, EPSILON));
            else         transitions.push(makeTransition(popState, EPSILON,       phase.stackSymbol, intermediateState, EPSILON));
            popState = intermediateState;
          } else {
            if (c === 0) transitions.push(makeTransition(popState, phase.symbol, phase.stackSymbol, currentState, EPSILON));
            else         transitions.push(makeTransition(popState, EPSILON,       phase.stackSymbol, currentState, EPSILON));
          }
        }
      }
      if (nextPhaseState) {
        transitions.push(makeTransition(currentState, EPSILON, 'Z', nextPhaseState, 'Z'));
        for (const sym of stackAlphabetSet) {
          if (sym !== 'Z' && sym !== phase.stackSymbol) {
            transitions.push(makeTransition(currentState, EPSILON, sym, nextPhaseState, sym));
          }
        }
      }
    } else {
      // independent
      transitions.push(makeTransition(currentState, phase.symbol, 'Z', currentState, 'Z'));
      for (const sym of stackAlphabetSet) {
        if (sym !== 'Z') transitions.push(makeTransition(currentState, phase.symbol, sym, currentState, sym));
      }
      if (nextPhaseState) {
        transitions.push(makeTransition(currentState, EPSILON, 'Z', nextPhaseState, 'Z'));
        for (const sym of stackAlphabetSet) {
          if (sym !== 'Z') transitions.push(makeTransition(currentState, EPSILON, sym, nextPhaseState, sym));
        }
      }
    }

    if (nextPhaseState) currentState = nextPhaseState;
  }

  const acceptState = newState();
  
  if (mode === 'emptyStack') {
    transitions.push(makeTransition(currentState, EPSILON, 'Z', acceptState, EPSILON));
  } else {
    transitions.push(makeTransition(currentState, EPSILON, 'Z', acceptState, 'Z'));
  }

  const desc = buildLanguageDescription(exponents, conditions);
  return {
    states,
    acceptStates: [acceptState],
    initialState,
    initialStackSymbol: 'Z',
    inputAlphabet,
    stackAlphabet: [...stackAlphabetSet],
    acceptanceMode: mode,
    transitions,
    languageDescription: desc,
  };
}

// ─────────────────────────────────────────────────────────────
// buildLanguageDescription
// ─────────────────────────────────────────────────────────────
export function buildLanguageDescription(exponents: ExponentRow[], conditions: ConditionRow[]): string {
  if (exponents.length === 0) return '';
  const superscriptMap: Record<string, string> = {
    '0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹',
    'n':'ⁿ','m':'ᵐ','i':'ⁱ','j':'ʲ','k':'ᵏ','p':'ᵖ','+':'⁺','*':'*',
  };
  const toSuperscript = (s: string) => s.split('').map(c => superscriptMap[c] ?? c).join('');
  const parts = exponents.map(e => {
    const exp = e.coefficient > 1 ? toSuperscript(String(e.coefficient) + e.variable) : toSuperscript(e.variable);
    return `${e.symbol}${exp}`;
  });
  const vars = [...new Set(exponents.map(e => e.variable))];
  const condParts = conditions.length > 0
    ? conditions.map(c => `${c.variable} ${c.operator} ${c.value}`).join(', ')
    : vars.map(v => `${v} ≥ 1`).join(', ');
  return `L = { ${parts.join(' ')} | ${condParts} }`;
}

// ─────────────────────────────────────────────────────────────
// generateSmallestString
// ─────────────────────────────────────────────────────────────
export function generateSmallestString(spec: LanguageSpec): string {
  const { exponents, conditions } = spec;
  if (exponents.length === 0) return '';
  const varMin = new Map<string, number>();
  for (const e of exponents) if (!varMin.has(e.variable)) varMin.set(e.variable, 1);
  for (const c of conditions) {
    let min = 1;
    if (c.operator === '≥') min = c.value;
    else if (c.operator === '>') min = c.value + 1;
    else if (c.operator === '=') min = c.value;
    const current = varMin.get(c.variable) ?? 1;
    if (min > current) varMin.set(c.variable, min);
  }
  let result = '';
  for (const e of exponents) {
    const v = varMin.get(e.variable) ?? 1;
    result += e.symbol.repeat(Math.max(0, e.coefficient * v));
  }
  return result;
}

// ─────────────────────────────────────────────────────────────
// parseLanguageString  (aⁿbⁿ / a^n b^{2n} patterns)
// ─────────────────────────────────────────────────────────────
export function parseLanguageString(input: string): LanguageSpec | string {
  const exponents: ExponentRow[] = [];
  const conditions: ConditionRow[] = [];
  const cleaned = input.replace(/\s+/g, '');

  const regex = /([a-zA-Z0-9(){}[\]])\^?\{?(\d*)([a-z])\}?/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(cleaned)) !== null) {
    const symbol      = match[1];
    const coeffStr    = match[2];
    const variable    = match[3];
    const coefficient = coeffStr ? parseInt(coeffStr) : 1;
    exponents.push({ symbol, variable, coefficient });
  }

  if (exponents.length === 0) {
    const superscriptVars: Record<string, string> = {
      'ⁿ':'n','ᵐ':'m','ⁱ':'i','ʲ':'j','ᵏ':'k','ᵖ':'p',
    };
    const unicodeRegex = /([a-zA-Z0-9])([²³⁴⁵⁶⁷⁸⁹]?)([ⁿᵐⁱʲᵏᵖ])/g;
    while ((match = unicodeRegex.exec(input)) !== null) {
      const symbol    = match[1];
      const coeffChar = match[2];
      const varChar   = match[3];
      const coeffMap: Record<string, number> = {'²':2,'³':3,'⁴':4,'⁵':5,'⁶':6,'⁷':7,'⁸':8,'⁹':9};
      const coefficient = coeffChar ? (coeffMap[coeffChar] ?? 1) : 1;
      const variable    = superscriptVars[varChar] ?? 'n';
      exponents.push({ symbol, variable, coefficient });
    }
  }

  if (exponents.length === 0) return 'Could not parse language pattern';

  const vars = [...new Set(exponents.map(e => e.variable))];
  for (const v of vars) conditions.push({ variable: v, operator: '≥', value: 1 });
  return { exponents, conditions };
}

// ─────────────────────────────────────────────────────────────
// generatePDAFromRegex  — REMOVED (see regex-engine.ts)
// Kept as a thin shim so old imports don't break
// ─────────────────────────────────────────────────────────────
export { regexToPDA as generatePDAFromRegex } from './regex-engine';