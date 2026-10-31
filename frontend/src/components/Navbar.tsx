import React from 'react';
import { LogOut, LogIn, Bell, Terminal } from 'lucide-react';
import { Button } from './ui/Button';
import { ALL_NAV_ITEMS } from '../config/navigation';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  userRole: string;
  userEmail: string | null;
  isAuthenticated: boolean;
  allowedViews: string[];
  onOpenLogin: () => void;
  onLogout: () => void;
  onOpenPalette: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  userRole,
  userEmail,
  isAuthenticated,
  allowedViews,
  onOpenLogin,
  onLogout,
  onOpenPalette
}) => {
  const visibleNavItems = allowedViews
    .map(id => ALL_NAV_ITEMS[id])
    .filter(Boolean);

  const getRoleDisplayName = (role: string) => {
    if (role === 'organizer') return 'Organizer';
    if (role === 'judge') return 'Judge';
    if (role === 'super_admin') return 'Super Admin';
    if (role === 'volunteer') return 'Volunteer';
    return 'Hacker';
  };

  const isOrganizerRole = userRole === 'organizer' || userRole === 'super_admin';

  return (
    <header className="sticky top-0 z-40 w-full apple-glass-nav">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <div
            onClick={() => onNavigate(allowedViews[0] || (isOrganizerRole ? 'org-overview' : 'hackathons'))}
            className="flex items-center gap-2.5 cursor-pointer group select-none"
          >
            <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center font-bold text-sm tracking-wider shadow-sm">
              H
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-sans font-bold tracking-tight text-base text-black block leading-none">
                  Hack<span className="text-neutral-500">OS</span>
                </span>
                {isOrganizerRole && (
                  <span className="text-[9px] font-bold bg-black text-white px-1.5 py-0.5 rounded leading-none uppercase tracking-wider">
                    {userRole === 'super_admin' ? 'Root' : 'Host'}
                  </span>
                )}
                {userRole === 'judge' && (
                  <span className="text-[9px] font-bold bg-neutral-900 text-amber-300 px-1.5 py-0.5 rounded leading-none uppercase tracking-wider border border-amber-400/30">
                    Jury
                  </span>
                )}
              </div>
              <span className="text-[10px] font-sans font-semibold text-neutral-400 block tracking-wider uppercase mt-0.5">
                {getRoleDisplayName(userRole)}
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {visibleNavItems.map(item => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-black text-white shadow-sm'
                      : 'text-neutral-600 hover:text-black hover:bg-neutral-100'
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
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenPalette}
            className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 text-xs bg-neutral-100 border border-neutral-200 rounded-xl text-neutral-600 hover:text-black hover:bg-neutral-200 transition-colors cursor-pointer"
            title="Search shortcuts"
          >
            <Terminal className="w-3.5 h-3.5 text-neutral-500" />
            <span className="font-mono text-[11px] font-semibold">Ctrl+K</span>
          </button>

          {/* Quick Notifications Button */}
          <button
            onClick={() => onNavigate(isOrganizerRole ? 'org-announcements' : 'announcements')}
            className={`p-2 rounded-xl transition-colors cursor-pointer border ${
              (currentView === 'announcements' || currentView === 'org-announcements')
                ? 'bg-black text-white border-black shadow-sm'
                : 'text-neutral-600 hover:text-black hover:bg-neutral-100 border-neutral-200'
            }`}
            title="Announcements"
          >
            <Bell className="w-4 h-4" />
          </button>

          {/* User Sign In / Logout Button */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs font-bold text-black leading-tight">
                  {userEmail?.split('@')[0]}
                </span>
                <span className="text-[10px] text-neutral-400 truncate max-w-[120px]">
                  {getRoleDisplayName(userRole)}
                </span>
              </div>
              <button
                onClick={onLogout}
                className="p-2 rounded-xl text-neutral-500 hover:text-black hover:bg-neutral-100 border border-neutral-200 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Button
              size="sm"
              variant="primary"
              onClick={onOpenLogin}
              className="gap-1.5 rounded-xl shadow-apple-sm bg-black text-white hover:bg-neutral-800"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
