import React, { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import { PDADefinition } from '@/lib/pda-types';

interface Props {
  definition: PDADefinition;
  currentState: string | null;
}

export default function StateDiagram({ definition, currentState }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const nodes = definition.states.map(s => ({
      data: {
        id: s,
        label: s,
        isInitial: s === definition.initialState,
        isAccept: definition.acceptStates.includes(s),
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

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements: [...nodes, ...edges],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#e2e8f0',
            'border-width': 2,
            'border-color': '#94a3b8',
            label: 'data(label)',
            'text-valign': 'center',
            'text-halign': 'center',
            'font-size': '12px',
            'font-family': 'JetBrains Mono, monospace',
            width: 45,
            height: 45,
            color: '#1e293b',
          },
        },
        {
          selector: 'node[?isAccept]',
          style: {
            'border-width': 4,
            'border-style': 'double',
            'border-color': '#059669',
          },
        },
        {
          selector: 'node[?isActive]',
          style: {
            'background-color': '#0d9488',
            'border-color': '#0d9488',
            color: '#ffffff',
          },
        },
        {
          selector: 'node[?isInitial]',
          style: {
            shape: 'round-rectangle' as any,
          },
        },
        {
          selector: 'edge',
          style: {
            'curve-style': 'bezier',
            'target-arrow-shape': 'triangle',
            'target-arrow-color': '#64748b',
            'line-color': '#94a3b8',
            width: 1.5,
            label: 'data(label)',
            'font-size': '9px',
            'font-family': 'JetBrains Mono, monospace',
            'text-wrap': 'wrap',
            'text-rotation': 'autorotate',
            'text-margin-y': -10,
            color: '#475569',
            'text-background-color': '#ffffff',
            'text-background-opacity': 0.85,
            'text-background-padding': '2px',
          },
        },
        {
          selector: 'edge[source = target]',
          style: {
            'curve-style': 'loop' as any,
            'loop-direction': '0deg',
            'loop-sweep': '-90deg',
          } as any,
        },
      ],
      layout: {
        name: 'breadthfirst',
        directed: true,
        spacingFactor: 1.5,
        padding: 30,
      },
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
    });

    return () => {
      cyRef.current?.destroy();
    };
  }, [definition, currentState]);

  return (
    <div className="panel-card">
      <h2 className="panel-title">State Diagram</h2>
      <div ref={containerRef} className="w-full h-[600px] bg-card rounded-lg border" />
      <div className="flex gap-4 mt-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm border-2 border-muted-foreground inline-block" /> State
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm border-[3px] border-state-accept inline-block" style={{ borderStyle: 'double' }} /> Accept
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-sm bg-primary inline-block" /> Active
        </span>
      </div>
    </div>
  );
}
