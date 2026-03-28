import { usePDA } from '@/hooks/use-pda';
import { Play, SkipForward, FastForward, RotateCcw, Pause, Plus } from 'lucide-react';
import { useRef, useCallback, useEffect, useState } from 'react';

export default function SimulationControls() {
  const {
    testInput, setTestInput,
    startSimulation, nextStep, runAll, pauseRunAll, resetSimulation,
    isSimulating, isRunningAll, simulationSteps, currentStepIndex, simulationResult,
  } = usePDA();

  // Box-by-box state derived from testInput
  const [boxes, setBoxes] = useState<string[]>(() => {
    const chars = testInput.split('');
    return chars.length > 0 ? chars : [''];
  });
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Sync boxes FROM testInput when it changes externally
  useEffect(() => {
    const chars = testInput.split('');
    const newBoxes = chars.length > 0 ? chars : [''];
    // Only update if actually different to avoid loops
    if (newBoxes.join('') !== boxes.filter(b => b).join('')) {
      setBoxes(newBoxes);
    }
  }, [testInput]);

  // Sync testInput FROM boxes when boxes change
  const syncTestInput = useCallback((newBoxes: string[]) => {
    setBoxes(newBoxes);
    setTestInput(newBoxes.join(''));
  }, [setTestInput]);

  const handleBoxChange = (index: number, value: string) => {
    if (value.length > 1) {
      // User typed a character - put it in current box and move to next
      const char = value.slice(-1);
      const newBoxes = [...boxes];
      newBoxes[index] = char;
      // Auto-create next box if at the end
      if (index === newBoxes.length - 1) {
        newBoxes.push('');
      }
      syncTestInput(newBoxes);
      // Focus next box
      setTimeout(() => inputRefs.current[index + 1]?.focus(), 0);
      return;
    }
    const newBoxes = [...boxes];
    newBoxes[index] = value;
    syncTestInput(newBoxes);
    if (value && index === boxes.length - 1) {
      const extended = [...newBoxes, ''];
      syncTestInput(extended);
      setTimeout(() => inputRefs.current[index + 1]?.focus(), 0);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !boxes[index] && boxes.length > 1) {
      e.preventDefault();
      const newBoxes = boxes.filter((_, i) => i !== index);
      syncTestInput(newBoxes);
      setTimeout(() => inputRefs.current[Math.max(0, index - 1)]?.focus(), 0);
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < boxes.length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const addBox = () => {
    const newBoxes = [...boxes, ''];
    syncTestInput(newBoxes);
    setTimeout(() => inputRefs.current[newBoxes.length - 1]?.focus(), 0);
  };

  const currentStep = isSimulating && currentStepIndex >= 0
    ? simulationSteps[currentStepIndex]
    : null;

  return (
    <div className="panel space-y-3">
      <h2 className="panel-title">Simulation Controls</h2>

      {/* Box-by-box Input */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {boxes.map((box, i) => (
          <input
            key={i}
            ref={el => { inputRefs.current[i] = el; }}
            value={box}
            onChange={e => handleBoxChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            className="w-9 h-9 text-center text-sm font-mono rounded bg-secondary border border-border text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
            maxLength={2}
          />
        ))}
        <button
          onClick={addBox}
          className="w-9 h-9 flex items-center justify-center rounded bg-secondary border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Buttons */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => startSimulation(testInput)}
          disabled={isSimulating}
          className="flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Play className="w-3.5 h-3.5" /> Start
        </button>
        <button
          onClick={nextStep}
          disabled={!isSimulating || isRunningAll || !!simulationResult}
          className="flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors"
        >
          <SkipForward className="w-3.5 h-3.5" /> Next Step
        </button>
        {isRunningAll ? (
          <button
            onClick={pauseRunAll}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-accent text-accent-foreground hover:bg-accent/90 transition-colors"
          >
            <Pause className="w-3.5 h-3.5" /> Pause
          </button>
        ) : (
          <button
            onClick={runAll}
            disabled={!isSimulating || !!simulationResult}
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors"
          >
            <FastForward className="w-3.5 h-3.5" /> Run All
          </button>
        )}
        <button
          onClick={resetSimulation}
          className="flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>

      {/* Step info */}
      {currentStep && (
        <div className="bg-secondary/50 rounded p-2.5 text-xs font-mono space-y-1 border border-border">
          <div className="flex gap-3">
            <span className="text-muted-foreground">Step {currentStep.stepNumber}</span>
            <span>State: <span className="text-primary">{currentStep.currentState}</span></span>
            <span>Input: <span className="text-accent">{currentStep.remainingInput || 'ε'}</span></span>
          </div>
          {currentStep.transitionApplied && (
            <div className="text-muted-foreground">
              Applied: δ({currentStep.transitionApplied.currentState}, {currentStep.transitionApplied.inputSymbol}, {currentStep.transitionApplied.stackTop}) = ({currentStep.transitionApplied.nextState}, {currentStep.transitionApplied.stackOperation})
            </div>
          )}
          {currentStep.stackOperation !== 'NO_OP' && (
            <div className={currentStep.stackOperation === 'PUSH' ? 'text-success' : currentStep.stackOperation === 'POP' ? 'text-destructive' : 'text-muted-foreground'}>
              Operation: {currentStep.stackOperation} {currentStep.stackSymbol}
            </div>
          )}
        </div>
      )}

      {/* Result */}
      {simulationResult && (
        <div className={`rounded p-2.5 text-xs font-semibold border ${
          simulationResult.accepted
            ? 'bg-success/10 text-success border-success/30'
            : 'bg-destructive/10 text-destructive border-destructive/30'
        }`}>
          {simulationResult.accepted ? '✓ ACCEPTED' : '✗ REJECTED'} — {simulationResult.reason}
        </div>
      )}
    </div>
  );
}
