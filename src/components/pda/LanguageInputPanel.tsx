import { useState, useCallback, KeyboardEvent } from 'react';
import { usePDA } from '@/hooks/use-pda';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import {
  ExponentRow,
  ConditionRow,
  generatePDAFromLanguage,
  generatePDAFromRegex,
  generateSmallestString,
  buildLanguageDescription,
  parseLanguageString,
  generateParenthesisPDA,
  generatePalindromePDA,
} from '@/lib/pda-generator';

const OPERATORS = ['≥', '>', '=', '<', '≤'] as const;

function autoCloseBracket(
  e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  setValue: (val: string) => void,
  currentValue: string
) {
  const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
  const close = pairs[e.key];
  if (!close) return;
  e.preventDefault();
  const el = e.currentTarget;
  const start = el.selectionStart ?? 0;
  const end = el.selectionEnd ?? 0;
  const newVal = currentValue.slice(0, start) + e.key + close + currentValue.slice(end);
  setValue(newVal);
  requestAnimationFrame(() => {
    el.setSelectionRange(start + 1, start + 1);
  });
}

/** Generate a balanced example string from bracket pairs */
function buildBalancedExample(pairs: [string, string][]): string {
  const valid = pairs.filter(p => p[0] && p[1]);
  if (valid.length === 0) return '';
  // e.g. ()[]{}  nested: ([{}])
  return valid.map(p => `${p[0]}${p[1]}`).join('');
}

/** Generate an ACTUALLY unbalanced example string from bracket pairs */
function buildUnbalancedExample(pairs: [string, string][]): string {
  const valid = pairs.filter(p => p[0] && p[1]);
  if (valid.length === 0) return '';
  if (valid.length === 1) {
    // e.g. only () → show )( as unbalanced
    return `${valid[0][1]}${valid[0][0]}`;
  }
  // mismatched close: open with first, close with second's closer → wrong
  return `${valid[0][0]}${valid[1][1]}`;
}

/** Odd-length palindrome example: aba */
function buildPalinExample(alphabet: string[]): string {
  const a = alphabet.filter(x => x);
  if (a.length === 0) return '';
  if (a.length === 1) return a[0] + a[0] + a[0]; // aaa
  return a[0] + a[1] + a[0]; // aba
}

/** Non-palindrome example: ab */
function buildNonPalinExample(alphabet: string[]): string {
  const a = alphabet.filter(x => x);
  if (a.length === 0) return '';
  if (a.length === 1) return a[0] + a[0] + 'x'; // aax (x not in alphabet)
  return a[0] + a[1]; // ab (not palindrome)
}

export default function LanguageInputPanel() {
  const { setDefinition, setTestInput, startAndRunAll, acceptanceMode, setAcceptanceMode } = usePDA();

  const [exponents, setExponents] = useState<ExponentRow[]>([
    { symbol: 'a', variable: 'n', coefficient: 1 },
    { symbol: 'b', variable: 'n', coefficient: 1 },
  ]);
  const [conditions, setConditions] = useState<ConditionRow[]>([
    { variable: 'n', operator: '≥', value: 1 },
  ]);
  const [regexInput, setRegexInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // 0n1n state
  const [exponents0n1n, setExponents0n1n] = useState<ExponentRow[]>([
    { symbol: '0', variable: 'n', coefficient: 1 },
    { symbol: '1', variable: 'n', coefficient: 1 },
  ]);
  const [conditions0n1n, setConditions0n1n] = useState<ConditionRow[]>([
    { variable: 'n', operator: '≥', value: 1 },
  ]);

  // Parens State — fully customizable
  const [parensPairs, setParensPairs] = useState<[string, string][]>([
    ['(', ')'],
    ['[', ']'],
    ['{', '}']
  ]);

  // Palin State — fully customizable alphabet
  const [palinAlphabet, setPalinAlphabet] = useState<string[]>(['a', 'b']);

  const addExponent = () =>
    setExponents(prev => [...prev, { symbol: '', variable: '', coefficient: 1 }]);
  const removeExponent = (i: number) =>
    setExponents(prev => prev.filter((_, idx) => idx !== i));
  const updateExponent = (i: number, field: keyof ExponentRow, value: string | number) =>
    setExponents(prev => prev.map((e, idx) => (idx === i ? { ...e, [field]: value } : e)));

  const addCondition = () =>
    setConditions(prev => [...prev, { variable: '', operator: '≥' as const, value: 1 }]);
  const removeCondition = (i: number) =>
    setConditions(prev => prev.filter((_, idx) => idx !== i));
  const updateCondition = (i: number, field: keyof ConditionRow, value: string | number) =>
    setConditions(prev => prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));

  const addExponent0n1n = () => setExponents0n1n(prev => [...prev, { symbol: '', variable: '', coefficient: 1 }]);
  const removeExponent0n1n = (i: number) => setExponents0n1n(prev => prev.filter((_, idx) => idx !== i));
  const updateExponent0n1n = (i: number, field: keyof ExponentRow, value: string | number) => setExponents0n1n(prev => prev.map((e, idx) => (idx === i ? { ...e, [field]: value } : e)));

  const addCondition0n1n = () => setConditions0n1n(prev => [...prev, { variable: '', operator: '≥' as const, value: 1 }]);
  const removeCondition0n1n = (i: number) => setConditions0n1n(prev => prev.filter((_, idx) => idx !== i));
  const updateCondition0n1n = (i: number, field: keyof ConditionRow, value: string | number) => setConditions0n1n(prev => prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));

  const updateParens = (i: number, side: 0 | 1, val: string) => setParensPairs(prev => prev.map((pair, idx) => {
    if (idx !== i) return pair;
    const newPair: [string, string] = [...pair] as [string, string];
    newPair[side] = val;
    return newPair;
  }));
  const removeParens = (i: number) => setParensPairs(prev => prev.filter((_, idx) => idx !== i));

  const updatePalin = (i: number, val: string) => setPalinAlphabet(prev => prev.map((a, idx) => idx === i ? val : a));
  const removePalin = (i: number) => setPalinAlphabet(prev => prev.filter((_, idx) => idx !== i));

  const preview = buildLanguageDescription(
    exponents.filter(e => e.symbol && e.variable),
    conditions
  );

  const handleGenerate = useCallback(() => {
    setError(null);
    setSuccess(false);

    const validExponents = exponents.filter(e => e.symbol && e.variable);
    if (validExponents.length === 0) {
      setError('Add at least one symbol with an exponent variable');
      return;
    }

    const spec = { exponents: validExponents, conditions: conditions.filter(c => c.variable) };
    const result = generatePDAFromLanguage(spec, acceptanceMode);

    if (typeof result === 'string') {
      setError(result);
    } else {
      const defWithMode = { ...result, acceptanceMode };
      setDefinition(defWithMode);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    }
  }, [exponents, conditions, acceptanceMode, setDefinition]);

  const handleRegexGenerate = useCallback(() => {
    setError(null);
    setSuccess(false);

    if (!regexInput.trim()) {
      setError('Enter a regex pattern');
      return;
    }

    const parsed = parseLanguageString(regexInput);
    if (typeof parsed !== 'string') {
      const result = generatePDAFromLanguage(parsed, acceptanceMode);
      if (typeof result === 'string') {
        setError(result);
      } else {
        const defWithMode = { ...result, acceptanceMode };
        setDefinition(defWithMode);
        setExponents(parsed.exponents);
        setConditions(parsed.conditions);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      }
      return;
    }

    const result = generatePDAFromRegex(regexInput, undefined, acceptanceMode);
    if ('error' in result) {
      setError(result.error);
    } else {
      const defWithMode = { ...result.pda, acceptanceMode };
      setDefinition(defWithMode);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    }
  }, [regexInput, acceptanceMode, setDefinition]);

  const preview0n1n = buildLanguageDescription(
    exponents0n1n.filter(e => e.symbol && e.variable),
    conditions0n1n
  );

  const handle0n1nGenerate = useCallback(() => {
    setError(null);
    setSuccess(false);
    
    const validExponents = exponents0n1n.filter(e => e.symbol && e.variable);
    if (validExponents.length === 0) {
      setError('Add at least one symbol with an exponent variable');
      return;
    }

    const spec = { exponents: validExponents, conditions: conditions0n1n.filter(c => c.variable) };
    const result = generatePDAFromLanguage(spec, acceptanceMode);

    if (typeof result === 'string') {
      setError(result);
    } else {
      const defWithMode = { ...result, acceptanceMode };
      setDefinition(defWithMode);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    }
  }, [exponents0n1n, conditions0n1n, acceptanceMode, setDefinition]);

  const handleParensGenerate = useCallback(() => {
    setError(null);
    setSuccess(false);
    
    const validPairs = parensPairs.filter(p => p[0] && p[1]);
    if (validPairs.length === 0) {
      setError('Add at least one bracket pair');
      return;
    }

    // Check for duplicate open/close chars
    const opens = validPairs.map(p => p[0]);
    const closes = validPairs.map(p => p[1]);
    if (new Set(opens).size !== opens.length) {
      setError('Each opening bracket must be unique');
      return;
    }
    if (new Set(closes).size !== closes.length) {
      setError('Each closing bracket must be unique');
      return;
    }
    // open and close chars must not overlap
    const openSet = new Set(opens);
    for (const c of closes) {
      if (openSet.has(c)) {
        setError(`Character "${c}" is used as both an opening and closing bracket`);
        return;
      }
    }
    
    const result = generateParenthesisPDA(validPairs, acceptanceMode);
    if (typeof result === 'string') {
      setError(result);
    } else {
      setDefinition(result);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    }
  }, [parensPairs, acceptanceMode, setDefinition]);

  const handlePalindromeGenerate = useCallback(() => {
    setError(null);
    setSuccess(false);
    
    const validAlpha = palinAlphabet.filter(a => a);
    if (validAlpha.length === 0) {
      setError('Add at least one alphabet symbol');
      return;
    }

    // Check for duplicate symbols
    if (new Set(validAlpha).size !== validAlpha.length) {
      setError('Alphabet symbols must be unique');
      return;
    }
    
    const result = generatePalindromePDA(validAlpha, acceptanceMode);
    if (typeof result === 'string') {
      setError(result);
    } else {
      setDefinition(result);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    }
  }, [palinAlphabet, acceptanceMode, setDefinition]);

  // ─── Acceptance Mode Toggle ───────────────────────────────────
  const AcceptanceModeToggle = () => (
    <div className="flex items-center gap-2 pt-1">
      <span className="text-xs text-muted-foreground font-medium shrink-0">Accept by:</span>
      <div className="flex rounded overflow-hidden border border-border text-xs">
        <button
          type="button"
          onClick={() => setAcceptanceMode('finalState')}
          className={`px-2.5 py-1 transition-colors ${
            acceptanceMode === 'finalState'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
        >
          Final State
        </button>
        <button
          type="button"
          onClick={() => setAcceptanceMode('emptyStack')}
          className={`px-2.5 py-1 transition-colors border-l border-border ${
            acceptanceMode === 'emptyStack'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
        >
          Empty Stack
        </button>
      </div>
    </div>
  );

  // Derived display values
  const validParensPairs = parensPairs.filter(p => p[0] && p[1]);
  const balancedEx = buildBalancedExample(validParensPairs);
  const unbalancedEx = buildUnbalancedExample(validParensPairs);

  const validPalinAlpha = palinAlphabet.filter(a => a);
  const palindromeEx = buildPalinExample(validPalinAlpha);
  const nonPalinEx = buildNonPalinExample(validPalinAlpha);

  return (
    <div className="panel">
      <div className="panel-title">Language Input</div>

      <Tabs defaultValue="lang" className="w-full">
        <TabsList className="w-full grid grid-cols-4 h-8 bg-secondary/80">
          <TabsTrigger value="lang" className="text-[10px] sm:text-xs px-1">aⁿbᵐ</TabsTrigger>
          <TabsTrigger value="0n1n" className="text-[10px] sm:text-xs px-1">0ⁿ1ⁿ</TabsTrigger>
          <TabsTrigger value="parens" className="text-[10px] sm:text-xs px-1">PARENS</TabsTrigger>
          <TabsTrigger value="palindrome" className="text-[10px] sm:text-xs px-1">PALIN</TabsTrigger>
        </TabsList>

        {/* ── LANG tab ── */}
        <TabsContent value="lang" className="mt-2 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">
              Symbols &amp; Exponents
            </label>
            <div className="space-y-1.5">
              {exponents.map((exp, i) => (
                <div key={i} className="flex items-center gap-1">
                  <input
                    value={exp.symbol}
                    onChange={e => updateExponent(i, 'symbol', e.target.value)}
                    onKeyDown={e =>
                      autoCloseBracket(e, val => updateExponent(i, 'symbol', val), exp.symbol)
                    }
                    placeholder="a"
                    className="w-10 h-7 text-xs text-center rounded border border-input bg-background text-foreground font-mono px-1"
                  />
                  <span className="text-xs text-muted-foreground">^</span>
                  <input
                    value={exp.coefficient > 1 ? exp.coefficient : ''}
                    onChange={e => updateExponent(i, 'coefficient', parseInt(e.target.value) || 1)}
                    placeholder="1"
                    className="w-8 h-7 text-xs text-center rounded border border-input bg-background text-foreground font-mono px-1"
                  />
                  <input
                    value={exp.variable}
                    onChange={e => updateExponent(i, 'variable', e.target.value)}
                    placeholder="n"
                    className="w-10 h-7 text-xs text-center rounded border border-input bg-background text-foreground font-mono px-1"
                  />
                  <button
                    onClick={() => removeExponent(i)}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addExponent}
              className="mt-1.5 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="w-3 h-3" /> Add Row
            </button>
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">
              Conditions
            </label>
            <div className="space-y-1.5">
              {conditions.map((cond, i) => (
                <div key={i} className="flex items-center gap-1">
                  <input
                    value={cond.variable}
                    onChange={e => updateCondition(i, 'variable', e.target.value)}
                    placeholder="n"
                    className="w-10 h-7 text-xs text-center rounded border border-input bg-background text-foreground font-mono px-1"
                  />
                  <select
                    value={cond.operator}
                    onChange={e => updateCondition(i, 'operator', e.target.value)}
                    className="w-10 h-7 text-xs text-center rounded border border-input bg-background text-foreground font-mono px-0"
                  >
                    {OPERATORS.map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                  <input
                    value={cond.value}
                    onChange={e => updateCondition(i, 'value', parseInt(e.target.value) || 0)}
                    className="w-10 h-7 text-xs text-center rounded border border-input bg-background text-foreground font-mono px-1"
                  />
                  <button
                    onClick={() => removeCondition(i)}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addCondition}
              className="mt-1.5 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="w-3 h-3" /> Add Row
            </button>
          </div>

          {preview && (
            <div className="p-2 rounded bg-secondary border border-border">
              <span className="text-xs text-muted-foreground">Preview: </span>
              <span className="text-xs font-mono text-primary">{preview}</span>
            </div>
          )}

          <AcceptanceModeToggle />

          <button
            onClick={handleGenerate}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Generate PDA
          </button>
        </TabsContent>

        {/* ── 0ⁿ1ⁿ tab ── */}
        <TabsContent value="0n1n" className="mt-2 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">
              Symbols &amp; Exponents
            </label>
            <div className="space-y-1.5">
              {exponents0n1n.map((exp, i) => (
                <div key={i} className="flex items-center gap-1">
                  <input
                    value={exp.symbol}
                    onChange={e => updateExponent0n1n(i, 'symbol', e.target.value)}
                    onKeyDown={e =>
                      autoCloseBracket(e, val => updateExponent0n1n(i, 'symbol', val), exp.symbol)
                    }
                    placeholder="0"
                    className="w-10 h-7 text-xs text-center rounded border border-input bg-background text-foreground font-mono px-1"
                  />
                  <span className="text-xs text-muted-foreground">^</span>
                  <input
                    value={exp.coefficient > 1 ? exp.coefficient : ''}
                    onChange={e => updateExponent0n1n(i, 'coefficient', parseInt(e.target.value) || 1)}
                    placeholder="1"
                    className="w-8 h-7 text-xs text-center rounded border border-input bg-background text-foreground font-mono px-1"
                  />
                  <input
                    value={exp.variable}
                    onChange={e => updateExponent0n1n(i, 'variable', e.target.value)}
                    placeholder="n"
                    className="w-10 h-7 text-xs text-center rounded border border-input bg-background text-foreground font-mono px-1"
                  />
                  <button
                    onClick={() => removeExponent0n1n(i)}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addExponent0n1n}
              className="mt-1.5 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="w-3 h-3" /> Add Row
            </button>
          </div>

          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">
              Conditions
            </label>
            <div className="space-y-1.5">
              {conditions0n1n.map((cond, i) => (
                <div key={i} className="flex items-center gap-1">
                  <input
                    value={cond.variable}
                    onChange={e => updateCondition0n1n(i, 'variable', e.target.value)}
                    placeholder="n"
                    className="w-10 h-7 text-xs text-center rounded border border-input bg-background text-foreground font-mono px-1"
                  />
                  <select
                    value={cond.operator}
                    onChange={e => updateCondition0n1n(i, 'operator', e.target.value)}
                    className="w-10 h-7 text-xs text-center rounded border border-input bg-background text-foreground font-mono px-0"
                  >
                    {OPERATORS.map(op => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                  <input
                    value={cond.value}
                    onChange={e => updateCondition0n1n(i, 'value', parseInt(e.target.value) || 0)}
                    className="w-10 h-7 text-xs text-center rounded border border-input bg-background text-foreground font-mono px-1"
                  />
                  <button
                    onClick={() => removeCondition0n1n(i)}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={addCondition0n1n}
              className="mt-1.5 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="w-3 h-3" /> Add Row
            </button>
          </div>

          {preview0n1n && (
            <div className="p-2 rounded bg-secondary border border-border">
              <span className="text-xs text-muted-foreground">Preview: </span>
              <span className="text-xs font-mono text-primary">{preview0n1n}</span>
            </div>
          )}

          <AcceptanceModeToggle />
          <button
            onClick={handle0n1nGenerate}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Generate PDA
          </button>
        </TabsContent>

        {/* ── PARENS tab ── */}
        <TabsContent value="parens" className="mt-2 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
              Bracket Pairs{' '}
              <span className="text-muted-foreground/60 font-normal">(open → close)</span>
            </label>
            <div className="space-y-1.5">
              {parensPairs.map((pair, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="flex items-center gap-1 flex-1">
                    <input
                      value={pair[0]}
                      onChange={e => updateParens(i, 0, e.target.value.slice(-1))}
                      className="w-9 h-7 text-sm text-center rounded border border-input bg-background text-foreground font-mono"
                      placeholder="("
                      maxLength={1}
                    />
                    <span className="text-muted-foreground text-sm">→</span>
                    <input
                      value={pair[1]}
                      onChange={e => updateParens(i, 1, e.target.value.slice(-1))}
                      className="w-9 h-7 text-sm text-center rounded border border-input bg-background text-foreground font-mono"
                      placeholder=")"
                      maxLength={1}
                    />
                  </div>
                  <button
                    onClick={() => removeParens(i)}
                    className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => setParensPairs(prev => [...prev, ['', '']])}
              className="mt-1.5 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="w-3 h-3" /> Add Pair
            </button>
          </div>

          {/* Live preview — correct balanced/unbalanced examples */}
          <div className="p-2 rounded bg-secondary border border-border space-y-1">
            <p className="text-xs text-muted-foreground">
              Language:{' '}
              <span className="font-mono text-primary">
                L = {'{'} balanced{' '}
                {validParensPairs.length > 0
                  ? validParensPairs.map(p => `${p[0]}${p[1]}`).join(', ')
                  : '...'}
                {' }'}
              </span>
            </p>
            {validParensPairs.length > 0 && (
              <p className="text-xs text-muted-foreground/70">
                ✓ e.g.{' '}
                <span className="font-mono text-green-400">{balancedEx}</span>
                {'  '}✗ e.g.{' '}
                <span className="font-mono text-red-400">{unbalancedEx}</span>
              </p>
            )}
          </div>

          <AcceptanceModeToggle />
          <button
            onClick={handleParensGenerate}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Generate PDA
          </button>
        </TabsContent>

        {/* ── PALINDROME tab ── */}
        <TabsContent value="palindrome" className="mt-2 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1.5 block">
              Alphabet Symbols
              <span className="text-muted-foreground/60 font-normal ml-1">(one char each)</span>
            </label>

            {/* Chip-style display */}
            <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
              {palinAlphabet.map((sym, i) => (
                <div
                  key={i}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary border border-border text-xs font-mono text-foreground"
                >
                  <input
                    value={sym}
                    onChange={e => updatePalin(i, e.target.value.slice(-1))}
                    className="w-5 bg-transparent text-center focus:outline-none font-mono"
                    maxLength={1}
                  />
                  <button
                    onClick={() => removePalin(i)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Quick add buttons for common symbols */}
            <div className="flex flex-wrap gap-1 mb-1">
              {['a', 'b', 'c', '0', '1'].filter(s => !palinAlphabet.includes(s)).map(s => (
                <button
                  key={s}
                  onClick={() => setPalinAlphabet(prev => [...prev, s])}
                  className="px-2 py-0.5 text-xs rounded border border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors font-mono"
                >
                  +{s}
                </button>
              ))}
              <button
                onClick={() => setPalinAlphabet(prev => [...prev, ''])}
                className="px-2 py-0.5 text-xs rounded border border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors"
              >
                + custom
              </button>
            </div>
          </div>

          {/* Live preview — correct palindrome/non-palindrome examples */}
          <div className="p-2 rounded bg-secondary border border-border space-y-1">
            <p className="text-xs text-muted-foreground">
              Language:{' '}
              <span className="font-mono text-primary">
                L = {'{'} ww<sup>R</sup> | w ∈ {'{'}
                {validPalinAlpha.join(',') || '...'}
                {'}'}⁺ {'}'}
              </span>
            </p>
            {validPalinAlpha.length >= 1 && (
              <p className="text-xs text-muted-foreground/70">
                ✓ e.g.{' '}
                <span className="font-mono text-green-400">{palindromeEx}</span>
                {'  '}✗ e.g.{' '}
                <span className="font-mono text-red-400">{nonPalinEx}</span>
              </p>
            )}
          </div>

          <AcceptanceModeToggle />
          <button
            onClick={handlePalindromeGenerate}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Generate PDA
          </button>
        </TabsContent>

        {/* ── REGEX tab ── */}
        <TabsContent value="regex" className="mt-2 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">
              Language Pattern
            </label>
            <textarea
              value={regexInput}
              onChange={e => setRegexInput(e.target.value)}
              onKeyDown={e => autoCloseBracket(e, setRegexInput, regexInput)}
              placeholder="e.g. a^n b^{2n} or aⁿb²ⁿ"
              className="w-full h-16 text-xs rounded border border-input bg-background text-foreground font-mono p-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <AcceptanceModeToggle />

          <button
            onClick={handleRegexGenerate}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Generate PDA
          </button>
        </TabsContent>
      </Tabs>

      {/* Error / Success */}
      {error && (
        <div className="mt-2 p-2 rounded bg-destructive/10 border border-destructive/30 flex items-start gap-2">
          <AlertTriangle className="w-3.5 h-3.5 text-destructive mt-0.5 flex-shrink-0" />
          <span className="text-xs text-destructive">{error}</span>
        </div>
      )}
      {success && (
        <div className="mt-2 p-2 rounded bg-[hsl(var(--success))]/10 border border-[hsl(var(--success))]/30">
          <span className="text-xs text-[hsl(var(--success))]">✓ PDA generated successfully</span>
        </div>
      )}
    </div>
  );
}