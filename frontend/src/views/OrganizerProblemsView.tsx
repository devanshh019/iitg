import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileCode2, Plus, Sparkles, Unlock, Lock, Eye, AlertCircle,
  CheckCircle2, Clock, Check, X, Layers, Tag
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { apiFetch } from '../api/client';
import { useEvent } from '../context/EventContext';

export const OrganizerProblemsView: React.FC = () => {
  const { currentEvent, events, selectEvent } = useEvent();
  const [problemStatements, setProblemStatements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // New PS Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTrack, setNewTrack] = useState('AI & Machine Learning');
  const [newDescription, setNewDescription] = useState('');
  const [newRequirements, setNewRequirements] = useState('');
  const [newRules, setNewRules] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const activeEvent = currentEvent || events[0];

  useEffect(() => {
    if (activeEvent?.id) {
      loadProblemStatements(activeEvent.id);
    }
  }, [activeEvent?.id]);

  const loadProblemStatements = async (eventId: string) => {
    try {
      setLoading(true);
      const list = await apiFetch<any[]>(`/events/${eventId}/problem-statements`);
      setProblemStatements(list || []);
    } catch (err) {
      console.error('Failed to load problem statements', err);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  const handleToggleReveal = async (ps: any) => {
    if (!activeEvent) return;
    try {
      const updatedState = !ps.is_revealed;
      await apiFetch<any>(`/events/${activeEvent.id}/problem-statements/${ps.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_revealed: updatedState })
      });
      showNotification(`"${ps.title}" ${updatedState ? 'unsealed and revealed to hackers' : 'sealed'}`);
      loadProblemStatements(activeEvent.id);
    } catch (err: any) {
      alert(err.message || 'Failed to update problem statement');
    }
  };

  const handleCreatePS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeEvent || !newTitle.trim()) return;
    try {
      setSubmitting(true);
      const reqList = newRequirements
        .split('\n')
        .map(r => r.trim())
        .filter(Boolean);

      await apiFetch<any>(`/events/${activeEvent.id}/problem-statements`, {
        method: 'POST',
        body: JSON.stringify({
          title: newTitle.trim(),
          track: newTrack,
          description: newDescription.trim(),
          requirements: reqList.length ? reqList : ['Working deployed demo', 'Code repository with setup docs'],
          rules: newRules.trim() || 'Standard open-source foundation models and APIs allowed with attribution.',
          is_revealed: true
        })
      });

      setShowAddModal(false);
      setNewTitle('');
      setNewDescription('');
      setNewRequirements('');
      setNewRules('');
      showNotification(`Problem Statement "${newTitle}" created & listed!`);
      loadProblemStatements(activeEvent.id);
    } catch (err: any) {
      alert(err.message || 'Failed to create problem statement');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-black animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-black/[0.08] shadow-apple-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-black text-white px-2.5 py-0.5 rounded-full">
                Track Management
              </span>
              <span className="text-xs text-neutral-400 font-semibold truncate">
                Curate Challenges & Unseal Criteria
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black">
              Problem Statements & Tracks
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-xl">
              Design challenges, define evaluation criteria, and control unseal schedules for competing hackers.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {events && events.length > 1 && (
              <select
                value={activeEvent?.id}
                onChange={(e) => {
                  const ev = events.find(item => item.id === e.target.value);
                  if (ev) selectEvent(ev);
                }}
                className="text-xs bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded-xl px-3 py-2 font-semibold text-black focus:outline-none cursor-pointer"
              >
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
            )}

            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddModal(true)}
              className="gap-1.5 rounded-xl text-xs py-2 px-3.5 bg-black text-white hover:bg-neutral-800 cursor-pointer active:scale-95 transition-transform shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Problem Statement</span>
            </Button>
          </div>
        </div>

        {actionNotice && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-neutral-900 text-white rounded-2xl text-xs font-semibold flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionNotice}</span>
          </motion.div>
        )}
      </div>

      {/* List of Problem Statements */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-xs font-mono text-neutral-400">
            Loading problem statements...
          </div>
        ) : problemStatements.length === 0 ? (
          <div className="bg-white p-10 rounded-3xl border border-black/[0.08] text-center shadow-apple-card space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
              <FileCode2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-black">No Problem Statements Curated Yet</h3>
            <p className="text-xs text-neutral-500 max-w-md mx-auto">
              Publish your first challenge statement for {activeEvent?.title} so teams can lock their tracks.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowAddModal(true)}
              className="rounded-xl text-xs py-2 bg-black text-white hover:bg-neutral-800 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>Add Problem Statement</span>
            </Button>
          </div>
        ) : (
          problemStatements.map((ps) => (
            <div
              key={ps.id}
              className="bg-white p-6 rounded-3xl border border-black/[0.08] shadow-apple-card space-y-4 hover:border-black/20 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold bg-neutral-100 text-neutral-800 border border-neutral-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {ps.track || 'General Track'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      ps.is_revealed
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {ps.is_revealed ? '✓ Unsealed & Live' : '🔒 Sealed (Locked)'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-black tracking-tight">{ps.title}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleReveal(ps)}
                    className="gap-1.5 rounded-xl text-xs py-1.5 cursor-pointer"
                  >
                    {ps.is_revealed ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    <span>{ps.is_revealed ? 'Seal PS' : 'Unseal PS Immediately'}</span>
                  </Button>
                </div>
              </div>

              <p className="text-xs text-neutral-600 leading-relaxed">
                {ps.description}
              </p>

              {ps.requirements && ps.requirements.length > 0 && (
                <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200/80 space-y-2">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                    Deliverables & Technical Requirements
                  </div>
                  <ul className="text-xs text-neutral-700 space-y-1 list-disc list-inside">
                    {ps.requirements.map((req: string, i: number) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Problem Statement Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl border border-black/10 shadow-apple-card max-w-lg w-full p-6 sm:p-7 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
              <div>
                <h3 className="text-lg font-bold text-black">Curate New Problem Statement</h3>
                <p className="text-xs text-neutral-500">{activeEvent?.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePS} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Challenge Title
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Autonomous Satellite Telemetry Anomaly Detection"
                  required
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-black text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Domain Track
                </label>
                <input
                  type="text"
                  value={newTrack}
                  onChange={(e) => setNewTrack(e.target.value)}
                  placeholder="AI & Machine Learning / Web3 & Cryptography"
                  required
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-black text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Description & Objective
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  placeholder="Describe the real-world problem statement, constraints, and target users..."
                  required
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-black text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Requirements (One per line)
                </label>
                <textarea
                  value={newRequirements}
                  onChange={(e) => setNewRequirements(e.target.value)}
                  rows={3}
                  placeholder="Functional deployed web prototype&#10;Open-source GitHub repository&#10;2-minute pitch walkthrough"
                  className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-black text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl text-xs py-2 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl text-xs py-2 px-4 bg-black text-white hover:bg-neutral-800 cursor-pointer"
                >
                  {submitting ? 'Publishing...' : 'Create & Publish'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
