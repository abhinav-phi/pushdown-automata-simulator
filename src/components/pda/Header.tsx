import { usePDA } from '@/hooks/use-pda';
import { Sun, Moon, History } from 'lucide-react';

export default function Header({ onShowHistory }: { onShowHistory: () => void }) {
  const { definition, isDark, toggleTheme } = usePDA();

  return (
    <header className="flex items-center justify-between px-4 py-3 bg-card border-b border-border">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
          <span className="text-primary font-bold font-mono text-sm">PDA</span>
        </div>
        <div>
          <h1 className="text-lg font-bold text-foreground">PDA Simulator</h1>
          <p className="text-xs text-muted-foreground font-mono">
            {definition.languageDescription || 'Custom PDA'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onShowHistory}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
        >
          <History className="w-3.5 h-3.5" /> History
        </button>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}
