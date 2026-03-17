import React from 'react';
import { Github } from 'lucide-react';

export default function AppFooter() {
  return (
    <footer className="border-t border-white/10 bg-background/60 backdrop-blur-md mt-4">
      <div className="container mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {new Date().getFullYear()} Made with love by{' '}
          <span className="text-foreground font-medium">Abhinav</span>
        </span>
        <a
          href="https://github.com/abhinav-phi/pushdown-automata-simulator"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 hover:text-foreground transition-colors"
        >
          <Github className="w-3.5 h-3.5" />
          GitHub
        </a>
      </div>
    </footer>
  );
}