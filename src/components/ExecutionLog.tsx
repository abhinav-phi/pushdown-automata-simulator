import React from 'react';
import { SimulationStep } from '@/lib/pda-types';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
  steps: SimulationStep[];
  result: { accepted: boolean; reason: string } | null;
}

export default function ExecutionLog({ steps, result }: Props) {
  return (
    <div className="panel-card">
      <h2 className="panel-title">Execution Log</h2>
      <ScrollArea className="h-52">
        <div className="space-y-1">
          {steps.map((step) => (
            <div key={step.stepNumber} className="log-row">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Step {step.stepNumber}</span>
                <span className="text-primary font-semibold">{step.currentState}</span>
              </div>
              <div className="flex justify-between mt-0.5">
                <span>Input: <span className="text-foreground">{step.remainingInput || 'ε'}</span></span>
                <span>Stack: <span className="text-foreground">[{step.stackContents.join(', ')}]</span></span>
              </div>
              {step.transitionApplied && (
                <div className="text-muted-foreground mt-0.5">
                  δ({step.transitionApplied.currentState}, {step.transitionApplied.inputSymbol}, {step.transitionApplied.stackTop}) → ({step.transitionApplied.nextState}, {step.transitionApplied.stackOperation}) — {step.stackOperation}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
      {result && (
        <div className={`mt-3 p-2 rounded-lg text-center text-sm font-semibold ${result.accepted ? 'sim-badge-accepted' : 'sim-badge-rejected'}`}>
          {result.accepted ? '✓ ACCEPTED' : '✗ REJECTED'} — {result.reason}
        </div>
      )}
    </div>
  );
}
