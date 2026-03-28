import { usePDA } from '@/hooks/use-pda';
import { useState } from 'react';
import { Play, Trash2 } from 'lucide-react';
import { SimulationResult } from '@/lib/pda-types';

interface TestRow {
  input: string;
  result: SimulationResult | null;
}

export default function InputTestingPanel() {
  const { quickTest } = usePDA();
  const [rows, setRows] = useState<TestRow[]>([
    { input: '', result: null },
  ]);

  const updateInput = (i: number, val: string) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, input: val, result: null } : r));
  };

  const runTest = (i: number) => {
    const row = rows[i];
    if (!row.input) return;
    const result = quickTest(row.input);
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, result } : r));
  };

  const addRow = () => setRows(prev => [...prev, { input: '', result: null }]);

  const clearResults = () => setRows(prev => prev.map(r => ({ ...r, result: null })));

  return (
    <div className="panel">
      <div className="flex items-center justify-between">
        <h2 className="panel-title mb-0">Quick Test</h2>
        <div className="flex gap-1.5">
          <button onClick={addRow} className="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
            + Add Row
          </button>
          <button onClick={clearResults} className="text-xs px-2 py-1 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
            Clear Results
          </button>
        </div>
      </div>

      <div className="space-y-1.5 mt-3">
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={row.input}
              onChange={e => updateInput(i, e.target.value)}
              onKeyDown={e => e.key === 'Enter' && runTest(i)}
              placeholder="test string..."
              className="flex-1 px-2.5 py-1.5 text-xs font-mono rounded bg-secondary border border-border text-foreground"
            />
            <button
              onClick={() => runTest(i)}
              className="p-1.5 rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Play className="w-3 h-3" />
            </button>
            {row.result && (
              <span className={`text-xs font-semibold whitespace-nowrap ${
                row.result.accepted ? 'text-success' : 'text-destructive'
              }`}>
                {row.result.accepted ? '✓ Accepted' : '✗ Rejected'}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
