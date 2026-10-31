import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, Plus, Sparkles, Trophy, Shield, Globe, Mail, Users,
  CheckCircle2, Lock, Unlock, Rocket, AlertTriangle, ArrowRight, X,
  ExternalLink, Layers, Clock, Settings, ChevronRight
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { apiFetch } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useEvent } from '../context/EventContext';
import { ArenaCommandCenter } from './ArenaCommandCenter';

interface OrganizationPortalViewProps {
  onNavigate: (view: string) => void;
}

export const OrganizationPortalView: React.FC<OrganizationPortalViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { refreshEvents, selectEvent } = useEvent();

  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<any | null>(null);
  const [orgDetail, setOrgDetail] = useState<any | null>(null);
  const [managedArena, setManagedArena] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showRegisterOrgModal, setShowRegisterOrgModal] = useState(false);
  const [showHostArenaModal, setShowHostArenaModal] = useState(false);

  // Register Org Form
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [orgCategory, setOrgCategory] = useState('university');
  const [orgWebsite, setOrgWebsite] = useState('');
  const [orgEmail, setOrgEmail] = useState('');
  const [orgDescription, setOrgDescription] = useState('');
  const [submittingOrg, setSubmittingOrg] = useState(false);

  // Host Arena Form
  const [arenaTitle, setArenaTitle] = useState('');
  const [arenaSlug, setArenaSlug] = useState('');
  const [arenaDescription, setArenaDescription] = useState('');
  const [arenaMode, setArenaMode] = useState('In-Person');
  const [arenaAddress, setArenaAddress] = useState('');
  const [arenaPrizePool, setArenaPrizePool] = useState('₹5,00,000 INR');
  const [arenaHours, setArenaHours] = useState('24');
  const [ps1Title, setPs1Title] = useState('');
  const [ps1Track, setPs1Track] = useState('AI & Machine Learning');
  const [ps1Desc, setPs1Desc] = useState('');
  const [submittingArena, setSubmittingArena] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const list = await apiFetch<any[]>('/organizations');
      setOrganizations(list || []);

      if (list && list.length > 0) {
        const defaultOrg = list[0];
        setSelectedOrg(defaultOrg);
        loadOrgDetail(defaultOrg.id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadOrgDetail = async (orgId: string) => {
    try {
      const detail = await apiFetch<any>(`/organizations/${orgId}`);
      setOrgDetail(detail);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectOrg = (org: any) => {
    setSelectedOrg(org);
    loadOrgDetail(org.id);
  };

  const handleRegisterOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName || !orgSlug) return;
    try {
      setSubmittingOrg(true);
      const newOrg = await apiFetch<any>('/organizations', {
        method: 'POST',
        body: JSON.stringify({
          name: orgName,
          slug: orgSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          category: orgCategory,
          website: orgWebsite || undefined,
          contact_email: orgEmail || undefined,
          description: orgDescription || undefined
        })
      });

      setShowRegisterOrgModal(false);
      setOrgName('');
      setOrgSlug('');
      setOrgDescription('');
      setActionMsg(`Organization "${newOrg.name}" registered successfully!`);
      await loadOrganizations();
      setSelectedOrg(newOrg);
      loadOrgDetail(newOrg.id);
      setTimeout(() => setActionMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to register organization');
    } finally {
      setSubmittingOrg(false);
    }
  };

  const handleHostArena = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg || !arenaTitle || !arenaSlug) return;
    try {
      setSubmittingArena(true);
      const now = new Date();
      const startsAt = new Date(now.getTime() + 1000 * 60 * 15); // Starts in 15 mins
      const durationHours = parseInt(arenaHours) || 24;
      const endsAt = new Date(startsAt.getTime() + 1000 * 60 * 60 * durationHours);
      const deadline = new Date(endsAt.getTime() - 1000 * 60 * 60 * 2);

      const problemStatements = [];
      if (ps1Title) {
        problemStatements.push({
          title: ps1Title,
          track: ps1Track,
          description: ps1Desc || 'Design and deploy a working solution fulfilling the rubric requirements.',
          requirements: ['Functional prototype deployed on cloud', 'Code repository with documentation', 'Demo video / slide deck'],
          rules: 'Open-source foundation models and APIs allowed with attribution.'
        });
      }

      const res = await apiFetch<any>(`/organizations/${selectedOrg.id}/events`, {
        method: 'POST',
        body: JSON.stringify({
          title: arenaTitle,
          slug: arenaSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          description: arenaDescription,
          format_type: 'offline_24h',
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
          submission_deadline: deadline.toISOString(),
          grace_period_minutes: 20,
          status: 'published',
          format_config: {
            prize_pool: arenaPrizePool,
            venue_type: arenaMode,
            mode: arenaMode,
            address: arenaAddress || 'Campus Innovation Center',
            tags: ['Engineering', ps1Track, 'Hackathon'],
            sponsors: [
              { name: 'Google Cloud', tier: 'Title Partner', perk: '$500 Cloud Credits' },
              { name: 'GitHub', tier: 'Developer Platform', perk: 'GitHub Student Pack' }
            ],
            prize_breakdown: [
              { place: '1st Place Champion', amount: arenaPrizePool, perk: 'Incubation Fast-track + Grant' }
            ]
          },
          problem_statements: problemStatements
        })
      });

      setShowHostArenaModal(false);
      setArenaTitle('');
      setArenaSlug('');
      setArenaDescription('');
      setPs1Title('');
      setPs1Desc('');
      setActionMsg(`Arena "${arenaTitle}" successfully hosted and listed in directory!`);
      await loadOrgDetail(selectedOrg.id);
      await refreshEvents();
      setTimeout(() => setActionMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to host arena');
    } finally {
      setSubmittingArena(false);
    }
  };

  const handleToggleSubmissions = async (event: any) => {
    if (!selectedOrg) return;
    try {
      const newLockState = !event.is_submissions_locked;
      await apiFetch<any>(`/organizations/${selectedOrg.id}/events/${event.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          is_submissions_locked: newLockState
        })
      });
      setActionMsg(`Submissions ${newLockState ? 'Locked' : 'Unlocked'} for ${event.title}`);
      await loadOrgDetail(selectedOrg.id);
      await refreshEvents();
      setTimeout(() => setActionMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to toggle submissions lock');
    }
  };

  const handleUnsealAllPS = async (event: any) => {
    if (!selectedOrg) return;
    try {
      await apiFetch<any>(`/organizations/${selectedOrg.id}/events/${event.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          unseal_all_ps: true,
          status: 'ongoing'
        })
      });
      setActionMsg(`Problem Statements unsealed & kicked off for ${event.title}!`);
      await loadOrgDetail(selectedOrg.id);
      await refreshEvents();
      setTimeout(() => setActionMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to unseal problem statements');
    }
  };

  if (managedArena) {
    return (
      <ArenaCommandCenter
        arena={managedArena}
        organization={selectedOrg}
        onBack={() => {
          setManagedArena(null);
          if (selectedOrg) loadOrgDetail(selectedOrg.id);
        }}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-black animate-fadeIn">
      {/* Top Banner with Apple Mode Switcher */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-black/[0.08] shadow-apple-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-black bg-neutral-100 px-2.5 py-0.5 rounded-full border border-neutral-200">
                Organization Operations
              </span>
              <span className="text-neutral-300">•</span>
              <span className="text-xs text-neutral-500 font-medium">HackOS Mission Control</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black">
              Host & Manage Hackathon Arenas
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1.5 max-w-xl leading-relaxed">
              Register your university council or tech foundation, curate real-world problem statements, configure corporate sponsor grants, and monitor submissions in real-time.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('org-command')}
              className="rounded-xl text-xs py-2 cursor-pointer"
            >
              <span>Live Command Center</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowRegisterOrgModal(true)}
              className="gap-1.5 rounded-xl text-xs py-2 bg-black text-white hover:bg-neutral-800 cursor-pointer active:scale-95 transition-transform"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register New Organization</span>
            </Button>
          </div>
        </div>

        {/* Action Confirmation Banner */}
        {actionMsg && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3.5 bg-neutral-900 text-white rounded-2xl text-xs font-semibold flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionMsg}</span>
          </motion.div>
        )}

        {/* Organization Selector Tabs */}
        {organizations.length > 0 && (
          <div className="flex items-center gap-2 mt-6 pt-6 border-t border-black/[0.06] overflow-x-auto pb-1">
            <span className="text-xs font-bold text-neutral-400 mr-2 shrink-0">Active Organization:</span>
            {organizations.map(org => {
              const isSelected = selectedOrg?.id === org.id;
              return (
                <button
                  key={org.id}
                  onClick={() => handleSelectOrg(org)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer select-none shrink-0 ${
                    isSelected
                      ? 'bg-black text-white shadow-sm'
                      : 'bg-neutral-100 text-neutral-600 hover:text-black hover:bg-neutral-200'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{org.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-200 text-neutral-600'}`}>
                    {org.events_count} arenas
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Organization Profile & Management Card */}
      {selectedOrg && orgDetail && (
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-black/[0.08] shadow-apple-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-black/[0.06]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-black text-white px-2.5 py-0.5 rounded-full">
                  {selectedOrg.category?.toUpperCase() || 'HOST ORG'}
                </span>
                <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Verified Organization
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-black tracking-tight">
                {selectedOrg.name}
              </h2>
              <p className="text-xs text-neutral-500 mt-1 max-w-xl">
                {selectedOrg.description || 'Verified host organization orchestrating student innovation arenas.'}
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowHostArenaModal(true)}
              className="gap-2 rounded-xl text-xs py-2 px-4 bg-black text-white hover:bg-neutral-800 cursor-pointer active:scale-95 transition-transform shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Host New Arena</span>
            </Button>
          </div>

          {/* Hosted Arenas List */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-black flex items-center gap-2">
                <Layers className="w-4 h-4 text-black" />
                Hosted Arenas & Hackathons ({orgDetail.events?.length || 0})
              </h3>
            </div>

            {(!orgDetail.events || orgDetail.events.length === 0) ? (
              <div className="p-12 text-center bg-neutral-50 rounded-2xl border border-neutral-200 text-neutral-500 text-xs">
                No hackathons hosted under this organization yet. Click "Host New Arena" above to create your first event!
              </div>
            ) : (
              <div className="space-y-4">
                {orgDetail.events.map((ev: any) => (
                  <div
                    key={ev.id}
                    className="p-5 bg-neutral-50 hover:bg-white border border-neutral-200 rounded-2xl transition-all duration-200 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                            ev.status === 'ongoing' ? 'bg-black text-white border-black' : 'bg-neutral-200 text-neutral-800 border-neutral-300'
                          }`}>
                            {ev.status === 'ongoing' ? '🔥 Live Now' : ev.status?.toUpperCase()}
                          </span>
                          <span className="text-xs text-neutral-400 font-mono">/{ev.slug}</span>
                        </div>
                        <h4 className="text-base font-bold text-black">{ev.title}</h4>
                      </div>

                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleSubmissions(ev)}
                          className="gap-1.5 rounded-xl text-xs py-1.5 cursor-pointer"
                        >
                          {ev.is_submissions_locked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          <span>{ev.is_submissions_locked ? 'Unlock Submissions' : 'Lock Submissions'}</span>
                        </Button>

                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleUnsealAllPS(ev)}
                          className="gap-1.5 rounded-xl text-xs py-1.5 bg-black text-white hover:bg-neutral-800 cursor-pointer"
                        >
                          <Rocket className="w-3.5 h-3.5" />
                          <span>Unseal Problem Statements</span>
                        </Button>
                      </div>
                    </div>

                    {/* Operational Metrics */}
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-3 border-t border-neutral-200 text-center text-xs">
                      <div className="p-2.5 bg-white rounded-xl border border-neutral-200">
                        <div className="text-[10px] font-bold uppercase text-neutral-400">Participants</div>
                        <div className="font-mono font-bold text-sm text-black mt-0.5">{ev.participants_count || 0}</div>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-neutral-200">
                        <div className="text-[10px] font-bold uppercase text-neutral-400">Squads Formed</div>
                        <div className="font-mono font-bold text-sm text-black mt-0.5">{ev.squads_count || 0}</div>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-neutral-200">
                        <div className="text-[10px] font-bold uppercase text-neutral-400">Submissions</div>
                        <div className="font-mono font-bold text-sm text-black mt-0.5">{ev.submissions_count || 0}</div>
                      </div>
                      <div className="p-2.5 bg-white rounded-xl border border-neutral-200 col-span-3 sm:col-span-1">
                        <div className="text-[10px] font-bold uppercase text-neutral-400">Prize Pool</div>
                        <div className="font-mono font-bold text-sm text-black mt-0.5">{ev.format_config?.prize_pool || 'Standard'}</div>
                      </div>
                    </div>

                    {/* Operations Action Bar */}
                    <div className="pt-3 border-t border-neutral-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <span className="text-[11px] text-neutral-500">
                        Live Operations: QR Check-in, Squad Controls, Round Progression & Judge Monitor
                      </span>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => {
                          selectEvent(ev);
                          setManagedArena(ev);
                        }}
                        className="gap-2 rounded-xl text-xs py-1.5 px-4 bg-black text-white hover:bg-neutral-800 cursor-pointer active:scale-95 transition-transform shrink-0"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        <span>Manage Arena Command Center</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal 1: Register Organization */}
      <AnimatePresence>
        {showRegisterOrgModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRegisterOrgModal(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-md cursor-pointer"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="bg-white rounded-3xl border border-black/[0.08] shadow-2xl max-w-lg w-full relative z-10 overflow-hidden"
            >
              <div className="p-6 border-b border-black/[0.06] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-black">Register Host Organization</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">Create your organization profile to host and manage hackathons.</p>
                </div>
                <button
                  onClick={() => setShowRegisterOrgModal(false)}
                  className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRegisterOrg} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Organization Name *</label>
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => {
                      setOrgName(e.target.value);
                      if (!orgSlug) setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                    }}
                    placeholder="e.g. Stanford AI Collective or Apollo Aerospace"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-sm text-black focus:outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">URL Identifier (Slug) *</label>
                  <input
                    type="text"
                    required
                    value={orgSlug}
                    onChange={(e) => setOrgSlug(e.target.value)}
                    placeholder="e.g. stanford-ai"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-sm text-black font-mono focus:outline-none focus:border-black"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-neutral-700 block mb-1">Category</label>
                    <select
                      value={orgCategory}
                      onChange={(e) => setOrgCategory(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-xs text-black focus:outline-none focus:border-black"
                    >
                      <option value="university">University Tech Council</option>
                      <option value="enterprise">Tech Enterprise</option>
                      <option value="foundation">Decentralized Foundation / DAO</option>
                      <option value="community">Developer Community</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-neutral-700 block mb-1">Official Website</label>
                    <input
                      type="url"
                      value={orgWebsite}
                      onChange={(e) => setOrgWebsite(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-xs text-black focus:outline-none focus:border-black font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Mission / Description</label>
                  <textarea
                    rows={3}
                    value={orgDescription}
                    onChange={(e) => setOrgDescription(e.target.value)}
                    placeholder="Briefly state your organization's mission and engineering tracks..."
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-xs text-black focus:outline-none focus:border-black"
                  />
                </div>

                <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2.5">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => setShowRegisterOrgModal(false)}
                    className="rounded-xl text-xs py-2 cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    disabled={submittingOrg}
                    className="rounded-xl text-xs py-2 px-5 bg-black text-white hover:bg-neutral-800 cursor-pointer"
                  >
                    {submittingOrg ? 'Registering...' : 'Register Organization'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 2: Host New Hackathon Arena */}
      <AnimatePresence>
        {showHostArenaModal && selectedOrg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHostArenaModal(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-md cursor-pointer"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ type: 'spring', damping: 28, stiffness: 350 }}
              className="bg-white rounded-3xl border border-black/[0.08] shadow-2xl max-w-xl w-full relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-black/[0.06] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-black">Host New Hackathon Arena</h3>
                  <p className="text-xs text-neutral-500 mt-0.5">Orchestrated under {selectedOrg.name}</p>
                </div>
                <button
                  onClick={() => setShowHostArenaModal(false)}
                  className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleHostArena} className="p-6 overflow-y-auto space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Arena Title *</label>
                  <input
                    type="text"
                    required
                    value={arenaTitle}
                    onChange={(e) => {
                      setArenaTitle(e.target.value);
                      if (!arenaSlug) setArenaSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                    }}
                    placeholder="e.g. National Autonomous Robotics Challenge 2026"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-sm text-black focus:outline-none focus:border-black"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-neutral-700 block mb-1">Arena Slug *</label>
                    <input
                      type="text"
                      required
                      value={arenaSlug}
                      onChange={(e) => setArenaSlug(e.target.value)}
                      placeholder="e.g. robotics-2026"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-xs text-black font-mono focus:outline-none focus:border-black"
                    />
                  </div>

                  <div>
                    <label className="font-semibold text-neutral-700 block mb-1">Grand Prize Pool *</label>
                    <input
                      type="text"
                      required
                      value={arenaPrizePool}
                      onChange={(e) => setArenaPrizePool(e.target.value)}
                      placeholder="e.g. ₹5,00,000 INR or $50,000"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-xs text-black focus:outline-none focus:border-black font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-neutral-700 block mb-1">Mode / Format</label>
                    <select
                      value={arenaMode}
                      onChange={(e) => setArenaMode(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-xs text-black focus:outline-none focus:border-black"
                    >
                      <option value="In-Person Campus">In-Person Campus</option>
                      <option value="Hybrid (In-Person + Matrix)">Hybrid (In-Person + Matrix)</option>
                      <option value="100% Virtual / Global">100% Virtual / Global</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-neutral-700 block mb-1">Duration (Hours)</label>
                    <select
                      value={arenaHours}
                      onChange={(e) => setArenaHours(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-xs text-black focus:outline-none focus:border-black font-mono"
                    >
                      <option value="24">24 Hours</option>
                      <option value="36">36 Hours</option>
                      <option value="48">48 Hours</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Physical Address / Matrix Hub</label>
                  <input
                    type="text"
                    value={arenaAddress}
                    onChange={(e) => setArenaAddress(e.target.value)}
                    placeholder="e.g. Innovation Complex, Main Auditorium & Discord Matrix"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-xs text-black focus:outline-none focus:border-black"
                  />
                </div>

                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Arena Briefing & Overview</label>
                  <textarea
                    rows={2}
                    value={arenaDescription}
                    onChange={(e) => setArenaDescription(e.target.value)}
                    placeholder="Describe the mission goals, technology stacks, and target hacker personas..."
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-xs text-black focus:outline-none focus:border-black"
                  />
                </div>

                {/* Primary Problem Statement */}
                <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500 block">
                    Initial Track & Problem Statement
                  </span>
                  <input
                    type="text"
                    value={ps1Title}
                    onChange={(e) => setPs1Title(e.target.value)}
                    placeholder="Problem Statement Title (e.g. Autonomous Drone Swarm Fleet Management)"
                    className="w-full bg-white border border-neutral-200 rounded-xl p-2 text-xs text-black font-semibold focus:outline-none focus:border-black"
                  />
                  <input
                    type="text"
                    value={ps1Track}
                    onChange={(e) => setPs1Track(e.target.value)}
                    placeholder="Track Name (e.g. Robotics & Vision, AI, Systems)"
                    className="w-full bg-white border border-neutral-200 rounded-xl p-2 text-xs text-black focus:outline-none focus:border-black"
                  />
                </div>

                <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2.5">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => setShowHostArenaModal(false)}
                    className="rounded-xl text-xs py-2 cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    disabled={submittingArena}
                    className="rounded-xl text-xs py-2 px-5 bg-black text-white hover:bg-neutral-800 cursor-pointer"
                  >
                    {submittingArena ? 'Publishing...' : 'Publish Hackathon Arena'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
