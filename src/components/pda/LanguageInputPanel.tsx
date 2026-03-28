import { useState, useCallback, useRef, KeyboardEvent } from 'react';
import { usePDA } from '@/hooks/use-pda';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Plus, Trash2, Sparkles, AlertTriangle } from 'lucide-react';
import {
  ExponentRow,
  ConditionRow,
  generatePDAFromLanguage,
  generateSmallestString,
  buildLanguageDescription,
  parseLanguageString,
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
// function autoCloseBracket(
//   e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>
// ) {
//   const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
//   const close = pairs[e.key];
//   if (!close) return;
//   e.preventDefault();
//   const el = e.currentTarget;
//   const start = el.selectionStart ?? 0;
//   const end = el.selectionEnd ?? 0;
//   const val = el.value;
//   const newVal = val.slice(0, start) + e.key + close + val.slice(end);
//   // Use native setter to trigger React's onChange
//   const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
//     window.HTMLInputElement.prototype,
//     'value'
//   )?.set || Object.getOwnPropertyDescriptor(
//     window.HTMLTextAreaElement.prototype,
//     'value'
//   )?.set;
//   nativeInputValueSetter?.call(el, newVal);
//   el.dispatchEvent(new Event('input', { bubbles: true }));
//   requestAnimationFrame(() => {
//     el.setSelectionRange(start + 1, start + 1);
//   });
// }

export default function LanguageInputPanel() {
  const { setDefinition, setTestInput, startAndRunAll } = usePDA();

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

  const addExponent = () => {
    setExponents(prev => [...prev, { symbol: '', variable: '', coefficient: 1 }]);
  };

  const removeExponent = (i: number) => {
    setExponents(prev => prev.filter((_, idx) => idx !== i));
  };

  const updateExponent = (i: number, field: keyof ExponentRow, value: string | number) => {
    setExponents(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e));
  };

  const addCondition = () => {
    setConditions(prev => [...prev, { variable: '', operator: '≥' as const, value: 1 }]);
  };

  const removeCondition = (i: number) => {
    setConditions(prev => prev.filter((_, idx) => idx !== i));
  };

  const updateCondition = (i: number, field: keyof ConditionRow, value: string | number) => {
    setConditions(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c));
  };

  const preview = buildLanguageDescription(exponents.filter(e => e.symbol && e.variable), conditions);

  const handleGenerate = useCallback(() => {
    setError(null);
    setSuccess(false);

    const validExponents = exponents.filter(e => e.symbol && e.variable);
    if (validExponents.length === 0) {
      setError('Add at least one symbol with an exponent variable');
      return;
    }

    const result = generatePDAFromLanguage({
      exponents: validExponents,
      conditions: conditions.filter(c => c.variable),
    });

    if (typeof result === 'string') {
      setError(result);
    } else {
      setDefinition(result);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      const spec = { exponents: validExponents, conditions: conditions.filter(c => c.variable) };
      const smallest = generateSmallestString(spec);
      if (smallest) {
        setTestInput(smallest);
        startAndRunAll(smallest, result);
      }
    }
  }, [exponents, conditions, setDefinition, setTestInput, startAndRunAll]);

  const handleRegexGenerate = useCallback(() => {
    setError(null);
    setSuccess(false);

    const parsed = parseLanguageString(regexInput);
    if (typeof parsed === 'string') {
      setError(parsed);
      return;
    }

    const result = generatePDAFromLanguage(parsed);
    if (typeof result === 'string') {
      setError(result);
    } else {
      setDefinition(result);
      setExponents(parsed.exponents);
      setConditions(parsed.conditions);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      const smallest = generateSmallestString(parsed);
      if (smallest) {
        setTestInput(smallest);
        startAndRunAll(smallest, result);
      }
    }
  }, [regexInput, setDefinition, setTestInput, startAndRunAll]);

  return (
    <div className="panel">
      <div className="panel-title">Language Input</div>

      <Tabs defaultValue="lang" className="w-full">
        <TabsList className="w-full grid grid-cols-2 h-8">
          <TabsTrigger value="lang" className="text-xs">LANG</TabsTrigger>
          <TabsTrigger value="regex" className="text-xs">REGEX</TabsTrigger>
        </TabsList>

        <TabsContent value="lang" className="mt-2 space-y-3">
          {/* Exponents */}
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">
              Symbols & Exponents
            </label>
            <div className="space-y-1.5">
              {exponents.map((exp, i) => (
                <div key={i} className="flex items-center gap-1">
                  <input
                    value={exp.symbol}
                    onChange={e => updateExponent(i, 'symbol', e.target.value)}
                    // onKeyDown={autoCloseBracket}
                    onKeyDown={e => autoCloseBracket(e, (val) => updateExponent(i, 'symbol', val), exp.symbol)}
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

          {/* Conditions */}
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

          {/* Preview */}
          {preview && (
            <div className="p-2 rounded bg-secondary border border-border">
              <span className="text-xs text-muted-foreground">Preview: </span>
              <span className="text-xs font-mono text-primary">{preview}</span>
            </div>
          )}

          <button
            onClick={handleGenerate}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" /> Generate PDA
          </button>
        </TabsContent>

        <TabsContent value="regex" className="mt-2 space-y-3">
          <div>
            <label className="text-xs text-muted-foreground font-medium mb-1 block">
              Language Pattern
            </label>
            <textarea
              value={regexInput}
              onChange={e => setRegexInput(e.target.value)}
              // onKeyDown={autoCloseBracket as any}
              onKeyDown={e => autoCloseBracket(e, setRegexInput, regexInput)}
              placeholder="e.g. a^n b^{2n} or aⁿb²ⁿ"
              className="w-full h-16 text-xs rounded border border-input bg-background text-foreground font-mono p-2 resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <button
            onClick={handleRegexGenerate}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" /> Generate PDA
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
