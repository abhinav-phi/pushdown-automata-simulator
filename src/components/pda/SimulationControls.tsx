import { usePDA } from '@/hooks/use-pda';
import { Play, SkipForward, SkipBack, FastForward, RotateCcw, Pause, Plus } from 'lucide-react';
import { useRef, useCallback, useEffect, useState } from 'react';

export default function SimulationControls() {
  const {
    testInput, setTestInput,
    startSimulation, nextStep, backStep, canGoBack,
    runAll, pauseRunAll, resetSimulation,
    isSimulating, isRunningAll, simulationSteps, currentStepIndex, simulationResult,
  } = usePDA();

  // Box-by-box input state
  const [boxes, setBoxes] = useState<string[]>(() => {
    const chars = testInput.split('');
    return chars.length > 0 ? chars : [''];
  });
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Sync boxes ← testInput when it changes externally (e.g. from generator)
  useEffect(() => {
    const chars = testInput.split('');
    const newBoxes = chars.length > 0 ? chars : [''];
    if (newBoxes.join('') !== boxes.filter(b => b).join('')) {
      setBoxes(newBoxes);
    }
  }, [testInput]);

  const syncTestInput = useCallback(
    (newBoxes: string[]) => {
      setBoxes(newBoxes);
      setTestInput(newBoxes.join(''));
    },
    [setTestInput]
  );

  const handleBoxChange = (index: number, value: string) => {
    if (value.length > 1) {
      const char = value.slice(-1);
      const newBoxes = [...boxes];
      newBoxes[index] = char;
      if (index === newBoxes.length - 1) newBoxes.push('');
      syncTestInput(newBoxes);
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

  const currentStep =
    isSimulating && currentStepIndex >= 0 ? simulationSteps[currentStepIndex] : null;

  const totalSteps = simulationSteps.length;
  const progress = totalSteps > 1 ? Math.round((currentStepIndex / (totalSteps - 1)) * 100) : 0;

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

      {/* Progress bar */}
      {isSimulating && totalSteps > 1 && (
        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex gap-1.5 flex-wrap">
        <button
          onClick={() => startSimulation(testInput)}
          disabled={isSimulating && !simulationResult}
          className="flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          <Play className="w-3.5 h-3.5" /> Start
        </button>

        {/* Back Step */}
        <button
          onClick={backStep}
          disabled={!isSimulating || isRunningAll || !canGoBack}
          title="Go back one step (undo)"
          className="flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors"
        >
          <SkipBack className="w-3.5 h-3.5" /> Back
        </button>

        {/* Next Step */}
        <button
          onClick={nextStep}
          disabled={!isSimulating || isRunningAll || !!simulationResult}
          className="flex items-center gap-1 px-3 py-1.5 text-xs rounded bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 transition-colors"
        >
          <SkipForward className="w-3.5 h-3.5" /> Next
        </button>

        {/* Run All / Pause */}
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

      {/* Step counter */}
      {isSimulating && (
        <div className="text-xs text-muted-foreground font-mono">
          Step {currentStepIndex + 1} / {totalSteps}
          {canGoBack && (
            <span className="ml-2 text-primary/70">• undo available</span>
          )}
        </div>
      )}

      {/* Current Step Info */}
      {currentStep && (
        <div className="bg-secondary/50 rounded p-2.5 text-xs font-mono space-y-1 border border-border">
          <div className="flex gap-3 flex-wrap">
            <span className="text-muted-foreground">Step {currentStep.stepNumber}</span>
            <span>
              State: <span className="text-primary">{currentStep.currentState}</span>
            </span>
            <span>
              Input: <span className="text-accent">{currentStep.remainingInput || 'ε'}</span>
            </span>
          </div>
          {currentStep.transitionApplied && (
            <div className="text-muted-foreground text-[10px]">
              δ({currentStep.transitionApplied.currentState},{' '}
              {currentStep.transitionApplied.inputSymbol},{' '}
              {currentStep.transitionApplied.stackTop}) = ({currentStep.transitionApplied.nextState},{' '}
              {currentStep.transitionApplied.stackOperation})
            </div>
          )}
          {currentStep.stackOperation !== 'NO_OP' && (
            <div
              className={
                currentStep.stackOperation === 'PUSH'
                  ? 'text-success'
                  : currentStep.stackOperation === 'POP'
                  ? 'text-destructive'
                  : 'text-muted-foreground'
              }
            >
              {currentStep.stackOperation} {currentStep.stackSymbol}
            </div>
          )}
        </div>
      )}

      {/* Result */}
      {simulationResult && (
        <div
          className={`rounded p-2.5 text-xs font-semibold border ${
            simulationResult.accepted
              ? 'bg-success/10 text-success border-success/30'
              : 'bg-destructive/10 text-destructive border-destructive/30'
          }`}
        >
          {simulationResult.accepted ? '✓ ACCEPTED' : '✗ REJECTED'} —{' '}
          {simulationResult.reason}
        </div>
      )}
    </div>
  );
}