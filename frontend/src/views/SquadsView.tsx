import React, { useState, useEffect } from 'react';
import { Shield, UserPlus, Sparkles, RefreshCw, Users, Copy, Check, Plus } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { apiFetch } from '../api/client';
import { useEvent } from '../context/EventContext';

interface SquadsViewProps {
  eventId?: string;
}

export const SquadsView: React.FC<SquadsViewProps> = ({ eventId: propEventId }) => {
  const { currentEvent } = useEvent();
  const targetEventSlug = propEventId || currentEvent?.slug || 'iitg-hacksprint-2026';

  const [missionId, setMissionId] = useState<string>('');
  const [squads, setSquads] = useState<any[]>([]);
  const [finderSuggestions, setFinderSuggestions] = useState<any[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form states
  const [squadName, setSquadName] = useState('');
  const [squadTagline, setSquadTagline] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadSquads();
  }, [targetEventSlug]);

  const loadSquads = async () => {
    try {
      setLoading(true);
      const ev = await apiFetch<any>(`/events/by-slug/${targetEventSlug}`);
      setMissionId(ev.id);

      const list = await apiFetch(`/events/${ev.id}/teams`);
      setSquads(list);

      const suggestions = await apiFetch(`/events/${ev.id}/teams/squad-finder`);
      setFinderSuggestions(suggestions);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateName = async () => {
    if (!missionId) return;
    try {
      const gen = await apiFetch(`/events/${missionId}/teams/generate-name`);
      setSquadName(gen.name);
      setSquadTagline(gen.tagline);
    } catch (e) {}
  };

  const handleCreateSquad = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      setLoading(true);
      await apiFetch(`/events/${missionId}/teams`, {
        method: 'POST',
        body: JSON.stringify({ name: squadName, tagline: squadTagline, track: 'AI & Telemetry' })
      });
      setCreateModalOpen(false);
      setSquadName('');
      setSquadTagline('');
      loadSquads();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create team.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSquad = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      setLoading(true);
      await apiFetch(`/events/${missionId}/teams/join`, {
        method: 'POST',
        body: JSON.stringify({ join_code: joinCode.trim() })
      });
      setJoinModalOpen(false);
      setJoinCode('');
      loadSquads();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to join team.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-stone-200/90 shadow-soft">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-maroon-700" />
            <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">Teams (Squads)</h1>
          </div>
          <p className="text-xs sm:text-sm text-stone-500">
            Hackathons are best with friends. Form a squad of up to 4 members or join with a code.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setJoinModalOpen(true)} className="gap-1.5 text-xs">
            <UserPlus className="w-4 h-4 text-maroon-700" />
            <span>Join with Code</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => { setCreateModalOpen(true); handleGenerateName(); }}
            className="gap-1.5 shadow-sm text-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create Team</span>
          </Button>
        </div>
      </div>

      {/* Squad Finder Recommendations for Solo Hackers */}
      {finderSuggestions.length > 0 && (
        <Card className="bg-gradient-to-r from-maroon-50/50 via-white to-stone-50 border-maroon-200/80 shadow-soft">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-maroon-700" />
            <h3 className="font-bold text-sm text-maroon-900 uppercase tracking-wide">
              Looking for Teammates? (Recommended Matches)
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {finderSuggestions.map((sug, idx) => (
              <div key={idx} className="p-3.5 bg-white border border-stone-200/90 rounded-2xl shadow-sm flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-stone-900 text-sm">{sug.name}</h4>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">{sug.match_reason}</p>
                </div>
                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-stone-100">
                  <span className="text-xs font-mono font-bold text-maroon-700">{sug.join_code}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs py-1 px-3"
                    onClick={() => {
                      setJoinCode(sug.join_code);
                      setJoinModalOpen(true);
                    }}
                  >
                    Join
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Roster of Squads */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {squads.map((sq) => (
          <Card key={sq.id} className="flex flex-col justify-between hover:border-maroon-300 transition-all bg-white rounded-3xl">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Badge variant={sq.is_locked ? 'amber' : 'emerald'} size="sm">
                  {sq.is_locked ? 'ROSTER LOCKED' : 'OPEN TEAM'}
                </Badge>
                <span className="text-xs font-medium text-stone-400">
                  {sq.members?.length || 0} / 4 Members
                </span>
              </div>

              <h3 className="text-base font-bold text-stone-900 tracking-tight">{sq.name}</h3>
              <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                {sq.tagline || 'Working together on innovative project.'}
              </p>

              {/* Members */}
              <div className="mt-4 space-y-1.5 border-t border-stone-100 pt-3">
                <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400 block">
                  Team Members:
                </span>
                {sq.members && sq.members.length > 0 ? (
                  sq.members.map((m: any, mIdx: number) => (
                    <div key={mIdx} className="flex items-center justify-between text-xs py-1">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-maroon-600" />
                        <span className="text-stone-800 font-medium">{m.name}</span>
                      </div>
                      <span className="text-[10px] font-medium text-maroon-800 bg-maroon-50 px-2 py-0.5 rounded-full">
                        {m.role}
                      </span>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-stone-400 italic">No members joined yet.</span>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-stone-400 block font-medium">INVITE CODE</span>
                <span className="text-xs font-mono font-bold text-maroon-800 tracking-wider">
                  {sq.join_code}
                </span>
              </div>
              <button
                onClick={() => handleCopy(sq.join_code)}
                className="text-xs text-stone-600 hover:text-maroon-800 flex items-center gap-1 font-semibold px-2.5 py-1 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
              >
                {copiedCode === sq.join_code ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Create Team Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Create a New Team">
        <form onSubmit={handleCreateSquad} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
              {errorMsg}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider">Team Name</label>
              <button
                type="button"
                onClick={handleGenerateName}
                className="text-xs text-maroon-700 hover:text-maroon-900 flex items-center gap-1 cursor-pointer font-medium"
              >
                <RefreshCw className="w-3 h-3" />
                Suggest Fun Name
              </button>
            </div>
            <input
              type="text"
              required
              value={squadName}
              onChange={(e) => setSquadName(e.target.value)}
              placeholder="e.g. Lunar Hackers"
              className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-maroon-500/20 focus:border-maroon-600"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider block mb-1.5">Team Tagline</label>
            <input
              type="text"
              value={squadTagline}
              onChange={(e) => setSquadTagline(e.target.value)}
              placeholder="e.g. Building zero-latency telemetry models"
              className="w-full bg-stone-50 border border-stone-200 rounded-xl p-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-maroon-500/20 focus:border-maroon-600"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" type="button" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={loading}>
              Create Team
            </Button>
          </div>
        </form>
      </Modal>

      {/* Join Team Modal */}
      <Modal isOpen={joinModalOpen} onClose={() => setJoinModalOpen(false)} title="Join Team with Invite Code">
        <form onSubmit={handleJoinSquad} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-stone-700 uppercase tracking-wider block mb-1.5">
              Enter 6-Character Squad Code (e.g. SQ-AB12)
            </label>
            <input
              type="text"
              required
              placeholder="SQ-XXXXXX"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-base text-maroon-800 font-mono font-bold tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-maroon-500/20 focus:border-maroon-600"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" type="button" onClick={() => setJoinModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={loading}>
              Join Team
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
