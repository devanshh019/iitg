import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, User, ArrowRight, CheckCircle2, AlertCircle, Users, Plus, Shield, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { apiFetch } from '../api/client';

interface LoginPageProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess, onCancel }) => {
  const { login, register, isAuthenticated, user } = useAuth();
  
  // Multi-step flow: 'account' -> 'event' -> 'team'
  const [step, setStep] = useState<'account' | 'event' | 'team'>('account');
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  
  // Credentials
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Team creation / join
  const [teamOption, setTeamOption] = useState<'none' | 'create' | 'join'>('none');
  const [teamName, setTeamName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  // Status
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Step 1: Submit Credentials
  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email) {
      setErrorMsg('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        await login(email, password);
        setSuccessMsg('Signed in successfully.');
        try {
          const me = await apiFetch('/auth/me');
          if (me.is_super_admin || me.roles?.some((r: any) => ['organizer', 'judge', 'volunteer'].includes(r.role))) {
            onSuccess?.();
            return;
          }
          if (me.participant?.squad_id) {
            onSuccess?.();
            return;
          }
        } catch (_) {}
        setStep('event');
      } else {
        await register(email, password, name);
        setSuccessMsg('Account created successfully.');
        setStep('event');
      }
    } catch (err: any) {
      const msg = err.message || '';
      if (msg.includes('already exists') || msg.includes('400')) {
        setErrorMsg('Duplicate account detected. This email is already registered. Please switch to Sign In.');
      } else {
        setErrorMsg(msg || 'Authentication failed. Please verify credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Event Confirmation
  const handleEventConfirm = () => {
    setStep('team');
  };

  // Step 3: Team Action
  const handleTeamAction = async () => {
    if (teamOption === 'create') {
      if (!teamName.trim()) {
        setErrorMsg('Please enter a team name');
        return;
      }
      setLoading(true);
      try {
        const ev = await apiFetch('/events/by-slug/apollo-24');
        await apiFetch(`/events/${ev.id}/teams`, {
          method: 'POST',
          body: JSON.stringify({ name: teamName.trim(), tagline: 'WhyCode4U Hacker Team', track: 'General' })
        });
        setSuccessMsg('Team formed successfully!');
        setTimeout(() => onSuccess?.(), 400);
      } catch (err: any) {
        setErrorMsg(err.message || 'Team creation note: You can create your team on the dashboard.');
        setTimeout(() => onSuccess?.(), 800);
      } finally {
        setLoading(false);
      }
    } else if (teamOption === 'join') {
      if (!joinCode.trim()) {
        setErrorMsg('Please enter a team join code');
        return;
      }
      setLoading(true);
      try {
        const ev = await apiFetch('/events/by-slug/apollo-24');
        await apiFetch(`/events/${ev.id}/teams/join`, {
          method: 'POST',
          body: JSON.stringify({ join_code: joinCode.trim().toUpperCase() })
        });
        setSuccessMsg('Joined team successfully!');
        setTimeout(() => onSuccess?.(), 400);
      } catch (err: any) {
        setErrorMsg(err.message || 'Could not join team with this code.');
      } finally {
        setLoading(false);
      }
    } else {
      // Solo / Skip
      onSuccess?.();
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFD] flex flex-col justify-center items-center px-4 py-8 text-black">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-black text-white shadow-apple-card mb-3">
            <span className="font-bold text-lg tracking-tight">W4U</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black">
            WhyCode<span className="text-neutral-500">4U</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            Production Hackathon Platform
          </p>
        </div>

        {/* Multi-step progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`h-1.5 rounded-full transition-all duration-200 ${step === 'account' ? 'w-8 bg-black' : 'w-4 bg-neutral-300'}`} />
          <div className={`h-1.5 rounded-full transition-all duration-200 ${step === 'event' ? 'w-8 bg-black' : 'w-4 bg-neutral-300'}`} />
          <div className={`h-1.5 rounded-full transition-all duration-200 ${step === 'team' ? 'w-8 bg-black' : 'w-4 bg-neutral-300'}`} />
        </div>

        {/* Card Body */}
        <div className="bg-white rounded-3xl shadow-apple-card border border-black/[0.08] p-6 sm:p-8">
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-2xl bg-neutral-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-5 p-3.5 rounded-2xl bg-neutral-50 border border-neutral-300 flex items-start gap-2.5 text-xs text-black">
              <CheckCircle2 className="w-4 h-4 text-black mt-0.5 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* STEP 1: Account Login / Register */}
          {step === 'account' && (
            <div>
              {/* Mode Toggle */}
              <div className="bg-neutral-100 p-1 rounded-2xl flex items-center justify-between mb-5">
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setErrorMsg(null); }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                    mode === 'signin' ? 'bg-black text-white shadow-sm' : 'text-neutral-600 hover:text-black'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('register'); setErrorMsg(null); }}
                  className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                    mode === 'register' ? 'bg-black text-white shadow-sm' : 'text-neutral-600 hover:text-black'
                  }`}
                >
                  New Hacker Registration
                </button>
              </div>

              <form onSubmit={handleAccountSubmit} className="space-y-4">
                {mode === 'register' && (
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                      Your Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Alex Morgan"
                        required={mode === 'register'}
                        className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-black text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-colors"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      required
                      className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-black text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-black text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-colors font-mono"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full justify-center bg-black hover:bg-neutral-800 text-white font-semibold py-3 shadow-apple-sm rounded-xl"
                  >
                    {loading ? (
                      <span>Verifying...</span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <span>Continue</span>
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 2: Hackathon Name & Entry */}
          {step === 'event' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-black text-white px-2.5 py-0.5 rounded-full inline-block mb-2">
                  Active Hackathon
                </span>
                <h2 className="text-xl font-bold text-black tracking-tight">WhyCode4U: Apollo 24</h2>
                <p className="text-xs text-neutral-500 mt-1">24-Hour National Innovation Hackathon</p>
              </div>

              <div className="p-4 bg-neutral-50 border border-neutral-200/80 rounded-2xl text-xs space-y-2">
                <div className="flex justify-between text-neutral-700">
                  <span className="font-medium text-neutral-500">Format:</span>
                  <span className="font-semibold text-black">In-Person & Online Hybrid</span>
                </div>
                <div className="flex justify-between text-neutral-700">
                  <span className="font-medium text-neutral-500">Team Size:</span>
                  <span className="font-semibold text-black">1 to 4 Members</span>
                </div>
                <div className="flex justify-between text-neutral-700">
                  <span className="font-medium text-neutral-500">Perks:</span>
                  <span className="font-semibold text-black">Food, Swag Kit & Accommodation</span>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  variant="primary"
                  onClick={handleEventConfirm}
                  className="w-full justify-center bg-black hover:bg-neutral-800 text-white font-semibold py-3 rounded-xl shadow-apple-sm gap-2"
                >
                  <span>Team Setup / Entry</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <button
                  type="button"
                  onClick={() => onSuccess?.()}
                  className="w-full text-center text-xs text-neutral-500 hover:text-black py-1 cursor-pointer transition-colors"
                >
                  Go straight to Hacker Dashboard →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Create or Join Team */}
          {step === 'team' && (
            <div className="space-y-4 animate-fadeIn">
              <div className="text-center mb-2">
                <h2 className="text-lg font-bold text-black tracking-tight">Team Setup</h2>
                <p className="text-xs text-neutral-500">Are you building in a team or solo?</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setTeamOption('create')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    teamOption === 'create'
                      ? 'border-black bg-neutral-50 shadow-sm'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white'
                  }`}
                >
                  <Plus className="w-5 h-5 text-black mb-1.5" />
                  <div className="font-bold text-xs text-black">Create Team</div>
                  <div className="text-[10px] text-neutral-500">Get an invite code</div>
                </button>

                <button
                  type="button"
                  onClick={() => setTeamOption('join')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                    teamOption === 'join'
                      ? 'border-black bg-neutral-50 shadow-sm'
                      : 'border-neutral-200 hover:border-neutral-300 bg-white'
                  }`}
                >
                  <Users className="w-5 h-5 text-black mb-1.5" />
                  <div className="font-bold text-xs text-black">Join Team</div>
                  <div className="text-[10px] text-neutral-500">Enter friend's code</div>
                </button>
              </div>

              {teamOption === 'create' && (
                <div className="pt-2 animate-fadeIn">
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                    Choose Team Name
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. Code Ninjas"
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-black text-sm focus:outline-none focus:border-black"
                  />
                </div>
              )}

              {teamOption === 'join' && (
                <div className="pt-2 animate-fadeIn">
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                    Enter 6-Digit Team Code
                  </label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="SQ-XXXXXX"
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-black text-sm font-mono font-bold tracking-widest text-center focus:outline-none focus:border-black"
                  />
                </div>
              )}

              <div className="pt-3 space-y-2">
                <Button
                  variant="primary"
                  onClick={handleTeamAction}
                  disabled={loading}
                  className="w-full justify-center bg-black hover:bg-neutral-800 text-white font-semibold py-3 rounded-xl shadow-apple-sm"
                >
                  {loading ? 'Processing...' : teamOption === 'none' ? 'Go to Dashboard' : 'Confirm Team & Launch'}
                </Button>

                {teamOption !== 'none' && (
                  <button
                    type="button"
                    onClick={() => onSuccess?.()}
                    className="w-full text-center text-xs text-neutral-400 hover:text-black py-1 cursor-pointer transition-colors"
                  >
                    Skip team setup for now →
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
