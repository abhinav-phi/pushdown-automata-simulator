import { usePDA } from '@/hooks/use-pda';
import { motion, AnimatePresence } from 'framer-motion';

export default function StackVisualizer() {
  const { simulationSteps, currentStepIndex, isSimulating } = usePDA();

  const currentStep = isSimulating && currentStepIndex >= 0
    ? simulationSteps[currentStepIndex]
    : null;

  const stack = currentStep?.stackContents || [];
  // Display stack top-to-bottom (reverse since stack top is last element)
  const displayStack = [...stack].reverse();

  const operation = currentStep?.stackOperation;
  const symbol = currentStep?.stackSymbol;

  return (
    <div className="panel">
      <h2 className="panel-title">Stack Visualizer</h2>

      {/* Operation label */}
      <AnimatePresence mode="wait">
        {currentStep && operation && operation !== 'NO_OP' && (
          <motion.div
            key={`${currentStepIndex}-${operation}`}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`text-xs font-mono mb-2 font-semibold ${
              operation === 'PUSH' || operation === 'REPLACE'
                ? 'text-success'
                : operation === 'POP'
                ? 'text-destructive'
                : 'text-muted-foreground'
            }`}
          >
            {operation === 'PUSH' && `↓ PUSH: ${symbol}`}
            {operation === 'POP' && `↑ POP: ${symbol}`}
            {operation === 'REPLACE' && `↔ REPLACE: ${symbol}`}
            {operation === 'EPSILON' && 'ε-move'}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stack */}
      <div className="flex flex-col items-center gap-0.5 min-h-[120px]">
        {displayStack.length === 0 ? (
          <div className="border-2 border-dashed border-border rounded px-8 py-4 text-xs text-muted-foreground font-mono">
            Empty
          </div>
        ) : (
          <AnimatePresence>
            {displayStack.map((sym, i) => {
              const isTop = i === 0;
              return (
                <motion.div
                  key={`${currentStepIndex}-${i}-${sym}`}
                  initial={{ opacity: 0, y: -20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className={`stack-cell w-24 ${isTop ? 'stack-cell-top' : ''}`}
                >
                  {isTop && <span className="text-[10px] text-primary absolute -left-12">TOP →</span>}
                  {sym}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Depth */}
      <div className="text-xs text-muted-foreground font-mono text-center mt-3">
        Stack depth: {stack.length}
      </div>
    </div>
  );
}
