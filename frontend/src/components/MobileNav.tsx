import React from 'react';
import { ALL_NAV_ITEMS } from '../config/navigation';

interface MobileNavProps {
  currentView: string;
  onNavigate: (view: string) => void;
  allowedViews: string[];
}

export const MobileNav: React.FC<MobileNavProps> = ({ currentView, onNavigate, allowedViews }) => {
  const visibleItems = allowedViews
    .map(id => ALL_NAV_ITEMS[id])
    .filter(Boolean)
    .filter(item => item.id !== 'big-screen');

  if (visibleItems.length === 0) return null;

  return (
    <nav
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 apple-glass-tabbar pb-safe"
    >
      <div className="flex items-center justify-around px-1 py-1 max-w-lg mx-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-0.5 rounded-2xl transition-all cursor-pointer select-none active:scale-95 ${
                isActive
                  ? 'text-black font-bold'
                  : 'text-neutral-400 hover:text-black'
              }`}
            >
              <div
                className={`px-2.5 py-1 rounded-xl transition-all ${
                  isActive
                    ? 'bg-black text-white shadow-sm'
                    : 'hover:bg-neutral-100'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className={`text-[10px] mt-0.5 tracking-tight ${isActive ? 'font-bold text-black' : 'font-medium'}`}>
                {item.mobileLabel}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
