import React, { useState, useEffect } from 'react';
import { Terminal, Search, Award, Users, QrCode, Rocket, Shield, Moon, Sun, Sparkles } from 'lucide-react';

interface CommandPaletteProps {
  onNavigate: (view: string) => void;
  onTriggerDemoReset?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ onNavigate, onTriggerDemoReset }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [konamiUnlocked, setKonamiUnlocked] = useState(false);

  // Konami Code sequence: Up, Up, Down, Down, Left, Right, Left, Right, b, a
  const KONAMI_CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  const [keySequence, setKeySequence] = useState<string[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }

      // Check Konami Code
      setKeySequence(prev => {
        const updated = [...prev, e.key].slice(-KONAMI_CODE.length);
        if (updated.join('') === KONAMI_CODE.join('')) {
          setKonamiUnlocked(true);
          alert('🚀 KONAMI CODE OVERDRIVE ACTIVATED: Warp Drive Engaged! 🌟');
        }
        return updated;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const actions = [
    { label: 'Mission Control Dashboard', icon: Terminal, action: () => onNavigate('mission-control') },
    { label: 'Crew Portal (Status & Schedule)', icon: Users, action: () => onNavigate('crew-portal') },
    { label: 'Boarding Gate Scanner (PWA)', icon: QrCode, action: () => onNavigate('scanner') },
    { label: 'Launch Desk (Submissions)', icon: Rocket, action: () => onNavigate('launch') },
    { label: 'Flight Review (Judging & Rubrics)', icon: Shield, action: () => onNavigate('judging') },
    { label: 'Big Screen Mode (Projection)', icon: Award, action: () => onNavigate('big-screen') },
    { label: 'Crew Passport & Stamps', icon: Sparkles, action: () => onNavigate('passport') },
    { label: 'Reset Demo Mission (Apollo 24)', icon: Sparkles, action: () => onTriggerDemoReset && onTriggerDemoReset() }
  ];

  const filtered = actions.filter(a => a.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 p-4">
      <div className="fixed inset-0 bg-space-950/80 backdrop-blur-md" onClick={() => setIsOpen(false)} />
      <div className="relative w-full max-w-xl bg-space-900 border border-cyan-500/40 rounded-xl shadow-glow-cyan overflow-hidden z-10">
        <div className="flex items-center px-4 py-3 border-b border-space-800 gap-3">
          <Search className="w-5 h-5 text-cyan-400" />
          <input
            type="text"
            placeholder="Type a Mission Control command or press ESC to dismiss..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none font-mono"
            autoFocus
          />
          <kbd className="px-2 py-0.5 text-xs font-mono bg-space-800 text-slate-400 rounded border border-space-700">ESC</kbd>
        </div>

        <div className="py-2 max-h-72 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500 font-mono">No matching commands found.</div>
          ) : (
            filtered.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    item.action();
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-space-800/80 text-left text-sm text-slate-200 transition-colors cursor-pointer group"
                >
                  <Icon className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <span className="font-mono">{item.label}</span>
                </button>
              );
            })
          )}
        </div>

        {konamiUnlocked && (
          <div className="p-2 bg-gradient-to-r from-amber-500 to-cyan-500 text-space-950 font-bold text-center text-xs font-mono animate-bounce">
            🌟 KONAMI EASTER EGG UNLOCKED: MISSION STATUS: OVERCLOCK 🌟
          </div>
        )}
      </div>
    </div>
  );
};
