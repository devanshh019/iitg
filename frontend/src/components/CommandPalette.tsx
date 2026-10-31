import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { ALL_NAV_ITEMS } from '../config/navigation';

interface CommandPaletteProps {
  onNavigate: (view: string) => void;
  allowedViews: string[];
  userRole: string;
  onTriggerDemoReset?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  onNavigate,
  allowedViews,
  userRole
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const baseActions = allowedViews.map(viewId => {
    const item = ALL_NAV_ITEMS[viewId];
    if (!item) return null;
    return {
      label: item.label,
      description: item.description,
      icon: item.icon,
      action: () => onNavigate(viewId)
    };
  }).filter(Boolean) as Array<{ label: string; description: string; icon: any; action: () => void }>;

  const filtered = baseActions.filter(a =>
    a.label.toLowerCase().includes(query.toLowerCase()) ||
    a.description.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-md" onClick={() => setIsOpen(false)} />
      <div className="relative w-full max-w-lg bg-white border border-black/10 rounded-3xl shadow-apple-modal overflow-hidden z-10 text-black">
        <div className="flex items-center px-4 py-3 border-b border-neutral-100 gap-3 bg-white">
          <Search className="w-5 h-5 text-black" />
          <input
            type="text"
            placeholder="Search HackOS sections or press ESC to dismiss..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-black placeholder-neutral-400 focus:outline-none"
            autoFocus
          />
          <kbd className="px-2 py-0.5 text-[11px] font-mono bg-neutral-100 text-neutral-500 rounded-lg border border-neutral-200">ESC</kbd>
        </div>

        <div className="py-2 max-h-72 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-neutral-400">No matching sections found.</div>
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
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-50 text-left text-sm text-black transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-black" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-black">{item.label}</div>
                      <div className="text-[11px] text-neutral-500">{item.description}</div>
                    </div>
                  </div>
                  <span className="text-[11px] text-neutral-400 group-hover:text-black font-semibold">Open →</span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
