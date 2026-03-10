import React, { useState } from 'react';
import { PDADefinition } from '@/lib/pda-types';
import { simulatePDA } from '@/lib/pda-engine';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Play } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
  definition: PDADefinition;
}

interface TestResult {
  input: string;
  accepted: boolean;
  reason: string;
}

export default function InputTestingPanel({ definition }: Props) {
  const [testInput, setTestInput] = useState('');
  const [results, setResults] = useState<TestResult[]>([]);

  const runTest = () => {
    if (!testInput && testInput !== '') return;
    const result = simulatePDA(definition, testInput);
    setResults(prev => [...prev, { input: testInput || '(empty)', accepted: result.accepted, reason: result.reason }]);
    setTestInput('');
  };

  const runBatch = (strings: string[]) => {
    const newResults = strings.map(s => {
      const r = simulatePDA(definition, s);
      return { input: s || '(empty)', accepted: r.accepted, reason: r.reason };
    });
    setResults(prev => [...prev, ...newResults]);
  };

  return (
    <div className="panel-card">
      <h2 className="panel-title">Input Testing</h2>
      <div className="flex gap-2 mb-3">
        <Input
          placeholder="Enter string to test"
          value={testInput}
          onChange={e => setTestInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && runTest()}
          className="h-8 text-sm font-mono"
        />
        <Button size="sm" variant="outline" onClick={runTest} className="h-8 px-3">
          <Play className="h-3.5 w-3.5" />
        </Button>
      </div>
      
      {results.length > 0 && (
        <ScrollArea className="h-40">
          <div className="space-y-1">
            {results.map((r, i) => (
              <div key={i} className="flex items-center justify-between px-2 py-1.5 rounded text-xs font-mono" style={{ background: 'hsl(var(--log-step))' }}>
                <span className="text-foreground">{r.input}</span>
                <span className={r.accepted ? 'sim-badge sim-badge-accepted' : 'sim-badge sim-badge-rejected'}>
                  {r.accepted ? 'Accepted' : 'Rejected'}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
      
      {results.length > 0 && (
        <Button size="sm" variant="ghost" onClick={() => setResults([])} className="mt-2 h-6 text-[10px] text-muted-foreground">
          Clear results
        </Button>
      )}
    </div>
  );
}
