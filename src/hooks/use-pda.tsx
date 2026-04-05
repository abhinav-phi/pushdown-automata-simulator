import { useState, useCallback, createContext, useContext, useEffect, useRef } from 'react';
import {
  PDADefinition,
  SimulationStep,
  SimulationResult,
  HistoryEntry,
  SimulationSnapshot,
} from '@/lib/pda-types';
import { presets } from '@/lib/pda-presets';
import { simulatePDA, simulateStepByStep } from '@/lib/pda-engine';

interface PDAContextType {
  definition: PDADefinition;
  setDefinition: React.Dispatch<React.SetStateAction<PDADefinition>>;

  // Simulation state
  simulationSteps: SimulationStep[];
  currentStepIndex: number;
  simulationResult: SimulationResult | null;
  isSimulating: boolean;
  isRunningAll: boolean;

  // Simulation controls
  startSimulation: (input: string) => void;
  startAndRunAll: (input: string, defOverride?: PDADefinition) => void;
  nextStep: () => void;
  backStep: () => void;           // ← NEW: undo last step
  canGoBack: boolean;             // ← NEW: whether back step is available
  runAll: () => void;
  pauseRunAll: () => void;
  resetSimulation: () => void;

  // Input
  testInput: string;
  setTestInput: (s: string) => void;

  // History (test log)
  history: HistoryEntry[];
  addHistory: (entry: HistoryEntry) => void;
  clearHistory: () => void;

  // Quick test (no animation)
  quickTest: (input: string) => SimulationResult;

  // Presets
  loadPreset: (index: number) => void;
  currentPresetIndex: number;

  // Theme
  isDark: boolean;
  toggleTheme: () => void;

  // Acceptance mode (exposed separately for quick UI toggle)
  acceptanceMode: 'finalState' | 'emptyStack';
  setAcceptanceMode: (mode: 'finalState' | 'emptyStack') => void;
}

const PDAContext = createContext<PDAContextType | null>(null);

export function usePDA() {
  const ctx = useContext(PDAContext);
  if (!ctx) throw new Error('usePDA must be used within PDAProvider');
  return ctx;
}

export function PDAProvider({ children }: { children: React.ReactNode }) {
  const [definition, setDefinition] = useState<PDADefinition>(() => {
    try {
      const saved = localStorage.getItem('pda-custom');
      if (saved) return JSON.parse(saved);
    } catch {}
    return { ...presets[0].definition, transitions: [...presets[0].definition.transitions] };
  });

  const [currentPresetIndex, setCurrentPresetIndex] = useState(0);

  // All steps computed at simulation start — we scrub through them
  const [simulationSteps, setSimulationSteps] = useState<SimulationStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isRunningAll, setIsRunningAll] = useState(false);

  // Back-step: maintain a stack of visited step indices
  const undoStackRef = useRef<number[]>([]);

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

  // Sync acceptance mode with definition
  const acceptanceMode = definition.acceptanceMode;
  const setAcceptanceMode = useCallback((mode: 'finalState' | 'emptyStack') => {
    setDefinition(prev => ({ ...prev, acceptanceMode: mode }));
    resetSimulationState();
  }, []);

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

  function resetSimulationState() {
    setSimulationSteps([]);
    setCurrentStepIndex(-1);
    setSimulationResult(null);
    setIsSimulating(false);
    setIsRunningAll(false);
    runAllRef.current = false;
    undoStackRef.current = [];
    allStepsRef.current = [];
    stepIdxRef.current = 0;
    if (timerRef.current) clearTimeout(timerRef.current);
  }

  // ─── Start simulation (step-by-step mode) ────────────────────────────────
  const startSimulation = useCallback(
    (input: string) => {
      resetSimulationState();
      const result = simulatePDA(definition, input);
      allStepsRef.current = result.steps;
      setSimulationSteps(result.steps);
      setCurrentStepIndex(0);
      stepIdxRef.current = 0;
      undoStackRef.current = [];
      setSimulationResult(null);
      setIsSimulating(true);

      if (result.steps.length <= 1) {
        setSimulationResult(result);
        addHistory({ input, accepted: result.accepted, steps: result.steps.length });
      }
    },
    [definition]
  );

  // ─── Start + auto-run all steps ──────────────────────────────────────────
  const startAndRunAll = useCallback(
    (input: string, defOverride?: PDADefinition) => {
      const def = defOverride || definition;
      resetSimulationState();
      setTestInput(input);
      const result = simulatePDA(def, input);
      allStepsRef.current = result.steps;
      setSimulationSteps(result.steps);
      setCurrentStepIndex(0);
      stepIdxRef.current = 0;
      undoStackRef.current = [];
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
          setSimulationResult(result);
          addHistory({ input, accepted: result.accepted, steps: result.steps.length });
          return;
        }
        stepIdxRef.current = nextIdx;
        setCurrentStepIndex(nextIdx);
        if (nextIdx === allSteps.length - 1) {
          setIsRunningAll(false);
          runAllRef.current = false;
          setSimulationResult(result);
          addHistory({ input, accepted: result.accepted, steps: result.steps.length });
        } else {
          timerRef.current = setTimeout(advance, 600);
        }
      };
      timerRef.current = setTimeout(advance, 600);
    },
    [definition]
  );

  // ─── Next Step ────────────────────────────────────────────────────────────
  const nextStep = useCallback(() => {
    const allSteps = allStepsRef.current;
    const currentIdx = stepIdxRef.current;
    const nextIdx = currentIdx + 1;

    if (nextIdx >= allSteps.length) {
      // Already at end — compute and show result
      const result = simulatePDA(definition, testInput);
      setSimulationResult(result);
      addHistory({ input: testInput, accepted: result.accepted, steps: result.steps.length });
      return;
    }

    // Push current index onto undo stack before advancing
    undoStackRef.current = [...undoStackRef.current, currentIdx];

    stepIdxRef.current = nextIdx;
    setCurrentStepIndex(nextIdx);

    if (nextIdx === allSteps.length - 1) {
      const result = simulatePDA(definition, testInput);
      setSimulationResult(result);
      addHistory({ input: testInput, accepted: result.accepted, steps: result.steps.length });
    }
  }, [definition, testInput]);

  // ─── Back Step (Undo) ─────────────────────────────────────────────────────
  const backStep = useCallback(() => {
    const undoStack = undoStackRef.current;
    if (undoStack.length === 0) return;

    // Pop the last index from the undo stack
    const prevIdx = undoStack[undoStack.length - 1];
    undoStackRef.current = undoStack.slice(0, -1);

    stepIdxRef.current = prevIdx;
    setCurrentStepIndex(prevIdx);

    // Clear any existing result (we went back so it's no longer final)
    setSimulationResult(null);
  }, []);

  const canGoBack = undoStackRef.current.length > 0;

  // ─── Run All ──────────────────────────────────────────────────────────────
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

      undoStackRef.current = [...undoStackRef.current, stepIdxRef.current];
      stepIdxRef.current = nextIdx;
      setCurrentStepIndex(nextIdx);

      if (nextIdx === allSteps.length - 1) {
        setIsRunningAll(false);
        runAllRef.current = false;
        const result = simulatePDA(definition, testInput);
        setSimulationResult(result);
        addHistory({ input: testInput, accepted: result.accepted, steps: result.steps.length });
      } else {
        timerRef.current = setTimeout(advance, 600);
      }
    };

    timerRef.current = setTimeout(advance, 600);
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

  const quickTest = useCallback(
    (input: string): SimulationResult => {
      const result = simulatePDA(definition, input);
      addHistory({ input, accepted: result.accepted, steps: result.steps.length });
      return result;
    },
    [definition, addHistory]
  );

  // Force re-render for canGoBack (since it's derived from a ref)
  const [, forceUpdate] = useState(0);
  const wrappedNextStep = useCallback(() => {
    nextStep();
    forceUpdate(n => n + 1);
  }, [nextStep]);
  const wrappedBackStep = useCallback(() => {
    backStep();
    forceUpdate(n => n + 1);
  }, [backStep]);

  const computedCanGoBack = undoStackRef.current.length > 0;

  return (
    <PDAContext.Provider
      value={{
        definition,
        setDefinition,
        simulationSteps,
        currentStepIndex,
        simulationResult,
        isSimulating,
        isRunningAll,
        startSimulation,
        startAndRunAll,
        nextStep: wrappedNextStep,
        backStep: wrappedBackStep,
        canGoBack: computedCanGoBack,
        runAll,
        pauseRunAll,
        resetSimulation,
        testInput,
        setTestInput,
        history,
        addHistory,
        clearHistory,
        quickTest,
        loadPreset,
        currentPresetIndex,
        isDark,
        toggleTheme,
        acceptanceMode,
        setAcceptanceMode,
      }}
    >
      {children}
    </PDAContext.Provider>
  );
}