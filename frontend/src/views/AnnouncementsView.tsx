import React, { useState, useEffect } from 'react';
import { Bell, Volume2, VolumeX, CheckCircle2, AlertTriangle, Pin, Clock } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { apiFetch } from '../api/client';

interface AnnouncementsViewProps {
  eventId?: string;
}

export const AnnouncementsView: React.FC<AnnouncementsViewProps> = ({ eventId = 'apollo-24' }) => {
  const [missionData, setMissionData] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnnouncements();
  }, [eventId]);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const ev = await apiFetch(`/events/by-slug/${eventId}`);
      setMissionData(ev);

      const anns = await apiFetch(`/events/${ev.id}/announcements`);
      setAnnouncements(anns);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (annId: string) => {
    if (!missionData) return;
    try {
      await apiFetch(`/events/${missionData.id}/announcements/${annId}/acknowledge`, { method: 'POST' });
      setAnnouncements(prev => prev.map(a => a.id === annId ? { ...a, acknowledged: true } : a));
    } catch (e) {}
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto text-black">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-black/[0.08] shadow-apple-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center shadow-apple-sm">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-black tracking-tight">Announcements</h1>
            <p className="text-xs sm:text-sm text-neutral-500">Live broadcasts and operational updates from the organizers.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-xs gap-1.5 rounded-xl"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-black" /> : <VolumeX className="w-4 h-4 text-neutral-400" />}
            <span>{soundEnabled ? 'Alerts ON' : 'Muted'}</span>
          </Button>
        </div>
      </div>

      {/* iOS Style Notification List */}
      <div className="space-y-3">
        {announcements.length === 0 ? (
          <div className="p-12 text-center text-xs text-neutral-400 bg-white rounded-3xl border border-black/[0.08]">
            No broadcasts yet. All systems operational.
          </div>
        ) : (
          announcements.map((ann, idx) => (
            <div
              key={ann.id || idx}
              className={`p-4 sm:p-5 rounded-3xl border transition-all bg-white shadow-apple-sm ${
                ann.is_pinned
                  ? 'border-black ring-1 ring-black/10'
                  : 'border-black/[0.08] hover:border-black/20'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0 mt-0.5">
                    {ann.priority === 'high' ? (
                      <AlertTriangle className="w-4 h-4 text-black" />
                    ) : (
                      <Bell className="w-4 h-4 text-neutral-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {ann.is_pinned && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-black text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Pin className="w-2.5 h-2.5" />
                          Pinned
                        </span>
                      )}
                      {ann.priority === 'high' && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-neutral-100 text-black border border-neutral-300 px-2 py-0.5 rounded-full">
                          Important
                        </span>
                      )}
                      <span className="text-xs font-bold text-black">{ann.title}</span>
                    </div>
                    <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed mt-1">{ann.content}</p>
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-neutral-400 font-mono">
                      <Clock className="w-3 h-3" />
                      <span>{ann.created_at ? new Date(ann.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live Broadcast'}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <Button
                    variant={ann.acknowledged ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => handleAcknowledge(ann.id)}
                    className="text-xs rounded-xl py-1 px-3"
                  >
                    {ann.acknowledged ? (
                      <span className="flex items-center gap-1 text-neutral-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
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
