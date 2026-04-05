import { useState } from 'react';
import { PDAProvider } from '@/hooks/use-pda';
import Header from '@/components/pda/Header';
import LanguageInputPanel from '@/components/pda/LanguageInputPanel';
import PDADefinitionPanel from '@/components/pda/PDADefinitionPanel';
import EditableTransitionTable from '@/components/pda/EditableTransitionTable';
import StateDiagram from '@/components/pda/StateDiagram';
import StackVisualizer from '@/components/pda/StackVisualizer';
import SimulationControls from '@/components/pda/SimulationControls';
import ExecutionLog from '@/components/pda/ExecutionLog';
import InputTestingPanel from '@/components/pda/InputTestingPanel';
import HistoryModal from '@/components/pda/HistoryModal';
import AppFooter from '@/components/pda/AppFooter';

function PDAApp() {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header onShowHistory={() => setShowHistory(true)} />

      <div className="flex-1 grid grid-cols-[300px_1fr] gap-2 p-2 overflow-hidden h-[calc(100vh-57px)]">

        {/* Left Column */}
        <div className="flex flex-col gap-2 overflow-auto">
          <LanguageInputPanel />
          {/* Editable Transition Table replaces static TransitionTable */}
          <EditableTransitionTable />
          {/* <PDADefinitionPanel /> */}
          <InputTestingPanel />
        </div>

        {/* Right Side */}
        <div className="flex flex-col gap-2 overflow-hidden">

          {/* State Diagram — top */}
          <div className="h-[300px]">
            <StateDiagram />
          </div>

          {/* Bottom Row — Stack, Simulation, Log */}
          <div className="grid grid-cols-3 gap-2 h-[320px] shrink-0">
            <StackVisualizer />
            <SimulationControls />
            <ExecutionLog />
          </div>

        </div>
      </div>

      <AppFooter />
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