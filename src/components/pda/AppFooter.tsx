import React from 'react';
import { Github, Linkedin, Mail } from 'lucide-react';

export default function AppFooter() {
  return (
    <footer className="border-t border-indigo-500/20 bg-background/70 backdrop-blur-md mt-4">
      <div className="container mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">

        {/* Left: Logo + Name */}
        <div className="flex items-center gap-2">
          <img src="/logo.jpg" alt="Abhinav" className="w-7 h-7 rounded-full object-cover ring-2 ring-indigo-500/30" />
          <span className="text-sm font-semibold" style={{ background: 'linear-gradient(90deg, #6366F1, #22C55E)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Abhinav
          </span>
        </div>

        {/* Center: Copyright */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground/50">
          <span>© {new Date().getFullYear()}</span>
          <span>•</span>
          <span>Made with</span>
          <span className="animate-pulse text-red-500" style={{ animationDuration: '1.5s' }}>❤️</span>
        </div>

        {/* Right: Links */}
        <div className="flex items-center gap-2">
          <a href="https://github.com/abhinav-phi" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-muted-foreground/60 hover:text-foreground px-2 py-1 rounded-lg hover:bg-indigo-500/10 transition-all duration-200">
            <Github className="w-3.5 h-3.5" /> GitHub
          </a>
          <a href="https://linkedin.com/in/abhinavphi" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm text-muted-foreground/60 hover:text-foreground px-2 py-1 rounded-lg hover:bg-indigo-500/10 transition-all duration-200">
            <Linkedin className="w-3.5 h-3.5" /> LinkedIn
          </a>
          <a href="mailto:abhinav.phi15@gmail.com" className="flex items-center gap-1 text-sm text-muted-foreground/60 hover:text-foreground px-2 py-1 rounded-lg hover:bg-indigo-500/10 transition-all duration-200">
            <Mail className="w-3.5 h-3.5" /> Email
          </a>
        </div>

      </div>
    </footer>
  );
}
