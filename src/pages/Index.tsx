import { useState } from 'react';
import { PDAProvider } from '@/hooks/use-pda';
import Header from '@/components/pda/Header';
import LanguageInputPanel from '@/components/pda/LanguageInputPanel';
import PDADefinitionPanel from '@/components/pda/PDADefinitionPanel';
import TransitionTable from '@/components/pda/TransitionTable';
import StateDiagram from '@/components/pda/StateDiagram';
import StackVisualizer from '@/components/pda/StackVisualizer';
import SimulationControls from '@/components/pda/SimulationControls';
import ExecutionLog from '@/components/pda/ExecutionLog';
import InputTestingPanel from '@/components/pda/InputTestingPanel';
import HistoryModal from '@/components/pda/HistoryModal';

function PDAApp() {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header onShowHistory={() => setShowHistory(true)} />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[320px_1fr_300px] gap-2 p-2 overflow-hidden">
        {/* Left Column */}
        <div className="flex flex-col gap-2 overflow-auto">
          <LanguageInputPanel />
          <PDADefinitionPanel />
          <TransitionTable />
          <InputTestingPanel />
        </div>

        {/* Middle Column */}
        <div className="flex flex-col overflow-hidden">
          <StateDiagram />
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-2 overflow-auto">
          <StackVisualizer />
          <SimulationControls />
          <ExecutionLog />
        </div>
      </div>

      {showHistory && <HistoryModal onClose={() => setShowHistory(false)} />}
    </div>
  );
}

export default function Index() {
  return (
    <PDAProvider>
      <PDAApp />
    </PDAProvider>
  );
}
