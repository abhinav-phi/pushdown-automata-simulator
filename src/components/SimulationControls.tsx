import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, SkipForward, FastForward, RotateCcw } from 'lucide-react';

interface Props {
  inputString: string;
  onInputChange: (v: string) => void;
  onStart: () => void;
  onStep: () => void;
  onRunAuto: () => void;
  onReset: () => void;
  isRunning: boolean;
  isFinished: boolean;
  currentState: string;
  remainingInput: string;
}

export default function SimulationControls({
  inputString, onInputChange, onStart, onStep, onRunAuto, onReset,
  isRunning, isFinished, currentState, remainingInput,
}: Props) {
  return (
    <div className="panel-card">
      <h2 className="panel-title">Simulation</h2>
      
      <div className="flex gap-2 mb-3">
        <Input
          placeholder="Input string (e.g. aabb)"
          value={inputString}
          onChange={e => onInputChange(e.target.value)}
          disabled={isRunning}
          className="h-9 text-sm font-mono"
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button size="sm" onClick={onStart} disabled={isRunning} className="h-8 text-xs gap-1.5">
          <Play className="h-3.5 w-3.5" /> Start
        </Button>
        <Button size="sm" variant="outline" onClick={onStep} disabled={!isRunning || isFinished} className="h-8 text-xs gap-1.5">
          <SkipForward className="h-3.5 w-3.5" /> Step
        </Button>
        <Button size="sm" variant="outline" onClick={onRunAuto} disabled={!isRunning || isFinished} className="h-8 text-xs gap-1.5">
          <FastForward className="h-3.5 w-3.5" /> Run All
        </Button>
        <Button size="sm" variant="secondary" onClick={onReset} className="h-8 text-xs gap-1.5">
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </Button>
      </div>

      {isRunning && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg p-2" style={{ background: 'hsl(var(--log-step))' }}>
            <span className="text-muted-foreground">State: </span>
            <span className="font-mono font-semibold text-primary">{currentState}</span>
          </div>
          <div className="rounded-lg p-2" style={{ background: 'hsl(var(--log-step))' }}>
            <span className="text-muted-foreground">Input: </span>
            <span className="font-mono font-semibold">{remainingInput || 'ε'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
