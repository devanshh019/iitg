import React, { useState, useEffect } from 'react';
import { Shield, UserPlus, Sparkles, Lock, Unlock, ArrowRight, RefreshCw, Users, UserCheck } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { apiFetch } from '../api/client';

interface SquadsViewProps {
  eventId?: string;
}

export const SquadsView: React.FC<SquadsViewProps> = ({ eventId = 'apollo-24' }) => {
  const [missionId, setMissionId] = useState<string>('');
  const [squads, setSquads] = useState<any[]>([]);
  const [finderSuggestions, setFinderSuggestions] = useState<any[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);

  // Form states
  const [squadName, setSquadName] = useState('');
  const [squadTagline, setSquadTagline] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadSquads();
  }, [eventId]);

  const loadSquads = async () => {
    try {
      setLoading(true);
      const ev = await apiFetch(`/events/by-slug/${eventId}`);
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
        body: JSON.stringify({ name: squadName, tagline: squadTagline, track: 'Systems & AI' })
      });
      setCreateModalOpen(false);
      setSquadName('');
      setSquadTagline('');
      loadSquads();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to assemble squad.');
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
      setErrorMsg(err.message || 'Failed to join squad.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cyan-400" />
            <h1 className="text-2xl font-bold font-mono text-white tracking-tight">Squad Command Hangar</h1>
          </div>
          <p className="text-xs font-mono text-slate-400 mt-1">Form or join mission squads (max 4 crew members per squad).</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setJoinModalOpen(true)} className="gap-2">
            <UserPlus className="w-4 h-4" />
            <span>Join by Code</span>
          </Button>
          <Button variant="primary" size="sm" onClick={() => { setCreateModalOpen(true); handleGenerateName(); }} className="gap-2">
            <Sparkles className="w-4 h-4" />
            <span>Assemble Squad</span>
          </Button>
        </div>
      </div>

      {/* Squad Finder Recommendations for Solo Crew */}
      {finderSuggestions.length > 0 && (
        <Card glow="cyan" className="bg-gradient-to-r from-space-900 via-space-900 to-cyan-950/20 border-cyan-500/30">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="font-mono font-bold text-sm text-cyan-400 uppercase tracking-wider">
              Squad Finder Recommendations (Skill Gap Matching)
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {finderSuggestions.map((sug, idx) => (
              <div key={idx} className="p-3 bg-space-950 border border-space-800 rounded-xl flex flex-col justify-between">
                <div>
                  <h4 className="font-mono font-bold text-white text-sm">{sug.name}</h4>
                  <p className="text-xs text-slate-400 mt-1">{sug.match_reason}</p>
                </div>
                <div className="flex items-center justify-between mt-3 pt-2 border-t border-space-850">
                  <span className="text-[11px] font-mono text-cyan-400">{sug.join_code}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-[10px] py-1 px-2"
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {squads.map((sq) => (
          <Card key={sq.id} className="flex flex-col justify-between hover:border-space-700 transition-colors">
            <div>
              <div className="flex items-center justify-between mb-2">
                <Badge variant={sq.is_locked ? 'amber' : 'emerald'} size="sm">
                  {sq.is_locked ? 'LOCKED' : 'OPEN ROSTER'}
                </Badge>
                <span className="text-xs font-mono text-slate-500">{sq.members?.length || 0}/4 Crew</span>
              </div>

              <h3 className="text-lg font-bold font-mono text-white tracking-tight">{sq.name}</h3>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{sq.tagline || 'Autonomous mission module.'}</p>

              {/* Members */}
              <div className="mt-4 space-y-1.5 border-t border-space-850 pt-3">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block">Crew Roster:</span>
                {sq.members && sq.members.length > 0 ? (
                  sq.members.map((m: any, mIdx: number) => (
                    <div key={mIdx} className="flex items-center justify-between text-xs py-1">
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-200">{m.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-cyan-400">{m.role}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-slate-500 italic">No crew aboard yet.</span>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-space-800 flex items-center justify-between">
              <span className="text-xs font-mono text-amber-400 font-bold tracking-wider">{sq.join_code}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(sq.join_code);
                  alert(`Copied join code: ${sq.join_code}`);
                }}
                className="text-[11px] text-slate-400 hover:text-white"
              >
                Copy Code
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Assemble Squad Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} title="Assemble New Squad">
        <form onSubmit={handleCreateSquad} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-950/60 border border-rose-500/40 text-rose-300 rounded-lg text-xs font-mono">
              {errorMsg}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-mono text-slate-300">Squad Name</label>
              <button
                type="button"
                onClick={handleGenerateName}
                className="text-[11px] font-mono text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                Randomize
              </button>
            </div>
            <input
              type="text"
              required
              value={squadName}
              onChange={(e) => setSquadName(e.target.value)}
              className="w-full bg-space-950 border border-space-800 rounded-lg p-2.5 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-xs font-mono text-slate-300 block mb-1">Mission Tagline</label>
            <input
              type="text"
              value={squadTagline}
              onChange={(e) => setSquadTagline(e.target.value)}
              className="w-full bg-space-950 border border-space-800 rounded-lg p-2.5 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" type="button" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={loading}>
              Assemble Squad
            </Button>
          </div>
        </form>
      </Modal>

      {/* Join Squad Modal */}
      <Modal isOpen={joinModalOpen} onClose={() => setJoinModalOpen(false)} title="Join Squad by Code">
        <form onSubmit={handleJoinSquad} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-950/60 border border-rose-500/40 text-rose-300 rounded-lg text-xs font-mono">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="text-xs font-mono text-slate-300 block mb-1">Squad Join Code (e.g. SQ-AB12CD)</label>
            <input
              type="text"
              required
              placeholder="SQ-XXXXXX"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="w-full bg-space-950 border border-space-800 rounded-lg p-3 text-base text-amber-400 font-mono tracking-widest text-center focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" type="button" onClick={() => setJoinModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" isLoading={loading}>
              Board Squad
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
