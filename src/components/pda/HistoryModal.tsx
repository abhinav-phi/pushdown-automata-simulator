import { usePDA } from '@/hooks/use-pda';
import { X, Trash2 } from 'lucide-react';

export default function HistoryModal({ onClose }: { onClose: () => void }) {
  const { history, clearHistory } = usePDA();

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-lg w-full max-w-lg max-h-[70vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Test History</h2>
          <div className="flex items-center gap-2">
            <button onClick={clearHistory} className="text-xs px-2 py-1 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> Clear
            </button>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-auto flex-1 p-4">
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No tests run yet</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground border-b border-border">
                  <th className="text-left py-2 px-2">String</th>
                  <th className="text-left py-2 px-2">Result</th>
                  <th className="text-right py-2 px-2">Steps</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry, i) => (
                  <tr key={i} className="border-b border-border/50">
                    <td className="py-2 px-2 font-mono text-foreground">{entry.input || 'ε'}</td>
                    <td className={`py-2 px-2 font-semibold ${entry.accepted ? 'text-success' : 'text-destructive'}`}>
                      {entry.accepted ? '✓ Accepted' : '✗ Rejected'}
                    </td>
                    <td className="py-2 px-2 text-right text-muted-foreground">{entry.steps}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
