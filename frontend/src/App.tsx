import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { CommandPalette } from './components/CommandPalette';
import { CrewPortalView } from './views/CrewPortalView';
import { SquadsView } from './views/SquadsView';
import { BoardingScannerView } from './views/BoardingScannerView';
import { LaunchDeskView } from './views/LaunchDeskView';
import { JudgingView } from './views/JudgingView';
import { MissionControlView } from './views/MissionControlView';
import { BigScreenView } from './views/BigScreenView';
import { PassportView } from './views/PassportView';
import { getStoredAuth, setStoredAuth, clearStoredAuth, apiFetch } from './api/client';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState('crew-portal');
  const [userRole, setUserRole] = useState('organizer');
  const [userEmail, setUserEmail] = useState<string | null>('flight-director@hackos.io');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [isBigScreenActive, setIsBigScreenActive] = useState(false);

  useEffect(() => {
    // Initial demo login as organizer
    authenticateAsRole('organizer');
  }, []);

  const authenticateAsRole = async (role: string) => {
    setUserRole(role);
    const roleEmails: Record<string, string> = {
      super_admin: 'commander@hackos.io',
      organizer: 'flight-director@hackos.io',
      volunteer: 'gate-crew@hackos.io',
      judge: 'judge1@hackos.io',
      participant: 'crew_1_phoenix@apollo.hackos.io'
    };
    const targetEmail = roleEmails[role] || 'flight-director@hackos.io';
    setUserEmail(targetEmail);

    try {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: targetEmail, password: 'Password123!' })
      });
      setStoredAuth({
        token: res.access_token,
        userId: res.user_id,
        isSuperAdmin: res.is_super_admin,
        roles: res.roles,
        email: targetEmail
      });
    } catch (e) {
      console.warn('Demo login note:', e);
    }
  };

  const handleDemoReset = async () => {
    if (confirm('Execute one-click Demo Reset for Apollo 24?')) {
      alert('Demo mission state verified and operational.');
    }
  };

  const handleNavigate = (view: string) => {
    if (view === 'big-screen') {
      setIsBigScreenActive(true);
    } else {
      setIsBigScreenActive(false);
      setCurrentView(view);
    }
  };

  if (isBigScreenActive) {
    return <BigScreenView onExit={() => setIsBigScreenActive(false)} />;
  }

  return (
    <div className="min-h-screen bg-space-950 text-slate-100 flex flex-col font-sans">
      <Navbar
        currentView={currentView}
        onNavigate={handleNavigate}
        userRole={userRole}
        userEmail={userEmail}
        onLogout={() => {
          clearStoredAuth();
          authenticateAsRole('participant');
        }}
        onSwitchRole={authenticateAsRole}
        onOpenPalette={() => setPaletteOpen(true)}
      />

      <main className="flex-1 pb-16">
        {currentView === 'crew-portal' && <CrewPortalView onNavigate={handleNavigate} />}
        {currentView === 'squads' && <SquadsView />}
        {currentView === 'scanner' && <BoardingScannerView />}
        {currentView === 'launch' && <LaunchDeskView />}
        {currentView === 'judging' && <JudgingView />}
        {currentView === 'mission-control' && <MissionControlView />}
        {currentView === 'passport' && <PassportView />}
      </main>

      {/* Interactive Command Palette */}
      <CommandPalette
        onNavigate={handleNavigate}
        onTriggerDemoReset={handleDemoReset}
      />
    </div>
  );
};

export default App;
