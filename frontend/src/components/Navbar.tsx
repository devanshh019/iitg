import React from 'react';
import { Terminal, Users, QrCode, Rocket, Shield, Award, Sparkles, LogOut, Radio, KeyRound } from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  userRole: string;
  userEmail: string | null;
  onLogout: () => void;
  onSwitchRole: (role: string) => void;
  onOpenPalette: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  userRole,
  userEmail,
  onLogout,
  onSwitchRole,
  onOpenPalette
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-space-950/85 backdrop-blur-xl border-b border-space-800">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <div
            onClick={() => onNavigate('crew-portal')}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-glow-cyan">
              <Radio className="w-4 h-4 text-space-950 animate-pulse" />
            </div>
            <div>
              <span className="font-mono font-bold tracking-wider text-base text-white">HACKOS</span>
              <span className="text-[10px] font-mono text-cyan-400 block -mt-1 tracking-widest">MISSION CTRL</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {[
              { id: 'crew-portal', label: 'Crew Portal', icon: Users },
              { id: 'squads', label: 'Squads', icon: Shield },
              { id: 'scanner', label: 'Boarding Gate', icon: QrCode },
              { id: 'launch', label: 'Launches', icon: Rocket },
              { id: 'judging', label: 'Flight Review', icon: Shield },
              { id: 'mission-control', label: 'Mission Control', icon: Terminal },
              { id: 'big-screen', label: 'Big Screen', icon: Award },
              { id: 'passport', label: 'Passport', icon: Sparkles }
            ].map(item => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-space-900'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right side tools */}
        <div className="flex items-center gap-3">
          {/* Command Palette shortcut button */}
          <button
            onClick={onOpenPalette}
            className="hidden sm:flex items-center gap-2 px-2.5 py-1 text-xs font-mono bg-space-900 border border-space-800 rounded-lg text-slate-400 hover:text-white hover:border-space-700 transition-colors"
          >
            <span>Search</span>
            <kbd className="px-1.5 py-0.5 text-[10px] bg-space-800 rounded text-cyan-400 border border-space-700">⌘K</kbd>
          </button>

          {/* Quick Demo Role Switcher */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-mono text-slate-500 hidden md:inline">Role:</span>
            <select
              value={userRole}
              onChange={(e) => onSwitchRole(e.target.value)}
              className="bg-space-900 border border-space-700 text-xs text-cyan-400 rounded-lg px-2 py-1 font-mono focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="organizer">Organizer</option>
              <option value="participant">Crew</option>
              <option value="judge">Judge</option>
              <option value="volunteer">Volunteer</option>
              <option value="super_admin">Super Admin</option>
            </select>
          </div>

          <Badge variant={userRole === 'organizer' ? 'amber' : userRole === 'judge' ? 'purple' : 'cyan'}>
            {userRole.toUpperCase()}
          </Badge>

          <Button variant="ghost" size="sm" onClick={onLogout} className="text-slate-400 hover:text-rose-400 p-2">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
};
