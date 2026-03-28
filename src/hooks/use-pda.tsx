import { useState, useCallback, createContext, useContext, useEffect, useRef } from 'react';
import { PDADefinition, SimulationStep, SimulationResult, HistoryEntry } from '@/lib/pda-types';
import { presets } from '@/lib/pda-presets';
import { simulatePDA, simulateStepByStep } from '@/lib/pda-engine';

interface PDAContextType {
  definition: PDADefinition;
  setDefinition: React.Dispatch<React.SetStateAction<PDADefinition>>;
  // Simulation
  simulationSteps: SimulationStep[];
  currentStepIndex: number;
  simulationResult: SimulationResult | null;
  isSimulating: boolean;
  isRunningAll: boolean;
  startSimulation: (input: string) => void;
  startAndRunAll: (input: string, defOverride?: PDADefinition) => void;
  nextStep: () => void;
  runAll: () => void;
  pauseRunAll: () => void;
  resetSimulation: () => void;
  testInput: string;
  setTestInput: (s: string) => void;
  // History
  history: HistoryEntry[];
  addHistory: (entry: HistoryEntry) => void;
  clearHistory: () => void;
  // Quick test
  quickTest: (input: string) => SimulationResult;
  // Preset
  loadPreset: (index: number) => void;
  currentPresetIndex: number;
  // Theme
  isDark: boolean;
  toggleTheme: () => void;
}

const PDAContext = createContext<PDAContextType | null>(null);

export function usePDA() {
  const ctx = useContext(PDAContext);
  if (!ctx) throw new Error('usePDA must be used within PDAProvider');
  return ctx;
}

export function PDAProvider({ children }: { children: React.ReactNode }) {
  const [definition, setDefinition] = useState<PDADefinition>(() => {
    // Try loading saved custom
    const saved = localStorage.getItem('pda-custom');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return { ...presets[0].definition, transitions: [...presets[0].definition.transitions] };
  });

  const [currentPresetIndex, setCurrentPresetIndex] = useState(0);
  const [simulationSteps, setSimulationSteps] = useState<SimulationStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [testInput, setTestInput] = useState('aabb');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pda-theme') !== 'light';
    }
    return true;
  });

  const runAllRef = useRef(false);
  const allStepsRef = useRef<SimulationStep[]>([]);
  const stepIdxRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('pda-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = useCallback(() => setIsDark(p => !p), []);

  const loadPreset = useCallback((index: number) => {
    const preset = presets[index];
    if (!preset) return;
    setDefinition({ ...preset.definition, transitions: [...preset.definition.transitions] });
    setCurrentPresetIndex(index);
    resetSimulationState();
  }, []);

  const resetSimulationState = () => {
    setSimulationSteps([]);
    setCurrentStepIndex(-1);
    setSimulationResult(null);
    setIsSimulating(false);
    setIsRunningAll(false);
    runAllRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const startSimulation = useCallback((input: string) => {
    resetSimulationState();
    const result = simulatePDA(definition, input);
    allStepsRef.current = result.steps;
    setSimulationSteps([result.steps[0]]);
    setCurrentStepIndex(0);
    stepIdxRef.current = 0;
    setSimulationResult(null);
    setIsSimulating(true);

    if (result.steps.length <= 1) {
      setSimulationResult(result);
      addHistory({ input, accepted: result.accepted, steps: result.steps.length });
    }
  }, [definition]);

  const startAndRunAll = useCallback((input: string, defOverride?: PDADefinition) => {
    const def = defOverride || definition;
    resetSimulationState();
    setTestInput(input);
    const result = simulatePDA(def, input);
    allStepsRef.current = result.steps;
    setSimulationSteps([result.steps[0]]);
    setCurrentStepIndex(0);
    stepIdxRef.current = 0;
    setSimulationResult(null);
    setIsSimulating(true);

    if (result.steps.length <= 1) {
      setSimulationResult(result);
      addHistory({ input, accepted: result.accepted, steps: result.steps.length });
      return;
    }

    setIsRunningAll(true);
    runAllRef.current = true;
    const advance = () => {
      if (!runAllRef.current) return;
      const allSteps = allStepsRef.current;
      const nextIdx = stepIdxRef.current + 1;
      if (nextIdx >= allSteps.length) {
        setIsRunningAll(false);
        runAllRef.current = false;
        const r = simulatePDA(def, input);
        setSimulationResult(r);
        addHistory({ input, accepted: r.accepted, steps: r.steps.length });
        return;
      }
      stepIdxRef.current = nextIdx;
      setCurrentStepIndex(nextIdx);
      setSimulationSteps(allSteps.slice(0, nextIdx + 1));
      if (nextIdx === allSteps.length - 1) {
        setIsRunningAll(false);
        runAllRef.current = false;
        const r = simulatePDA(def, input);
        setSimulationResult(r);
        addHistory({ input, accepted: r.accepted, steps: r.steps.length });
      } else {
        timerRef.current = setTimeout(advance, 1500);
      }
    };
    timerRef.current = setTimeout(advance, 1500);
  }, [definition]);

  const nextStep = useCallback(() => {
    const allSteps = allStepsRef.current;
    const nextIdx = stepIdxRef.current + 1;
    if (nextIdx >= allSteps.length) {
      // Simulation complete
      const result = simulatePDA(definition, testInput);
      setSimulationResult(result);
      addHistory({ input: testInput, accepted: result.accepted, steps: result.steps.length });
      return;
    }
    stepIdxRef.current = nextIdx;
    setCurrentStepIndex(nextIdx);
    setSimulationSteps(allSteps.slice(0, nextIdx + 1));

    if (nextIdx === allSteps.length - 1) {
      const result = simulatePDA(definition, testInput);
      setSimulationResult(result);
      addHistory({ input: testInput, accepted: result.accepted, steps: result.steps.length });
    }
  }, [definition, testInput]);

  const runAll = useCallback(() => {
    setIsRunningAll(true);
    runAllRef.current = true;

    const advance = () => {
      if (!runAllRef.current) return;
      const allSteps = allStepsRef.current;
      const nextIdx = stepIdxRef.current + 1;
      if (nextIdx >= allSteps.length) {
        setIsRunningAll(false);
        runAllRef.current = false;
        const result = simulatePDA(definition, testInput);
        setSimulationResult(result);
        addHistory({ input: testInput, accepted: result.accepted, steps: result.steps.length });
        return;
      }
      stepIdxRef.current = nextIdx;
      setCurrentStepIndex(nextIdx);
      setSimulationSteps(allSteps.slice(0, nextIdx + 1));

      if (nextIdx === allSteps.length - 1) {
        setIsRunningAll(false);
        runAllRef.current = false;
        const result = simulatePDA(definition, testInput);
        setSimulationResult(result);
        addHistory({ input: testInput, accepted: result.accepted, steps: result.steps.length });
      } else {
        timerRef.current = setTimeout(advance, 1500);
      }
    };

    timerRef.current = setTimeout(advance, 1500);
  }, [definition, testInput]);

  const pauseRunAll = useCallback(() => {
    runAllRef.current = false;
    setIsRunningAll(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const resetSimulation = useCallback(() => {
    resetSimulationState();
  }, []);

  const addHistory = useCallback((entry: HistoryEntry) => {
    setHistory(prev => [entry, ...prev]);
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  const quickTest = useCallback((input: string): SimulationResult => {
    const result = simulatePDA(definition, input);
    addHistory({ input, accepted: result.accepted, steps: result.steps.length });
    return result;
  }, [definition, addHistory]);

  return (
    <PDAContext.Provider value={{
      definition, setDefinition,
      simulationSteps, currentStepIndex, simulationResult, isSimulating, isRunningAll,
      startSimulation, startAndRunAll, nextStep, runAll, pauseRunAll, resetSimulation,
      testInput, setTestInput,
      history, addHistory, clearHistory,
      quickTest, loadPreset, currentPresetIndex,
      isDark, toggleTheme,
    }}>
      {children}
    </PDAContext.Provider>
  );
}
