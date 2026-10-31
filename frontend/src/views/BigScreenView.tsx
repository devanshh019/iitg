import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Award, Clock, Users, Radio, Sparkles, ChevronRight, Trophy } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { apiFetch } from '../api/client';

interface BigScreenViewProps {
  eventId?: string;
  onExit?: () => void;
}

export const BigScreenView: React.FC<BigScreenViewProps> = ({ eventId = 'apollo-24', onExit }) => {
  const [data, setData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'ticker' | 'ceremony'>('ticker');
  const [timeLeft, setTimeLeft] = useState('11:58:42');

  useEffect(() => {
    loadBigScreen();
    const interval = setInterval(loadBigScreen, 6000);
    return () => clearInterval(interval);
  }, [eventId]);

  const loadBigScreen = async () => {
    try {
      const ev = await apiFetch(`/events/by-slug/${eventId}`);
      const res = await apiFetch(`/events/${ev.id}/fun/big-screen`);
      setData(res);
      if (res.ceremony?.active_stage && res.ceremony?.active_stage !== 'none') {
        setActiveTab('ceremony');
        if (res.ceremony.active_stage === 'first') {
          confetti({ particleCount: 150, spread: 100, origin: { y: 0.5 } });
        }
      }
    } catch (e) {}
  };

  const triggerReveal = async (stage: string) => {
    try {
      const ev = await apiFetch(`/events/by-slug/${eventId}`);
      await apiFetch(`/events/${ev.id}/fun/reveal-ceremony?stage=${stage}`, { method: 'POST' });
      loadBigScreen();
    } catch (e) {}
  };

  return (
    <div className="fixed inset-0 z-50 bg-space-950 text-white overflow-hidden flex flex-col justify-between p-8 font-mono select-none">
      {/* Background Starfield / Radial Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-950/20 via-space-950 to-space-950 pointer-events-none" />

      {/* Top Banner */}
      <div className="relative z-10 flex items-center justify-between border-b border-space-800 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-glow-cyan">
            <Radio className="w-6 h-6 text-space-950 animate-pulse" />
          </div>
          <div>
            <span className="text-xs text-cyan-400 font-bold tracking-widest uppercase">HACKOS BIG SCREEN TELEMETRY</span>
            <h1 className="text-3xl font-black tracking-tight">{data?.mission_title || 'APOLLO 24'}</h1>
          </div>
        </div>

        {/* Big Countdown Ticker */}
        <div className="flex items-center gap-6">
          <div className="text-right">
            <span className="text-xs text-slate-400 uppercase tracking-widest block">Time to Launch Cutoff</span>
            <div className="text-4xl md:text-5xl font-black text-amber-400 tracking-wider">
              {timeLeft}
            </div>
          </div>
          {onExit && (
            <Button variant="ghost" size="sm" onClick={onExit} className="text-slate-400">
              Exit
            </Button>
          )}
        </div>
      </div>

      {/* Main Center Stage */}
      <div className="relative z-10 my-auto py-8">
        {data?.ceremony?.active_stage && data.ceremony.active_stage !== 'none' ? (
          /* Staged Reveal Ceremony Mode */
          <div className="text-center max-w-3xl mx-auto space-y-6 animate-in zoom-in-95 duration-500">
            <Badge variant="amber" size="md" className="text-sm px-4 py-1.5 shadow-glow-amber">
              ★ PODIUM REVEAL CEREMONY ★
            </Badge>

            <div className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-cyan-400 to-amber-400">
              {data.ceremony.active_stage === 'first' ? '1ST PLACE: CHAMPION' :
               data.ceremony.active_stage === 'second' ? '2ND PLACE: RUNNER UP' : '3RD PLACE: PODIUM FINISH'}
            </div>

            {data.ceremony.revealed_team ? (
              <div className="p-8 bg-space-900/90 border-2 border-cyan-500/60 rounded-3xl shadow-glow-cyan">
                <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-4 animate-bounce" />
                <h2 className="text-4xl md:text-5xl font-black text-white">
                  {data.ceremony.revealed_team.team_name}
                </h2>
                <div className="flex items-center justify-center gap-4 mt-3 text-lg text-cyan-400">
                  <span>Track: {data.ceremony.revealed_team.track || 'Systems'}</span>
                  <span>•</span>
                  <span>Score: {data.ceremony.revealed_team.normalized_score}</span>
                </div>
              </div>
            ) : (
              <div className="text-2xl text-slate-400 animate-pulse">Calculating telemetry...</div>
            )}
          </div>
        ) : (
          /* Normal Big Screen Flight Deck */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Live Boarding Telemetry */}
            <div className="p-8 bg-space-900/80 border border-space-800 rounded-3xl text-center shadow-glass flex flex-col justify-between">
              <div>
                <Users className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
                <span className="text-sm text-slate-400 uppercase tracking-widest block">Boarded Ground Crew</span>
                <div className="text-6xl font-black text-cyan-400 mt-2">
                  {data?.boarded_crew || 86}
                  <span className="text-2xl text-slate-600 font-normal"> / {data?.total_registered_crew || 120}</span>
                </div>
              </div>
              <div className="w-full bg-space-800 h-3 rounded-full mt-6 overflow-hidden">
                <div
                  className="bg-cyan-500 h-full rounded-full transition-all duration-1000"
                  style={{ width: `${data?.boarding_percentage || 71.6}%` }}
                />
              </div>
            </div>

            {/* Current Critical Announcement */}
            <div className="p-8 bg-space-900/80 border border-amber-500/30 rounded-3xl shadow-glow-amber flex flex-col justify-between">
              <div>
                <Sparkles className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                <Badge variant="amber" className="mb-2">CURRENT BROADCAST</Badge>
                <h3 className="text-xl font-bold text-white mt-1">
                  {data?.announcement?.title || 'Orbital Ignition In Progress'}
                </h3>
                <p className="text-sm text-slate-300 mt-2 leading-relaxed">
                  {data?.announcement?.content || 'Check your crew dashboard for problem statements and team lock deadline.'}
                </p>
              </div>
              <span className="text-xs text-amber-400/80 mt-4 block">Priority: High Telemetry Broadcast</span>
            </div>

            {/* Upcoming Timeline Item */}
            <div className="p-8 bg-space-900/80 border border-space-800 rounded-3xl shadow-glass flex flex-col justify-between">
              <div>
                <Clock className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
                <span className="text-sm text-slate-400 uppercase tracking-widest block">Next Scheduled Checkpoint</span>
                <h3 className="text-xl font-bold text-white mt-2">Squad Roster Lock</h3>
                <p className="text-sm text-slate-400 mt-1">Hangar gates close for squad rosters at T+4:00.</p>
              </div>
              <div className="mt-4 p-2.5 bg-space-950 rounded-xl border border-space-850 text-xs text-cyan-400 font-bold">
                Location: Main Flight Deck
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Stage Controls (Organizer Controls for Ceremony) */}
      <div className="relative z-10 flex flex-wrap items-center justify-between border-t border-space-800 pt-6">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Ceremony Controls:</span>
          <Button variant="outline" size="sm" onClick={() => triggerReveal('third')} className="text-xs py-1">
            Reveal 3rd
          </Button>
          <Button variant="outline" size="sm" onClick={() => triggerReveal('second')} className="text-xs py-1">
            Reveal 2nd
          </Button>
          <Button variant="primary" size="sm" onClick={() => triggerReveal('first')} className="text-xs py-1 shadow-glow-cyan">
            Reveal Champion (1st)
          </Button>
          <Button variant="ghost" size="sm" onClick={() => triggerReveal('none')} className="text-xs py-1 text-slate-500">
            Reset
          </Button>
        </div>

        <div className="text-xs text-slate-500">
          Telemetry live at 100 Hz • Node ID: SAT-ORBITAL-01
        </div>
      </div>
    </div>
  );
};
