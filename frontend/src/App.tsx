import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { EventProvider } from './context/EventContext';
import { Navbar } from './components/Navbar';
import { MobileNav } from './components/MobileNav';
import { CommandPalette } from './components/CommandPalette';
import { LoginPage } from './views/LoginPage';
import { HackathonsDirectoryView } from './views/HackathonsDirectoryView';
import { CrewPortalView } from './views/CrewPortalView';
import { SquadsView } from './views/SquadsView';
import { ProblemStatementsView } from './views/ProblemStatementsView';
import { LaunchDeskView } from './views/LaunchDeskView';
import { AnnouncementsView } from './views/AnnouncementsView';
import { PassportView } from './views/PassportView';
import { OrganizationPortalView } from './views/OrganizationPortalView';
import { ArenaCommandCenter } from './views/ArenaCommandCenter';
import { OrganizerProblemsView } from './views/OrganizerProblemsView';
import { OrganizerAuditView } from './views/OrganizerAuditView';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from './components/ui/Button';

const AppContent: React.FC = () => {
  const {
    user,
    isAuthenticated,
    activeRole,
    logout,
    isLoading,
    canAccessView,
    getAllowedViews,
    getDefaultView
  } = useAuth();

  const [currentView, setCurrentView] = useState('hackathons');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Synchronize view with active role whenever role changes
  useEffect(() => {
    const allowed = getAllowedViews();
    if (!allowed.includes(currentView)) {
      const defaultForRole = getDefaultView();
      setCurrentView(defaultForRole);
    }
  }, [activeRole]);

  const handleNavigate = (view: string) => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If unauthenticated, show multi-step login
  if (!isAuthenticated && !isLoading) {
    return <LoginPage onSuccess={() => setShowLoginModal(false)} />;
  }

  const allowedViews = getAllowedViews();
  const isViewPermitted = canAccessView(currentView);

  return (
    <div className="min-h-screen bg-[#FBFBFD] text-black flex flex-col font-sans selection:bg-neutral-200 selection:text-black">
      {/* Sticky Apple Navigation Bar */}
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        userRole={activeRole}
        userEmail={user?.email || null}
        isAuthenticated={isAuthenticated}
        allowedViews={allowedViews}
        onOpenLogin={() => setShowLoginModal(true)}
        onLogout={logout}
        onOpenPalette={() => setPaletteOpen(true)}
      />

      {/* Main App Content Area */}
      <main className="flex-1 pb-24 lg:pb-16 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-4">
        {!isViewPermitted ? (
          <div className="max-w-md mx-auto my-12 p-8 bg-white border border-black/[0.08] rounded-3xl shadow-apple-card text-center animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 border border-neutral-200 text-black flex items-center justify-center mx-auto mb-3">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-black tracking-tight">Access Restricted</h2>
            <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
              {activeRole === 'organizer' || activeRole === 'super_admin'
                ? 'Participant competitor views are restricted. You are currently in the Organizer Command Console.'
                : 'This feature is only available to authorized event organizers.'}
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setCurrentView(getDefaultView())}
              className="mt-5 gap-2 mx-auto rounded-xl bg-black text-white hover:bg-neutral-800"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{activeRole === 'organizer' || activeRole === 'super_admin' ? 'Return to Organizer Console' : 'Back to Arenas'}</span>
            </Button>
          </div>
        ) : (
          <>
            {/* Hacker Views (Only accessible to participants) */}
            {currentView === 'hackathons' && <HackathonsDirectoryView onNavigate={handleNavigate} />}
            {currentView === 'crew-portal' && <CrewPortalView onNavigate={handleNavigate} />}
            {currentView === 'squads' && <SquadsView />}
            {currentView === 'problems' && <ProblemStatementsView onNavigate={handleNavigate} />}
            {currentView === 'launch' && <LaunchDeskView onNavigate={handleNavigate} />}
            {currentView === 'announcements' && <AnnouncementsView />}
            {currentView === 'passport' && <PassportView />}

            {/* Organizer Views (Strictly dedicated organizer suite) */}
            {(currentView === 'org-overview' || currentView === 'org-portal') && (
              <OrganizationPortalView onNavigate={handleNavigate} />
            )}
            {currentView === 'org-command' && (
              <ArenaCommandCenter onBack={() => handleNavigate('org-overview')} />
            )}
            {currentView === 'org-problems' && <OrganizerProblemsView />}
            {currentView === 'org-announcements' && <AnnouncementsView />}
            {currentView === 'org-audit' && <OrganizerAuditView />}
          </>
        )}
      </main>

      {/* Mobile-first bottom navigation bar */}
      <MobileNav
        currentView={currentView}
        onNavigate={handleNavigate}
        allowedViews={allowedViews}
      />

      {/* Command Palette */}
      <CommandPalette
        onNavigate={handleNavigate}
        allowedViews={allowedViews}
        userRole={activeRole}
      />

      {/* Optional Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <LoginPage
            onSuccess={() => setShowLoginModal(false)}
            onCancel={() => setShowLoginModal(false)}
          />
        </div>
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <EventProvider>
        <AppContent />
      </EventProvider>
    </AuthProvider>
  );
};

export default App;
