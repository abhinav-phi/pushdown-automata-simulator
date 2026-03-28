import React from 'react';
import { Github, Linkedin, Mail } from 'lucide-react';

export default function AppFooter() {
  return (
    <footer
      className="border-t border-white/10 mt-auto"
      style={{
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        background: 'rgba(15, 23, 42, 0.6)',
        boxShadow: '0 -4px 24px 0 rgba(0,0,0,0.18)',
      }}
    >
      <div className="container mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">

        {/* Left */}
        <div className="flex items-center gap-2">
          <img
            src="/logo.jpg"
            alt="Abhinav"
            className="w-7 h-7 rounded-full object-cover ring-2 ring-primary/30"
          />
          <span
            className="text-sm font-semibold"
            style={{
              background: 'linear-gradient(90deg, #6366F1, #22C55E)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Abhinav
          </span>
        </div>

        {/* Center */}
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground/50">
          <span>© {new Date().getFullYear()}</span>
          <span>•</span>
          <span>Made with</span>
          <span className="text-red-500">❤️</span>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">

          <a
            href="https://github.com/abhinav-phi"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-muted-foreground/60 hover:text-foreground hover:bg-white/10 px-2 py-1 rounded-lg transition-all duration-200"
          >
            <Github className="w-3.5 h-3.5" />
            <span>GitHub</span>
          </a>

          <a
            href="https://linkedin.com/in/abhinavphi"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-sm text-muted-foreground/60 hover:text-foreground hover:bg-white/10 px-2 py-1 rounded-lg transition-all duration-200"
          >
            <Linkedin className="w-3.5 h-3.5" />
            <span>LinkedIn</span>
          </a>

          <a
            href="mailto:abhinav.phi15@gmail.com"
            className="flex items-center gap-1 text-sm text-muted-foreground/60 hover:text-foreground hover:bg-white/10 px-2 py-1 rounded-lg transition-all duration-200"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Email</span>
          </a>

        </div>

      </div>
    </footer>
  );
}