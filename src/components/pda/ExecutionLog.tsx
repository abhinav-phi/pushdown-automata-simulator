import { usePDA } from '@/hooks/use-pda';
import { useRef, useEffect } from 'react';

export default function ExecutionLog() {
  const { simulationSteps, currentStepIndex, simulationResult, isSimulating } = usePDA();
  const scrollRef = useRef<HTMLDivElement>(null);

  const visibleSteps = isSimulating ? simulationSteps.slice(0, currentStepIndex + 1) : [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [currentStepIndex]);

  return (
    <div className="panel flex flex-col">
      <h2 className="panel-title">Execution Log</h2>
      <div ref={scrollRef} className="flex-1 overflow-auto max-h-48 space-y-0.5">
        {visibleSteps.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Run a simulation to see execution log</p>
        ) : (
          visibleSteps.map((step, i) => (
            <div
              key={i}
              className={`text-[11px] font-mono px-2 py-1 rounded ${
                i === visibleSteps.length - 1 && simulationResult
                  ? simulationResult.accepted ? 'bg-success/10' : 'bg-destructive/10'
                  : 'hover:bg-secondary/30'
              }`}
            >
              <span className="text-muted-foreground">Step {step.stepNumber}</span>
              {' → '}
              <span className="text-primary">{step.currentState}</span>
              {' | Input: '}
              <span className="text-accent">{step.remainingInput || 'ε'}</span>
              {' | Stack: ['}
              <span>{[...step.stackContents].reverse().join(',')}</span>
              {'] '}
              <span className={
                step.stackOperation === 'PUSH' ? 'text-success' :
                step.stackOperation === 'POP' ? 'text-destructive' :
                'text-muted-foreground'
              }>
                {step.stepNumber === 0 ? 'Initial' : step.stackOperation === 'PUSH' ? `PUSH ${step.stackSymbol}` : step.stackOperation === 'POP' ? `POP ${step.stackSymbol}` : step.stackOperation === 'EPSILON' ? 'ε-move' : ''}
              </span>
            </div>
          ))
        )}

        {simulationResult && (
          <div className={`text-xs font-semibold mt-2 px-2 py-1.5 rounded border ${
            simulationResult.accepted
              ? 'text-success bg-success/10 border-success/30'
              : 'text-destructive bg-destructive/10 border-destructive/30'
          }`}>
            {simulationResult.accepted ? '✓ ACCEPTED' : '✗ REJECTED'} — {simulationResult.reason}
          </div>
        )}
      </div>
    </div>
  );
}
