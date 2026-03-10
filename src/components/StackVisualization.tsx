import React from 'react';

interface Props {
  stack: string[];
}

export default function StackVisualization({ stack }: Props) {
  const reversed = [...stack].reverse(); // top of stack first

  return (
    <div className="panel-card">
      <h2 className="panel-title">Stack</h2>
      <div className="flex flex-col items-center">
        <span className="text-[10px] font-medium text-primary mb-1 tracking-wider uppercase">Top</span>
        <div className="w-24 flex flex-col">
          {reversed.length === 0 ? (
            <div className="stack-cell text-muted-foreground italic rounded">Empty</div>
          ) : (
            reversed.map((sym, i) => (
              <div
                key={`${i}-${sym}`}
                className={`stack-cell ${i === 0 ? 'stack-cell-top rounded-t-md animate-stack-push' : ''} ${i === reversed.length - 1 ? 'rounded-b-md' : ''}`}
              >
                {sym}
              </div>
            ))
          )}
        </div>
        <div className="w-24 h-1 bg-foreground/20 rounded-full mt-0.5" />
        <span className="text-[10px] text-muted-foreground mt-1">Bottom</span>
      </div>
    </div>
  );
}
