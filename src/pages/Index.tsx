import React, { useState, useRef, useCallback } from 'react';
import { PDADefinition, SimulationStep, SimulationResult, EPSILON } from '@/lib/pda-types';
import { simulatePDA, validatePDA, simulateStepByStep } from '@/lib/pda-engine';
import { predefinedExamples } from '@/lib/pda-examples';
import PDADefinitionPanel from '@/components/PDADefinitionPanel';
import StackVisualization from '@/components/StackVisualization';
import StateDiagram from '@/components/StateDiagram';
import SimulationControls from '@/components/SimulationControls';
import ExecutionLog from '@/components/ExecutionLog';
import InputTestingPanel from '@/components/InputTestingPanel';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { BookOpen } from 'lucide-react';

const emptyDefinition: PDADefinition = {
  states: [],
  inputAlphabet: [],
  stackAlphabet: [],
  initialState: '',
  initialStackSymbol: 'Z',
  acceptStates: [],
  transitions: [],
  acceptanceMode: 'finalState',
};

export default function Index() {
  const [definition, setDefinition] = useState<PDADefinition>({ ...emptyDefinition });
  const [inputString, setInputString] = useState('');

  // Simulation state
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [steps, setSteps] = useState<SimulationStep[]>([]);
  const [currentStack, setCurrentStack] = useState<string[]>([]);
  const [currentState, setCurrentState] = useState<string | null>(null);
  const [remainingInput, setRemainingInput] = useState('');
  const [simResult, setSimResult] = useState<{ accepted: boolean; reason: string } | null>(null);

  const generatorRef = useRef<Generator<SimulationStep, SimulationResult, void> | null>(null);

  const loadExample = (name: string) => {
    const ex = predefinedExamples.find(e => e.name === name);
    if (ex) {
      setDefinition({ ...ex.definition });
      setInputString(ex.testStrings[0] || '');
      handleReset();
      toast.success(`Loaded: ${ex.name}`);
    }
  };

  const handleStart = useCallback(() => {
    const errors = validatePDA(definition);
    if (errors.length > 0) {
      errors.forEach(e => toast.error(e));
      return;
    }

    const gen = simulateStepByStep(definition, inputString);
    generatorRef.current = gen;

    // Get initial step
    const first = gen.next();
    if (!first.done) {
      const step = first.value as SimulationStep;
      setSteps([step]);
      setCurrentStack(step.stackContents);
      setCurrentState(step.currentState);
      setRemainingInput(step.remainingInput);
    }

    setIsRunning(true);
    setIsFinished(false);
    setSimResult(null);
  }, [definition, inputString]);

  const handleStep = useCallback(() => {
    if (!generatorRef.current) return;

    const next = generatorRef.current.next();
    if (next.done) {
      const result = next.value as SimulationResult | undefined;
      if (result) {
        setSimResult({ accepted: result.accepted, reason: result.reason });
      }
      setIsFinished(true);
    } else {
      const step = next.value as SimulationStep;
      setSteps(prev => [...prev, step]);
      setCurrentStack(step.stackContents);
      setCurrentState(step.currentState);
      setRemainingInput(step.remainingInput);
    }
  }, []);

  const handleRunAuto = useCallback(() => {
    if (!generatorRef.current) return;

    const allSteps: SimulationStep[] = [];

    while (true) {
      const next = generatorRef.current.next();
      if (next.done) {
        const result = next.value as SimulationResult | undefined;
        if (result) {
          setSimResult({ accepted: result.accepted, reason: result.reason });
        }
        setIsFinished(true);
        break;
      } else {
        const step = next.value as SimulationStep;
        allSteps.push(step);
      }
    }

    if (allSteps.length > 0) {
      setSteps(prev => [...prev, ...allSteps]);
      const last = allSteps[allSteps.length - 1];
      setCurrentStack(last.stackContents);
      setCurrentState(last.currentState);
      setRemainingInput(last.remainingInput);
    }
  }, []);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setIsFinished(false);
    setSteps([]);
    setCurrentStack([]);
    setCurrentState(null);
    setRemainingInput('');
    setSimResult(null);
    generatorRef.current = null;
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
<img src="/pda.png" alt="PDA Simulator" className="w-8 h-8 rounded-lg object-cover" />
            <div>
              <h1 className="text-base font-bold tracking-tight text-foreground">PDA Simulator</h1>
              <p className="text-[10px] text-muted-foreground">Pushdown Automata — Interactive Learning Tool</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Load example:</span>
            <Select onValueChange={loadExample}>
              <SelectTrigger className="h-8 w-48 text-xs">
                <SelectValue placeholder="Choose preset..." />
              </SelectTrigger>
              <SelectContent>
                {predefinedExamples.map(ex => (
                  <SelectItem key={ex.name} value={ex.name}>
                    {ex.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

{/* Main Layout */}
<main className="container mx-auto px-4 py-4">
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

    {/* LEFT: PDA Definition only */}
    <div className="lg:col-span-4 space-y-4">
      <PDADefinitionPanel definition={definition} onChange={setDefinition} />
    </div>

    {/* CENTER: State Diagram only */}
    <div className="lg:col-span-4 h-full">
      <StateDiagram definition={definition} currentState={currentState} />
    </div>

    {/* RIGHT: Stack + Simulation + Execution Log + Input Testing */}
    <div className="lg:col-span-4 space-y-4">
      <StackVisualization stack={currentStack} />
      <SimulationControls
        inputString={inputString}
        onInputChange={setInputString}
        onStart={handleStart}
        onStep={handleStep}
        onRunAuto={handleRunAuto}
        onReset={handleReset}
        isRunning={isRunning}
        isFinished={isFinished}
        currentState={currentState || '—'}
        remainingInput={remainingInput}
      />
      <ExecutionLog steps={steps} result={simResult} />
      <InputTestingPanel definition={definition} />
    </div>

  </div>
</main>
</div>
  );
}