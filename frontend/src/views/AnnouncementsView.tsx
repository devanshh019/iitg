import React, { useState, useEffect } from 'react';
import {
  Bell, Volume2, VolumeX, CheckCircle2, AlertTriangle, Pin,
  Clock, Plus, Send, Radio, Sparkles
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { apiFetch } from '../api/client';
import { useEvent } from '../context/EventContext';
import { useAuth } from '../context/AuthContext';

interface AnnouncementsViewProps {
  eventId?: string;
}

export const AnnouncementsView: React.FC<AnnouncementsViewProps> = ({ eventId: propEventId }) => {
  const { currentEvent, events, selectEvent } = useEvent();
  const { user, activeRole } = useAuth();
  const activeEvent = currentEvent || events[0];
  const targetEventId = propEventId || activeEvent?.id;

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  // Broadcast composer (for organizers/super_admin)
  const isOrganizer = activeRole === 'organizer' || activeRole === 'super_admin' || user?.is_super_admin;
  const [showComposer, setShowComposer] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('normal');
  const [isPinned, setIsPinned] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastMsg, setBroadcastMsg] = useState<string | null>(null);

  useEffect(() => {
    if (targetEventId) {
      loadAnnouncements();
      // Poll every 4 seconds so participants receive live announcements instantly
      const interval = setInterval(loadAnnouncements, 4000);
      return () => clearInterval(interval);
    }
  }, [targetEventId]);

  const loadAnnouncements = async () => {
    if (!targetEventId) return;
    try {
      const anns = await apiFetch<any[]>(`/events/${targetEventId}/announcements`);
      setAnnouncements(anns || []);
    } catch (e) {
      console.error('Failed to load announcements', e);
    } finally {
      setLoading(false);
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEventId || !title.trim() || !content.trim()) return;
    try {
      setBroadcasting(true);
      await apiFetch<any>(`/events/${targetEventId}/announcements`, {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          priority,
          is_pinned: isPinned
        })
      });

      setTitle('');
      setContent('');
      setIsPinned(false);
      setShowComposer(false);
      setBroadcastMsg('Broadcast dispatched successfully to all arena participants!');
      await loadAnnouncements();
      setTimeout(() => setBroadcastMsg(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch broadcast');
    } finally {
      setBroadcasting(false);
    }
  };

  const handleAcknowledge = async (annId: string) => {
    if (!targetEventId) return;
    try {
      await apiFetch(`/events/${targetEventId}/announcements/${annId}/acknowledge`, { method: 'POST' });
      setAnnouncements(prev => prev.map(a => a.id === annId ? { ...a, acknowledged: true } : a));
    } catch (e) {}
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-black animate-fadeIn">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-7 rounded-3xl border border-black/[0.08] shadow-apple-card">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-black text-white flex items-center justify-center shadow-apple-sm shrink-0">
            <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-black text-white px-2 py-0.5 rounded-full">
                Live Broadcast Feed
              </span>
              <span className="text-xs text-neutral-400 font-medium">{activeEvent?.title}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-black tracking-tight">Announcements & Dispatch</h1>
            <p className="text-xs sm:text-sm text-neutral-500">
              Real-time operational updates, milestone alerts, and jury schedules.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {events && events.length > 1 && (
            <select
              value={activeEvent?.id}
              onChange={(e) => {
                const ev = events.find(item => item.id === e.target.value);
                if (ev) selectEvent(ev);
              }}
              className="text-xs bg-neutral-100 border border-neutral-300 rounded-xl px-2.5 py-1.5 font-semibold text-black cursor-pointer"
            >
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>
                  {ev.title}
                </option>
              ))}
            </select>
          )}

          {isOrganizer && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowComposer(!showComposer)}
              className="gap-1.5 rounded-xl text-xs py-1.5 px-3 bg-black text-white hover:bg-neutral-800 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Broadcast Alert</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-xs gap-1.5 rounded-xl py-1.5 cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-black" /> : <VolumeX className="w-4 h-4 text-neutral-400" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Live Audio' : 'Muted'}</span>
          </Button>
        </div>
      </div>

      {/* Broadcast Success Banner */}
      {broadcastMsg && (
        <div className="p-4 bg-neutral-900 text-white rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-apple-card animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{broadcastMsg}</span>
        </div>
      )}

      {/* Organizer Broadcast Composer */}
      {isOrganizer && showComposer && (
        <div className="bg-white p-6 rounded-3xl border border-black shadow-apple-card space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
            <div>
              <h3 className="text-base font-bold text-black flex items-center gap-2">
                <Radio className="w-4 h-4 text-black" />
                <span>Compose High-Priority Announcement</span>
              </h3>
              <p className="text-xs text-neutral-500">Target Arena: {activeEvent?.title}</p>
            </div>
            <button
              onClick={() => setShowComposer(false)}
              className="text-xs text-neutral-400 hover:text-black font-semibold cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleBroadcast} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Announcement Headline
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Mentor Office Hours Open in Discord Room B"
                required
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-black text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Broadcast Content
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                placeholder="Write message details for attendees..."
                required
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-black text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-3">
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="text-xs bg-neutral-100 border border-neutral-200 rounded-xl px-3 py-2 font-semibold text-black cursor-pointer"
                >
                  <option value="normal">Normal Priority</option>
                  <option value="urgent">Urgent / Important</option>
                  <option value="critical">Critical Deadline Notice</option>
                </select>

                <label className="flex items-center gap-2 text-xs font-semibold text-neutral-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-300 text-black focus:ring-black cursor-pointer"
                  />
                  <span>Pin to Top of Feed</span>
                </label>
              </div>

              <Button
                type="submit"
                disabled={broadcasting}
                className="gap-2 rounded-xl text-xs py-2 px-5 bg-black text-white hover:bg-neutral-800 cursor-pointer shadow-sm font-semibold"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{broadcasting ? 'Transmitting...' : 'Transmit Broadcast'}</span>
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Announcements Stream */}
      <div className="space-y-3">
        {loading && announcements.length === 0 ? (
          <div className="p-12 text-center text-xs font-mono text-neutral-400 bg-white rounded-3xl border border-black/[0.08]">
            Connecting to live arena broadcast telemetry...
          </div>
        ) : announcements.length === 0 ? (
          <div className="p-12 text-center text-xs text-neutral-400 bg-white rounded-3xl border border-black/[0.08]">
            No broadcasts dispatched yet for {activeEvent?.title}. All systems operational.
          </div>
        ) : (
          announcements.map((ann, idx) => (
            <div
              key={ann.id || idx}
              className={`p-5 rounded-3xl border transition-all bg-white shadow-apple-sm ${
                ann.is_pinned
                  ? 'border-black ring-1 ring-black/10'
                  : 'border-black/[0.08] hover:border-black/20'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3.5">
                  <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 mt-0.5 ${
                    ann.priority === 'critical'
                      ? 'bg-red-500 text-white'
                      : ann.priority === 'urgent'
                      ? 'bg-amber-500 text-white'
                      : 'bg-neutral-100 text-black'
                  }`}>
                    {ann.priority === 'critical' || ann.priority === 'urgent' ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <Bell className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {ann.is_pinned && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-black text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Pin className="w-2.5 h-2.5" />
                          Pinned Alert
                        </span>
                      )}
                      {ann.priority === 'critical' && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-800 border border-red-200 px-2 py-0.5 rounded-full">
                          Critical
                        </span>
                      )}
                      {ann.priority === 'urgent' && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200 px-2 py-0.5 rounded-full">
                          Urgent
                        </span>
                      )}
                      <span className="text-sm font-bold text-black">{ann.title}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed mt-1">{ann.content}</p>
                    <div className="flex items-center gap-3 mt-2.5 text-[10px] text-neutral-400 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{ann.created_at ? new Date(ann.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live'}</span>
                      </span>
                      <span>•</span>
                      <span>{ann.acknowledgements_count || 0} Hackers Acknowledged</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <Button
                    variant={ann.acknowledged ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => handleAcknowledge(ann.id)}
                    className="text-xs rounded-xl py-1 px-3 cursor-pointer"
                  >
                    {ann.acknowledged ? (
                      <span className="flex items-center gap-1 text-neutral-700">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Read</span>
                      </span>
                    ) : (
                      <span>Acknowledge</span>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
