import { usePDA } from '@/hooks/use-pda';
import { Sun, Moon, History } from 'lucide-react';

export default function Header({ onShowHistory }: { onShowHistory: () => void }) {
  const { definition, isDark, toggleTheme } = usePDA();

  return (
    <header
      className="flex items-center justify-between px-4 py-3 border-b border-white/10 backdrop-blur-md bg-background/60 sticky top-0 z-10"
      style={{ boxShadow: '0 4px 24px 0 rgba(0,0,0,0.18)' }}
    >
      
      {/* Left: Logo + Title */}
      <div className="flex items-center gap-3">
        <img
          src="/pda.png"
          alt="PDA Logo"
          className="w-9 h-9 rounded-lg object-cover ring-2 ring-primary/30"
        />
        <div>
          <h1 className="text-lg font-bold text-foreground">PDA Simulator</h1>
          <p className="text-xs text-muted-foreground font-mono">
            L = {"{"} aⁿ bᵐ | n ≥ 1, m ≥ 1 {"}"}
          </p>
        </div>
      </div>

      {/* Center: Attribution */}
      <div className="absolute left-1/2 transform -translate-x-1/2 text-center hidden md:block">
        
        <h2 className="text-xl font-semibold tracking-widest text-foreground font-cocogoose">
          DEVELOPED BY ABHINAV <span className="text-primary">(2024UCS1674)</span>
        </h2>

        <p className="text-sm tracking-wide text-muted-foreground mt-1">
          Under the Guidance of Prof. Vijay Bohat Sir
        </p>

      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={onShowHistory}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-white/10 backdrop-blur-sm text-secondary-foreground hover:bg-white/20 transition-colors border border-white/10"
        >
          <History className="w-3.5 h-3.5" /> History
        </button>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-md bg-white/10 backdrop-blur-sm text-secondary-foreground hover:bg-white/20 transition-colors border border-white/10"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}