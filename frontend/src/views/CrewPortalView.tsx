import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Calendar, Clock, AlertTriangle, ArrowRight, CheckCircle2, Shield,
  QrCode, Rocket, Sparkles, Download, Smile, Flame
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { StatusRibbon } from '../components/ui/StatusRibbon';
import { apiFetch } from '../api/client';

interface CrewPortalViewProps {
  onNavigate: (view: string) => void;
  eventId?: string;
}

export const CrewPortalView: React.FC<CrewPortalViewProps> = ({ onNavigate, eventId = 'apollo-24' }) => {
  const [missionData, setMissionData] = useState<any>(null);
  const [boardingPass, setBoardingPass] = useState<any>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [showQR, setShowQR] = useState(false);
  const [moodScore, setMoodScore] = useState(4);
  const [moodNote, setMoodNote] = useState('');
  const [pulseSubmitted, setPulseSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPortalData();
  }, [eventId]);

  const loadPortalData = async () => {
    try {
      setLoading(true);
      // Fetch event by slug
      const event = await apiFetch(`/events/by-slug/${eventId}`);
      setMissionData(event);

      // Fetch announcements
      const anns = await apiFetch(`/events/${event.id}/announcements`);
      setAnnouncements(anns);

      // Fetch boarding pass
      try {
        const pass = await apiFetch(`/events/${event.id}/boarding/pass`);
        setBoardingPass(pass);
      } catch (e) {
        // If not authenticated or registered, fallback gracefully
      }
    } catch (err) {
      console.error('Failed to load mission data:', err);
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

  const submitMoodPulse = async () => {
    if (!missionData) return;
    try {
      await apiFetch(`/events/${missionData.id}/fun/mood-pulse?mood_score=${moodScore}&energy_level=high&note=${encodeURIComponent(moodNote)}`, {
        method: 'POST'
      });
      setPulseSubmitted(true);
    } catch (e) {}
  };

  const downloadICS = () => {
    const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//HACKOS//Mission Control//EN\nBEGIN:VEVENT\nSUMMARY:${missionData?.title || 'Hackathon'}\nDESCRIPTION:${missionData?.description || ''}\nSTATUS:CONFIRMED\nEND:VEVENT\nEND:VCALENDAR`;
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', 'mission-schedule.ics');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Determine stage and next action
  const currentStage = boardingPass?.status || 'registered';

  const getNextAction = () => {
    if (currentStage === 'registered') {
      return {
        label: 'Assemble or Join a Squad',
        desc: 'You are registered for flight. Next milestone is squad locking.',
        btnText: 'Open Squad Hub',
        action: () => onNavigate('squads'),
        icon: Shield
      };
    }
    if (currentStage === 'squad_locked') {
      return {
        label: 'Ready for Boarding Gate',
        desc: 'Show your Ed25519 boarding pass to ground crew at Main Gate.',
        btnText: 'View Boarding Pass',
        action: () => setShowQR(true),
        icon: QrCode
      };
    }
    if (currentStage === 'boarded') {
      return {
        label: 'Prepare Project Launch',
        desc: 'Flight deck is open. Submit project drafts with SHA-256 revisions.',
        btnText: 'Go to Launch Desk',
        action: () => onNavigate('launch'),
        icon: Rocket
      };
    }
    return {
      label: 'Flight Review Active',
      desc: 'Judges are reviewing launches. Telemetry leaderboard updating.',
      btnText: 'Check Flight Review',
      action: () => onNavigate('judging'),
      icon: CheckCircle2
    };
  };

  const nextAction = getNextAction();
  const NextIcon = nextAction.icon;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Mission Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-space-900 to-space-850 p-6 rounded-2xl border border-space-800 shadow-glass">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="cyan">MISSION ACTIVE</Badge>
            <span className="text-xs font-mono text-slate-400">SLUG: {missionData?.slug || 'apollo-24'}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold font-mono text-white tracking-tight">
            {missionData?.title || 'APOLLO 24: Deep Space Orbital Hackathon'}
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">{missionData?.description}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={downloadICS} className="gap-2">
            <Download className="w-4 h-4" />
            <span>Export ICS</span>
          </Button>
          <Button variant="primary" size="sm" onClick={() => setShowQR(true)} className="gap-2">
            <QrCode className="w-4 h-4" />
            <span>Boarding Pass</span>
          </Button>
        </div>
      </div>

      {/* Animated Status Ribbon */}
      <StatusRibbon currentStage={currentStage} />

      {/* Hero Now / Next Card with One Clear Action Button */}
      <Card glow="cyan" className="bg-gradient-to-br from-space-900 via-space-900 to-cyan-950/30 border-cyan-500/30">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0">
              <NextIcon className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">NEXT DIRECTIVE</span>
                <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              </div>
              <h2 className="text-xl font-bold font-mono text-white mt-0.5">{nextAction.label}</h2>
              <p className="text-sm text-slate-300 mt-1">{nextAction.desc}</p>
            </div>
          </div>

          <Button variant="primary" size="lg" onClick={nextAction.action} className="w-full md:w-auto shrink-0 gap-2">
            <span>{nextAction.btnText}</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </Card>

      {/* Split Grid: Telemetry Announcements & Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Mission Announcements & Challenges */}
        <div className="lg:col-span-2 space-y-6">
          {/* Mission Bulletins */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h3 className="font-mono font-bold text-sm tracking-wider uppercase text-slate-200">Mission Bulletins</h3>
              </div>
              <span className="text-xs font-mono text-slate-500">{announcements.length} broadcasts</span>
            </div>

            <div className="space-y-3">
              {announcements.map((ann, idx) => (
                <div
                  key={ann.id || idx}
                  className={`p-4 rounded-xl border transition-all ${
                    ann.priority === 'high'
                      ? 'bg-amber-950/20 border-amber-500/30'
                      : 'bg-space-950/60 border-space-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        {ann.is_pinned && <Badge variant="cyan" size="sm">PINNED</Badge>}
                        <h4 className="font-semibold text-slate-100 text-sm">{ann.title}</h4>
                      </div>
                      <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{ann.content}</p>
                    </div>

                    <Button
                      variant={ann.acknowledged ? 'secondary' : 'outline'}
                      size="sm"
                      onClick={() => handleAcknowledge(ann.id)}
                      className="text-[11px] shrink-0"
                    >
                      {ann.acknowledged ? 'Acknowledged' : 'Acknowledge'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Timed Reveal Problem Statements */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-mono font-bold text-sm tracking-wider uppercase text-slate-200">Mission Challenges & Tracks</h3>
              <Badge variant="cyan">3 TRACKS ACTIVE</Badge>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              {[
                { title: 'AI & Autonomous Telemetry', track: 'AI/ML', desc: 'Deploy neural models capable of zero-latency edge diagnostics in orbit.' },
                { title: 'Fault-Tolerant Space Systems', track: 'Systems', desc: 'High availability Byzantine agreement under high radiation packet loss.' },
                { title: 'Open Orbital Frontier', track: 'Open Track', desc: 'Breakthrough innovations expanding human capabilities beyond Earth.' }
              ].map((prob, i) => (
                <div key={i} className="p-3.5 bg-space-950/50 border border-space-800 rounded-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-cyan-400">{prob.track}</span>
                    <span className="text-[10px] text-emerald-400 font-mono">REVEALED</span>
                  </div>
                  <h4 className="font-semibold text-sm text-slate-100 mt-1">{prob.title}</h4>
                  <p className="text-xs text-slate-400 mt-1">{prob.desc}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Col: Timeline & Crew Pulse Mood */}
        <div className="space-y-6">
          {/* Timeline */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h3 className="font-mono font-bold text-sm tracking-wider uppercase text-slate-200">Flight Timeline</h3>
            </div>
            <div className="space-y-4 relative border-l-2 border-space-800 ml-2 pl-4">
              {[
                { time: 'T-00:00', title: 'Mission Ignition & Keynote', active: false },
                { time: 'T+04:00', title: 'Squad Roster Lock Deadline', active: true },
                { time: 'T+12:00', title: 'Midnight Orbital Pit Stop', active: false },
                { time: 'T+20:00', title: 'Launches Final Cutoff', active: false },
                { time: 'T+24:00', title: 'Flight Review Debrief', active: false }
              ].map((step, idx) => (
                <div key={idx} className="relative">
                  <div
                    className={`absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full ${
                      step.active ? 'bg-amber-400 ring-4 ring-amber-400/30' : 'bg-space-700'
                    }`}
                  />
                  <span className="text-[10px] font-mono text-slate-500 block">{step.time}</span>
                  <span className={`text-xs font-medium ${step.active ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>
                    {step.title}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Anonymous Crew Pulse */}
          <Card glow="amber">
            <div className="flex items-center gap-2 mb-2">
              <Smile className="w-4 h-4 text-amber-400" />
              <h3 className="font-mono font-bold text-sm text-white">Crew Pulse (Mood Telemetry)</h3>
            </div>
            <p className="text-xs text-slate-400 mb-3">Anonymous telemetry sent to Mission Control organizers.</p>

            {pulseSubmitted ? (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-center">
                <span className="text-xs font-mono text-emerald-400">✨ Telemetry Pulse Logged! Thank you, Crew.</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between text-xs font-mono text-slate-400">
                  <span>Battery Drained (1)</span>
                  <span className="text-amber-400 font-bold">Orbital Velocity ({moodScore})</span>
                  <span>Hyper (5)</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={moodScore}
                  onChange={(e) => setMoodScore(parseInt(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <input
                  type="text"
                  placeholder="Optional note for flight director..."
                  value={moodNote}
                  onChange={(e) => setMoodNote(e.target.value)}
                  className="w-full bg-space-950 border border-space-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                />
                <Button variant="primary" size="sm" onClick={submitMoodPulse} className="w-full">
                  Transmit Telemetry
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Boarding Pass Modal */}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-space-950/80 backdrop-blur-md" onClick={() => setShowQR(false)} />
          <div className="relative w-full max-w-sm bg-space-900 border border-cyan-500/40 rounded-2xl shadow-glow-cyan p-6 text-center z-10">
            <Badge variant="cyan" className="mb-2">ED25519 VERIFIED PASS</Badge>
            <h3 className="text-xl font-bold font-mono text-white mb-1">
              {boardingPass?.participant_name || 'Astronaut'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">Present at any boarding station gate.</p>

            <div className="bg-white p-4 rounded-xl inline-block shadow-lg my-2">
              <QRCodeSVG
                value={boardingPass?.token || 'HACKOS:DEMO:BOARDING:PASS:SAMPLE'}
                size={180}
                level="M"
              />
            </div>

            <div className="mt-4 p-2 bg-space-950 border border-space-800 rounded-lg">
              <span className="text-[10px] font-mono text-slate-500 block">MANUAL FALLBACK CODE</span>
              <span className="font-mono text-lg font-bold text-amber-400 tracking-widest">
                {boardingPass?.short_fallback_code || 'APOLLO-99'}
              </span>
            </div>

            <Button variant="secondary" size="sm" onClick={() => setShowQR(false)} className="w-full mt-4">
              Close Pass
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
