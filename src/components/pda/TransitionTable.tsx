import { usePDA } from '@/hooks/use-pda';
import { EPSILON } from '@/lib/pda-types';

const romanNumerals = ['i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix', 'x',
  'xi', 'xii', 'xiii', 'xiv', 'xv', 'xvi', 'xvii', 'xviii', 'xix', 'xx'];

export default function TransitionTable() {
  const { definition } = usePDA();
  const { transitions } = definition;

  if (transitions.length === 0) {
    return (
      <div className="panel">
        <h2 className="panel-title">Transition Table</h2>
        <p className="text-xs text-muted-foreground text-center py-4">No transitions defined</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h2 className="panel-title">Transition Table</h2>
      <div className="overflow-auto max-h-48">
        <table className="w-full text-xs font-mono">
          <thead>
            <tr className="text-muted-foreground border-b border-border">
              <th className="text-left py-1.5 px-2 w-8">#</th>
              <th className="text-left py-1.5 px-2">Transition</th>
              <th className="text-left py-1.5 px-2">Result</th>
            </tr>
          </thead>
          <tbody>
            {transitions.map((t, i) => (
              <tr key={t.id} className="border-b border-border/50 hover:bg-secondary/30">
                <td className="py-1.5 px-2 text-muted-foreground">({romanNumerals[i] || i + 1})</td>
                <td className="py-1.5 px-2">
                  δ(<span className="text-primary">{t.currentState}</span>, <span className="text-accent">{t.inputSymbol}</span>, <span className="text-muted-foreground">{t.stackTop}</span>)
                </td>
                <td className="py-1.5 px-2">
                  (<span className="text-primary">{t.nextState}</span>, <span className="text-success">{t.stackOperation}</span>)
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
