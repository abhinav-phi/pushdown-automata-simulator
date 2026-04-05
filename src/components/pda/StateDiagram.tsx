import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import { usePDA } from '@/hooks/use-pda';
import { EPSILON } from '@/lib/pda-types';

export default function StateDiagram() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const { definition, simulationSteps, currentStepIndex, isSimulating, isDark } = usePDA();

  const currentState = isSimulating && currentStepIndex >= 0 && simulationSteps[currentStepIndex]
    ? simulationSteps[currentStepIndex].currentState
    : null;

  useEffect(() => {
    if (!containerRef.current) return;

    const nodes = definition.states.map(s => ({
      data: {
        id: s,
        label: s,
        isAccept: definition.acceptStates.includes(s),
        isInitial: s === definition.initialState,
        isActive: s === currentState,
      },
    }));

    // Group transitions by (from, to)
    const edgeMap = new Map<string, string[]>();
    for (const t of definition.transitions) {
      const key = `${t.currentState}->${t.nextState}`;
      const label = `${t.inputSymbol}, ${t.stackTop} → ${t.stackOperation}`;
      if (!edgeMap.has(key)) edgeMap.set(key, []);
      edgeMap.get(key)!.push(label);
    }

    const edges = Array.from(edgeMap.entries()).map(([key, labels]) => {
      const [source, target] = key.split('->');
      return {
        data: {
          id: `edge-${key}`,
          source,
          target,
          label: labels.join('\n'),
        },
      };
    });

    // Add initial arrow node
    const initNode = {
      data: { id: '__init__', label: '' },
      position: { x: -60, y: 0 },
    };
    const initEdge = {
      data: { id: '__init_edge__', source: '__init__', target: definition.initialState, label: '' },
    };

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const textColor = isDark ? '#f1f5f9' : '#1e293b';
    const bgColor = isDark ? '#1e293b' : '#ffffff';
    const borderColor = isDark ? '#334155' : '#d1d5db';
    const nodeColor = isDark ? '#475569' : '#9ca3af';

    const cy = cytoscape({
      container: containerRef.current,
      elements: [...nodes, ...edges, initNode, initEdge],
      style: [
        {
          selector: 'node',
          style: {
            'label': 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '12px',
            'font-family': 'JetBrains Mono, monospace',
            'color': textColor,
            'background-color': nodeColor,
            'border-width': 2,
            'border-color': borderColor,
            'width': 50,
            'height': 50,
          } as any,
        },
        {
          selector: 'node[?isAccept]',
          style: {
            'border-width': 4,
            'border-color': '#14b8a6',
            'border-style': 'double',
          } as any,
        },
        {
          selector: 'node[?isActive]',
          style: {
            'background-color': '#f59e0b',
            'border-color': '#f59e0b',
            'color': '#0f172a',
          } as any,
        },
        {
          selector: '#__init__',
          style: {
            'width': 1,
            'height': 1,
            'background-opacity': 0,
            'border-width': 0,
            'label': '',
          } as any,
        },
        {
          selector: 'edge',
          style: {
            'label': 'data(label)',
            'font-size': '9px',
            'font-family': 'JetBrains Mono, monospace',
            'color': textColor,
            'text-wrap': 'wrap',
            'text-rotation': 'autorotate',
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': nodeColor,
            'line-color': nodeColor,
            'width': 1.5,
            'text-background-color': bgColor,
            'text-background-opacity': 0.85,
            'text-background-padding': '2px',
            'text-margin-y': -8,
          } as any,
        },
        {
          selector: 'edge[source = target]',
          style: {
            'curve-style': 'unbundled-bezier' as any,
            'control-point-distances': [40],
            'control-point-weights': [0.5],
            'loop-direction': '-30deg',
            'loop-sweep': '-60deg',
          } as any,
        },
      ],
      layout: {
        name: 'breadthfirst',
        directed: true,
        padding: 40,
        spacingFactor: 1.5,
        roots: definition.initialState ? [`#${definition.initialState}`] : undefined,
      } as any,
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
    });

    // Position init arrow node to the left
    const initTarget = cy.getElementById(definition.initialState);
    if (initTarget.length > 0) {
      const pos = initTarget.position();
      cy.getElementById('__init__').position({ x: pos.x - 70, y: pos.y });
    }

    cy.fit(undefined, 30);
    cyRef.current = cy;

    return () => {
      cy.destroy();
    };
  }, [definition, currentState, isDark]);

  return (
    <div className="panel h-full flex flex-col">
      <h2 className="panel-title">State Diagram</h2>
      <div ref={containerRef} className="flex-1 min-h-[200px] rounded bg-secondary/30" />
    </div>
  );
}
