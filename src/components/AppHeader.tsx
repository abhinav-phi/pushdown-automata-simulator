import React from 'react';
import { Sun, Moon } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { predefinedExamples } from '@/lib/pda-examples';

interface Props {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  onLoadExample: (name: string) => void;
}

export default function AppHeader({ theme, toggleTheme, onLoadExample }: Props) {
  return (
    <header className="sticky top-0 z-50 border-b border-indigo-500/20 bg-background/70 backdrop-blur-md shadow-sm">
      <div className="container mx-auto px-6 py-3 flex flex-wrap items-center justify-between gap-3">

        {/* Logo + Title */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <img src="/pda.png" alt="PDA" className="w-10 h-10 object-cover rounded" />
            </div>
            {/* Subtle glow */}
            <div className="absolute inset-0 rounded-xl bg-indigo-500/20 blur-md -z-10" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground leading-tight">
              PDA Simulator
            </h1>
            <p className="text-[11px] text-muted-foreground/70 hidden sm:block">
              Visualize Pushdown Automata in Real-Time
            </p>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-3">

          {/* Load Example */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden md:block">Load example:</span>
            <Select onValueChange={onLoadExample}>
              <SelectTrigger className="h-9 w-44 text-xs rounded-xl border-indigo-500/30 focus:border-indigo-500 focus:ring-indigo-500/20 transition-all">
                <SelectValue placeholder="Choose preset..." />
              </SelectTrigger>
              <SelectContent>
                {predefinedExamples.map(ex => (
                  <SelectItem key={ex.name} value={ex.name}>{ex.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Dark/Light Toggle */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl border border-indigo-500/20 bg-indigo-500/10 hover:bg-indigo-500/20 hover:scale-105 flex items-center justify-center transition-all duration-200 shadow-sm"
            title="Toggle theme"
          >
            {theme === 'dark'
              ? <Sun className="w-4 h-4 text-yellow-400" />
              : <Moon className="w-4 h-4 text-indigo-600" />
            }
          </button>

        </div>
      </div>
    </header>
  );
}