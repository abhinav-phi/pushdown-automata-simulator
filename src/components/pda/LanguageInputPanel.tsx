import { useState, useCallback, KeyboardEvent } from 'react';
import { usePDA } from '@/hooks/use-pda';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Trash2, AlertTriangle, Play, ChevronRight } from 'lucide-react';
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

// ── PARENS helpers ──────────────────────────────────────────────────────────

/** Build the minimum valid test string for a balanced-bracket language.
 *  With nestDepth=1 we get "()[]{}" style; nestDepth=2 gives "([{}])". */
function buildParensMinString(pairs: [string, string][], nestDepth: number = 1): string {
  const valid = pairs.filter(p => p[0] && p[1]);
  if (valid.length === 0) return '';
  if (nestDepth <= 1) {
    // flat: each pair once
    return valid.map(p => `${p[0]}${p[1]}`).join('');
  }
  // nested: wrap each pair inside the previous
  let result = '';
  for (let i = valid.length - 1; i >= 0; i--) {
    result = `${valid[i][0]}${result}${valid[i][1]}`;
  }
  return result;
}

function buildParensUnbalancedExample(pairs: [string, string][]): string {
  const valid = pairs.filter(p => p[0] && p[1]);
  if (valid.length === 0) return '';
  if (valid.length === 1) return `${valid[0][1]}${valid[0][0]}`;
  return `${valid[0][0]}${valid[1][1]}`;
}

// ── PALIN helpers ───────────────────────────────────────────────────────────

interface PalinConditionRow {
  variable: string;   // e.g. "n"
  operator: '≥' | '>' | '=';
  value: number;
}

function buildPalinMinString(alphabet: string[], minLen: number): string {
  const a = alphabet.filter(x => x);
  if (a.length === 0) return '';
  // Build shortest odd palindrome of length >= minLen
  const half = Math.ceil(minLen / 2);
  const halves: string[] = [];
  for (let i = 0; i < half; i++) halves.push(a[i % a.length]);
  // ww^R
  const left = halves.join('');
  const right = [...left].reverse().join('');
  return left + (minLen % 2 === 1 ? left[left.length - 1] : '') + right;
}

// ── AcceptanceModeToggle (shared) ───────────────────────────────────────────
function AcceptanceModeToggle({
  mode,
  setMode,
}: {
  mode: 'finalState' | 'emptyStack';
  setMode: (m: 'finalState' | 'emptyStack') => void;
}) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="text-xs text-muted-foreground font-medium shrink-0">Accept by:</span>
      <div className="flex rounded overflow-hidden border border-border text-xs">
        <button
          type="button"
          onClick={() => setMode('finalState')}
          className={`px-2.5 py-1 transition-colors ${
            mode === 'finalState'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
        >
          Final State
        </button>
        <button
          type="button"
          onClick={() => setMode('emptyStack')}
          className={`px-2.5 py-1 transition-colors border-l border-border ${
            mode === 'emptyStack'
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
        >
          Empty Stack
        </button>
      </div>
    </div>
  );
}

// ── Small helper: labelled field ────────────────────────────────────────────
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-xs text-muted-foreground font-medium mb-1 block">{children}</label>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ───────────────────────────────────────────────────────────────────────────
export default function LanguageInputPanel() {
  const { setDefinition, setTestInput, startAndRunAll, acceptanceMode, setAcceptanceMode } = usePDA();

  // ─── aⁿbᵐ state ────────────────────────────────────────────────────────
  const [exponents, setExponents] = useState<ExponentRow[]>([
    { symbol: 'a', variable: 'n', coefficient: 1 },
    { symbol: 'b', variable: 'n', coefficient: 1 },
  ]);
  const [conditions, setConditions] = useState<ConditionRow[]>([
    { variable: 'n', operator: '≥', value: 1 },
  ]);

  // ─── 0ⁿ1ⁿ state ─────────────────────────────────────────────────────────
  const [exponents0n1n, setExponents0n1n] = useState<ExponentRow[]>([
    { symbol: '0', variable: 'n', coefficient: 1 },
    { symbol: '1', variable: 'n', coefficient: 1 },
  ]);
  const [conditions0n1n, setConditions0n1n] = useState<ConditionRow[]>([
    { variable: 'n', operator: '≥', value: 1 },
  ]);

  // ─── PARENS state ────────────────────────────────────────────────────────
  // Each row: [open, close, minCount, maxCount('∞')]
  interface ParenRow {
    open: string;
    close: string;
    minCount: number;
    maxCount: string; // number or '∞'
  }

  const [parenRows, setParenRows] = useState<ParenRow[]>([
    { open: '(', close: ')', minCount: 1, maxCount: '∞' },
    { open: '[', close: ']', minCount: 0, maxCount: '∞' },
    { open: '{', close: '}', minCount: 0, maxCount: '∞' },
  ]);
  const [nestingStyle, setNestingStyle] = useState<'flat' | 'nested'>('flat');

  // ─── PALIN state ──────────────────────────────────────────────────────────
  const [palinAlphabet, setPalinAlphabet] = useState<string[]>(['a', 'b']);
  const [palinMinLen, setPalinMinLen] = useState<number>(1);
  const [palinType, setPalinType] = useState<'even' | 'odd' | 'both'>('both');

  // ─── shared error/success ─────────────────────────────────────────────────
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // ─── aⁿbᵐ helpers ────────────────────────────────────────────────────────
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

  // ─── 0ⁿ1ⁿ helpers ────────────────────────────────────────────────────────
  const addExponent0n1n = () => setExponents0n1n(prev => [...prev, { symbol: '', variable: '', coefficient: 1 }]);
  const removeExponent0n1n = (i: number) => setExponents0n1n(prev => prev.filter((_, idx) => idx !== i));
  const updateExponent0n1n = (i: number, field: keyof ExponentRow, value: string | number) => setExponents0n1n(prev => prev.map((e, idx) => (idx === i ? { ...e, [field]: value } : e)));

  const addCondition0n1n = () => setConditions0n1n(prev => [...prev, { variable: '', operator: '≥' as const, value: 1 }]);
  const removeCondition0n1n = (i: number) => setConditions0n1n(prev => prev.filter((_, idx) => idx !== i));
  const updateCondition0n1n = (i: number, field: keyof ConditionRow, value: string | number) => setConditions0n1n(prev => prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));

  // ─── PARENS helpers ───────────────────────────────────────────────────────
  const updateParenRow = (i: number, field: keyof ParenRow, val: string | number) =>
    setParenRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  const removeParenRow = (i: number) =>
    setParenRows(prev => prev.filter((_, idx) => idx !== i));

  const validParenPairs = parenRows
    .filter(r => r.open && r.close)
    .map(r => [r.open, r.close] as [string, string]);

  // Build preview language description for parens
  const parenLangDesc = (() => {
    const valid = parenRows.filter(r => r.open && r.close);
    if (valid.length === 0) return '';
    const pairs = valid.map(r => `${r.open}${r.close}`).join(', ');
    const constraints = valid
      .filter(r => r.minCount > 0 || r.maxCount !== '∞')
      .map(r => {
        const countStr = r.maxCount === '∞' ? `≥${r.minCount}` : r.minCount === Number(r.maxCount) ? `=${r.minCount}` : `${r.minCount}..${r.maxCount}`;
        return `|${r.open}..${r.close}| ${countStr}`;
      });
    return `L = { balanced ${pairs}${constraints.length ? ' | ' + constraints.join(', ') : ''} }`;
  })();

  // Compute minimum valid test string for parens
  const parenMinString = (() => {
    const valid = parenRows.filter(r => r.open && r.close && r.minCount > 0);
    const optional = parenRows.filter(r => r.open && r.close && r.minCount === 0);
    // Build required first, then add one of each optional
    let s = '';
    for (const r of valid) {
      if (nestingStyle === 'flat') {
        s += `${r.open}${r.close}`.repeat(r.minCount);
      } else {
        // nested: wrap inside
        let inner = '';
        for (let i = 0; i < r.minCount; i++) inner = `${r.open}${inner}${r.close}`;
        s += inner;
      }
    }
    // Append at least one of each optional pair if there are no required ones
    if (s === '' && optional.length > 0) {
      s = nestingStyle === 'flat'
        ? optional.map(r => `${r.open}${r.close}`).join('')
        : (() => {
            let nested = '';
            for (const r of optional) nested = `${r.open}${nested}${r.close}`;
            return nested;
          })();
    }
    return s;
  })();

  const parenUnbalancedExample = buildParensUnbalancedExample(validParenPairs);

  // ─── PALIN helpers ────────────────────────────────────────────────────────
  const updatePalin = (i: number, val: string) =>
    setPalinAlphabet(prev => prev.map((a, idx) => idx === i ? val : a));
  const removePalin = (i: number) =>
    setPalinAlphabet(prev => prev.filter((_, idx) => idx !== i));

  const validPalinAlpha = palinAlphabet.filter(a => a);
  const palinMinString = buildPalinMinString(validPalinAlpha, Math.max(1, palinMinLen));
  const palinNonExample = (() => {
    const a = validPalinAlpha;
    if (a.length < 2) return a[0] ? `${a[0]}${a[0]}x` : '';
    return `${a[0]}${a[1]}`;
  })();

  const palinLangDesc = (() => {
    if (validPalinAlpha.length === 0) return '';
    const typeStr = palinType === 'even' ? 'wwᴿ' : palinType === 'odd' ? 'wcwᴿ' : 'ww̃';
    return `L = { ${typeStr} | w ∈ {${validPalinAlpha.join(',')}}⁺${palinMinLen > 1 ? `, |w| ≥ ${palinMinLen}` : ''} }`;
  })();

  // ─── Shared flash helpers ─────────────────────────────────────────────────
  function flashSuccess() {
    setSuccess(true);
    setTimeout(() => setSuccess(false), 2000);
  }

  // ─── Generate handlers ─────────────────────────────────────────────────────

  const handleGenerate = useCallback(() => {
    setError(null);
    setSuccess(false);
    const validExponents = exponents.filter(e => e.symbol && e.variable);
    if (validExponents.length === 0) { setError('Add at least one symbol with an exponent variable'); return; }
    const spec = { exponents: validExponents, conditions: conditions.filter(c => c.variable) };
    const result = generatePDAFromLanguage(spec, acceptanceMode);
    if (typeof result === 'string') { setError(result); return; }
    setDefinition({ ...result, acceptanceMode });
    const minStr = generateSmallestString(spec);
    if (minStr) { setTestInput(minStr); startAndRunAll(minStr, { ...result, acceptanceMode }); }
    flashSuccess();
  }, [exponents, conditions, acceptanceMode, setDefinition, setTestInput, startAndRunAll]);

  const handle0n1nGenerate = useCallback(() => {
    setError(null);
    setSuccess(false);
    const validExponents = exponents0n1n.filter(e => e.symbol && e.variable);
    if (validExponents.length === 0) { setError('Add at least one symbol with an exponent variable'); return; }
    const spec = { exponents: validExponents, conditions: conditions0n1n.filter(c => c.variable) };
    const result = generatePDAFromLanguage(spec, acceptanceMode);
    if (typeof result === 'string') { setError(result); return; }
    setDefinition({ ...result, acceptanceMode });
    const minStr = generateSmallestString(spec);
    if (minStr) { setTestInput(minStr); startAndRunAll(minStr, { ...result, acceptanceMode }); }
    flashSuccess();
  }, [exponents0n1n, conditions0n1n, acceptanceMode, setDefinition, setTestInput, startAndRunAll]);

  const handleParensGenerate = useCallback(() => {
    setError(null);
    setSuccess(false);

    const valid = parenRows.filter(r => r.open && r.close);
    if (valid.length === 0) { setError('Add at least one bracket pair'); return; }

    const pairs = valid.map(r => [r.open, r.close] as [string, string]);
    const opens = pairs.map(p => p[0]);
    const closes = pairs.map(p => p[1]);

    if (new Set(opens).size !== opens.length) { setError('Each opening bracket must be unique'); return; }
    if (new Set(closes).size !== closes.length) { setError('Each closing bracket must be unique'); return; }
    const openSet = new Set(opens);
    for (const c of closes) {
      if (openSet.has(c)) { setError(`"${c}" used as both opening and closing bracket`); return; }
    }

    const result = generateParenthesisPDA(pairs, acceptanceMode);
    if (typeof result === 'string') { setError(result); return; }

    setDefinition(result);

    // Auto-test minimum string
    if (parenMinString) {
      setTestInput(parenMinString);
      startAndRunAll(parenMinString, result);
    }
    flashSuccess();
  }, [parenRows, nestingStyle, acceptanceMode, setDefinition, setTestInput, startAndRunAll, parenMinString]);

  const handlePalindromeGenerate = useCallback(() => {
    setError(null);
    setSuccess(false);

    if (validPalinAlpha.length === 0) { setError('Add at least one alphabet symbol'); return; }
    if (new Set(validPalinAlpha).size !== validPalinAlpha.length) { setError('Alphabet symbols must be unique'); return; }

    const result = generatePalindromePDA(validPalinAlpha, acceptanceMode);
    if (typeof result === 'string') { setError(result); return; }

    setDefinition(result);

    if (palinMinString) {
      setTestInput(palinMinString);
      startAndRunAll(palinMinString, result);
    }
    flashSuccess();
  }, [validPalinAlpha, acceptanceMode, setDefinition, setTestInput, startAndRunAll, palinMinString]);

  const preview = buildLanguageDescription(
    exponents.filter(e => e.symbol && e.variable),
    conditions
  );
  const preview0n1n = buildLanguageDescription(
    exponents0n1n.filter(e => e.symbol && e.variable),
    conditions0n1n
  );

  // ─── Shared Generate Button ────────────────────────────────────────────────
  const GenerateButton = ({ onClick }: { onClick: () => void }) => (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
    >
      <Play className="w-3.5 h-3.5" /> Generate PDA
    </button>
  );

  // ─── Render ────────────────────────────────────────────────────────────────
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

        {/* ── aⁿbᵐ TAB ── */}
        <TabsContent value="lang" className="mt-2 space-y-3">
          <div>
            <FieldLabel>Symbols &amp; Exponents</FieldLabel>
            <div className="space-y-1.5">
              {exponents.map((exp, i) => (
                <div key={i} className="flex items-center gap-1">
                  <input value={exp.symbol} onChange={e => updateExponent(i, 'symbol', e.target.value)}
                    onKeyDown={e => autoCloseBracket(e, val => updateExponent(i, 'symbol', val), exp.symbol)}
                    placeholder="a" className="w-10 h-7 text-xs text-center rounded border border-input bg-background text-foreground font-mono px-1" />
                  <span className="text-xs text-muted-foreground">^</span>
                  <input value={exp.coefficient > 1 ? exp.coefficient : ''} onChange={e => updateExponent(i, 'coefficient', parseInt(e.target.value) || 1)}
                    placeholder="1" className="w-8 h-7 text-xs text-center rounded border border-input bg-background text-foreground font-mono px-1" />
                  <input value={exp.variable} onChange={e => updateExponent(i, 'variable', e.target.value)}
                    placeholder="n" className="w-10 h-7 text-xs text-center rounded border border-input bg-background text-foreground font-mono px-1" />
                  <button onClick={() => removeExponent(i)} className="p-1 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
            <button onClick={addExponent} className="mt-1.5 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"><Plus className="w-3 h-3" /> Add Row</button>
          </div>

          <div>
            <FieldLabel>Conditions</FieldLabel>
            <div className="space-y-1.5">
              {conditions.map((cond, i) => (
                <div key={i} className="flex items-center gap-1">
                  <input value={cond.variable} onChange={e => updateCondition(i, 'variable', e.target.value)}
                    placeholder="n" className="w-10 h-7 text-xs text-center rounded border border-input bg-background text-foreground font-mono px-1" />
                  <select value={cond.operator} onChange={e => updateCondition(i, 'operator', e.target.value)}
                    className="w-10 h-7 text-xs text-center rounded border border-input bg-background text-foreground font-mono px-0">
                    {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
                  </select>
                  <input value={cond.value} onChange={e => updateCondition(i, 'value', parseInt(e.target.value) || 0)}
                    className="w-10 h-7 text-xs text-center rounded border border-input bg-background text-foreground font-mono px-1" />
                  <button onClick={() => removeCondition(i)} className="p-1 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
            <button onClick={addCondition} className="mt-1.5 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"><Plus className="w-3 h-3" /> Add Row</button>
          </div>

          {preview && (
            <div className="p-2 rounded bg-secondary border border-border">
              <span className="text-xs text-muted-foreground">Preview: </span>
              <span className="text-xs font-mono text-primary">{preview}</span>
            </div>
          )}

          <AcceptanceModeToggle mode={acceptanceMode} setMode={setAcceptanceMode} />
          <GenerateButton onClick={handleGenerate} />
        </TabsContent>

        {/* ── 0ⁿ1ⁿ TAB ── */}
        <TabsContent value="0n1n" className="mt-2 space-y-3">
          <div>
            <FieldLabel>Symbols &amp; Exponents</FieldLabel>
            <div className="space-y-1.5">
              {exponents0n1n.map((exp, i) => (
                <div key={i} className="flex items-center gap-1">
                  <input value={exp.symbol} onChange={e => updateExponent0n1n(i, 'symbol', e.target.value)}
                    onKeyDown={e => autoCloseBracket(e, val => updateExponent0n1n(i, 'symbol', val), exp.symbol)}
                    placeholder="0" className="w-10 h-7 text-xs text-center rounded border border-input bg-background text-foreground font-mono px-1" />
                  <span className="text-xs text-muted-foreground">^</span>
                  <input value={exp.coefficient > 1 ? exp.coefficient : ''} onChange={e => updateExponent0n1n(i, 'coefficient', parseInt(e.target.value) || 1)}
                    placeholder="1" className="w-8 h-7 text-xs text-center rounded border border-input bg-background text-foreground font-mono px-1" />
                  <input value={exp.variable} onChange={e => updateExponent0n1n(i, 'variable', e.target.value)}
                    placeholder="n" className="w-10 h-7 text-xs text-center rounded border border-input bg-background text-foreground font-mono px-1" />
                  <button onClick={() => removeExponent0n1n(i)} className="p-1 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
            <button onClick={addExponent0n1n} className="mt-1.5 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"><Plus className="w-3 h-3" /> Add Row</button>
          </div>

          <div>
            <FieldLabel>Conditions</FieldLabel>
            <div className="space-y-1.5">
              {conditions0n1n.map((cond, i) => (
                <div key={i} className="flex items-center gap-1">
                  <input value={cond.variable} onChange={e => updateCondition0n1n(i, 'variable', e.target.value)}
                    placeholder="n" className="w-10 h-7 text-xs text-center rounded border border-input bg-background text-foreground font-mono px-1" />
                  <select value={cond.operator} onChange={e => updateCondition0n1n(i, 'operator', e.target.value)}
                    className="w-10 h-7 text-xs text-center rounded border border-input bg-background text-foreground font-mono px-0">
                    {OPERATORS.map(op => <option key={op} value={op}>{op}</option>)}
                  </select>
                  <input value={cond.value} onChange={e => updateCondition0n1n(i, 'value', parseInt(e.target.value) || 0)}
                    className="w-10 h-7 text-xs text-center rounded border border-input bg-background text-foreground font-mono px-1" />
                  <button onClick={() => removeCondition0n1n(i)} className="p-1 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
            <button onClick={addCondition0n1n} className="mt-1.5 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"><Plus className="w-3 h-3" /> Add Row</button>
          </div>

          {preview0n1n && (
            <div className="p-2 rounded bg-secondary border border-border">
              <span className="text-xs text-muted-foreground">Preview: </span>
              <span className="text-xs font-mono text-primary">{preview0n1n}</span>
            </div>
          )}

          <AcceptanceModeToggle mode={acceptanceMode} setMode={setAcceptanceMode} />
          <GenerateButton onClick={handle0n1nGenerate} />
        </TabsContent>

        {/* ── PARENS TAB ── */}
        <TabsContent value="parens" className="mt-2 space-y-3">

          {/* Bracket Pair Builder */}
          <div>
            <FieldLabel>
              Bracket Pairs{' '}
              <span className="text-muted-foreground/60 font-normal">
                — open, close, min count
              </span>
            </FieldLabel>

            {/* Column headers */}
            <div className="grid grid-cols-[28px_28px_36px_32px_1fr_24px] gap-1 mb-1 px-0.5">
              <span className="text-[10px] text-muted-foreground/60 text-center">open</span>
              <span className="text-[10px] text-muted-foreground/60 text-center">close</span>
              <span className="text-[10px] text-muted-foreground/60 text-center">min</span>
              <span className="text-[10px] text-muted-foreground/60 text-center">max</span>
              <span />
              <span />
            </div>

            <div className="space-y-1.5">
              {parenRows.map((row, i) => (
                <div key={i} className="grid grid-cols-[28px_28px_36px_32px_1fr_24px] gap-1 items-center">
                  {/* Open bracket */}
                  <input
                    value={row.open}
                    onChange={e => updateParenRow(i, 'open', e.target.value.slice(-1))}
                    maxLength={1}
                    className="w-7 h-7 text-sm text-center rounded border border-input bg-background text-foreground font-mono"
                    placeholder="("
                  />
                  {/* Close bracket */}
                  <input
                    value={row.close}
                    onChange={e => updateParenRow(i, 'close', e.target.value.slice(-1))}
                    maxLength={1}
                    className="w-7 h-7 text-sm text-center rounded border border-input bg-background text-foreground font-mono"
                    placeholder=")"
                  />
                  {/* Min count */}
                  <input
                    type="number"
                    min={0}
                    value={row.minCount}
                    onChange={e => updateParenRow(i, 'minCount', parseInt(e.target.value) || 0)}
                    className="w-9 h-7 text-xs text-center rounded border border-input bg-background text-foreground font-mono px-1"
                    title="Minimum occurrences required"
                  />
                  {/* Max count */}
                  <input
                    value={row.maxCount}
                    onChange={e => {
                      const v = e.target.value;
                      updateParenRow(i, 'maxCount', v === '' ? '∞' : v);
                    }}
                    className="w-8 h-7 text-xs text-center rounded border border-input bg-background text-foreground font-mono px-1"
                    placeholder="∞"
                    title="Max occurrences (leave blank for unlimited)"
                  />
                  {/* Required badge */}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    row.minCount > 0
                      ? 'bg-primary/15 text-primary border border-primary/30'
                      : 'bg-secondary text-muted-foreground border border-border'
                  }`}>
                    {row.minCount > 0 ? `req×${row.minCount}` : 'optional'}
                  </span>
                  {/* Delete */}
                  <button onClick={() => removeParenRow(i)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => setParenRows(prev => [...prev, { open: '', close: '', minCount: 1, maxCount: '∞' }])}
              className="mt-1.5 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="w-3 h-3" /> Add Bracket Pair
            </button>
          </div>

          {/* Quick-add common pairs */}
          <div className="flex flex-wrap gap-1">
            {[['(', ')'], ['[', ']'], ['{', '}'], ['<', '>'], ['«', '»']].map(([o, c]) => {
              const exists = parenRows.some(r => r.open === o && r.close === c);
              if (exists) return null;
              return (
                <button
                  key={o}
                  onClick={() => setParenRows(prev => [...prev, { open: o, close: c, minCount: 1, maxCount: '∞' }])}
                  className="px-2 py-0.5 text-xs rounded border border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors font-mono"
                >
                  +{o}{c}
                </button>
              );
            })}
          </div>

          {/* Nesting style */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium shrink-0">Test string:</span>
            <div className="flex rounded overflow-hidden border border-border text-xs">
              <button
                type="button"
                onClick={() => setNestingStyle('flat')}
                className={`px-2.5 py-1 transition-colors ${nestingStyle === 'flat' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
              >
                flat ()[]
              </button>
              <button
                type="button"
                onClick={() => setNestingStyle('nested')}
                className={`px-2.5 py-1 transition-colors border-l border-border ${nestingStyle === 'nested' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
              >
                nested ([])
              </button>
            </div>
          </div>

          {/* Live preview */}
          {validParenPairs.length > 0 && (
            <div className="p-2 rounded bg-secondary border border-border space-y-1.5">
              {parenLangDesc && (
                <p className="text-xs text-muted-foreground font-mono truncate">{parenLangDesc}</p>
              )}
              <div className="flex gap-3 text-xs">
                {parenMinString && (
                  <span>
                    <span className="text-muted-foreground/70">✓ min: </span>
                    <span className="font-mono text-green-400">{parenMinString}</span>
                  </span>
                )}
                {parenUnbalancedExample && (
                  <span>
                    <span className="text-muted-foreground/70">✗ e.g.: </span>
                    <span className="font-mono text-red-400">{parenUnbalancedExample}</span>
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground/60">
                Min string auto-tested on Generate
              </p>
            </div>
          )}

          <AcceptanceModeToggle mode={acceptanceMode} setMode={setAcceptanceMode} />
          <GenerateButton onClick={handleParensGenerate} />
        </TabsContent>

        {/* ── PALINDROME TAB ── */}
        <TabsContent value="palindrome" className="mt-2 space-y-3">

          {/* Alphabet */}
          <div>
            <FieldLabel>
              Alphabet Symbols
              <span className="text-muted-foreground/60 font-normal ml-1">(one char each)</span>
            </FieldLabel>

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
                  <button onClick={() => removePalin(i)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>

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

          {/* Palindrome type */}
          <div>
            <FieldLabel>Palindrome Type</FieldLabel>
            <div className="flex rounded overflow-hidden border border-border text-xs">
              {([
                { val: 'both', label: 'Both' },
                { val: 'even', label: 'Even (wwᴿ)' },
                { val: 'odd',  label: 'Odd (wcwᴿ)' },
              ] as const).map(opt => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setPalinType(opt.val)}
                  className={`flex-1 px-2 py-1 transition-colors border-l first:border-l-0 border-border ${
                    palinType === opt.val
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Min length condition */}
          <div>
            <FieldLabel>Minimum Word Length |w| ≥</FieldLabel>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={palinMinLen}
                onChange={e => setPalinMinLen(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 h-7 text-xs text-center rounded border border-input bg-background text-foreground font-mono px-1"
              />
              <span className="text-xs text-muted-foreground">
                {palinMinLen === 1 ? '(any non-empty)' : `(at least ${palinMinLen} chars per half)`}
              </span>
            </div>
          </div>

          {/* Live preview */}
          {validPalinAlpha.length > 0 && (
            <div className="p-2 rounded bg-secondary border border-border space-y-1.5">
              <p className="text-xs text-muted-foreground font-mono">{palinLangDesc}</p>
              <div className="flex gap-3 text-xs">
                {palinMinString && (
                  <span>
                    <span className="text-muted-foreground/70">✓ min: </span>
                    <span className="font-mono text-green-400">{palinMinString}</span>
                  </span>
                )}
                {palinNonExample && (
                  <span>
                    <span className="text-muted-foreground/70">✗ e.g.: </span>
                    <span className="font-mono text-red-400">{palinNonExample}</span>
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground/60">
                Min string auto-tested on Generate
              </p>
            </div>
          )}

          <AcceptanceModeToggle mode={acceptanceMode} setMode={setAcceptanceMode} />
          <GenerateButton onClick={handlePalindromeGenerate} />
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
          <span className="text-xs text-[hsl(var(--success))]">✓ PDA generated — auto-testing minimum valid string</span>
        </div>
      )}
    </div>
  );
}