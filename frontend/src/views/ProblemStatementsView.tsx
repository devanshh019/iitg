import React, { useState, useEffect } from 'react';
import {
  FileCode2, Clock, CheckCircle2, Lock, Unlock, Shield,
  ArrowRight, Sparkles, Building2, Tag, AlertCircle, Rocket
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { apiFetch } from '../api/client';
import { useEvent } from '../context/EventContext';

interface ProblemStatementsViewProps {
  onNavigate?: (view: string) => void;
}

export const ProblemStatementsView: React.FC<ProblemStatementsViewProps> = ({ onNavigate }) => {
  const { currentEvent } = useEvent();
  const [problemStatements, setProblemStatements] = useState<any[]>([]);
  const [mySquad, setMySquad] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lockingId, setLockingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  // Timer tick
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const eventId = currentEvent?.id;

  useEffect(() => {
    if (eventId) {
      loadData();
    }
  }, [eventId]);

  const loadData = async () => {
    if (!eventId) return;
    try {
      setIsLoading(true);
      const [psRes, squadRes] = await Promise.allSettled([
        apiFetch<any>(`/events/${eventId}/problem-statements`),
        apiFetch<any>(`/events/${eventId}/teams/my-squad`)
      ]);

      if (psRes.status === 'fulfilled' && psRes.value) {
        setProblemStatements(psRes.value.problem_statements || []);
      }

      if (squadRes.status === 'fulfilled' && squadRes.value) {
        setMySquad(squadRes.value);
        if (squadRes.value.problem_statement) {
          localStorage.setItem('whycode4u_ps_title', squadRes.value.problem_statement.title);
          localStorage.setItem('whycode4u_selected_ps', squadRes.value.problem_statement_id);
        }
      } else {
        setMySquad(null);
      }
    } catch (err) {
      console.error('Failed to load problem statements or squad', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Countdown calculations
  const startsAt = currentEvent?.starts_at ? new Date(currentEvent.starts_at).getTime() : 0;
  const deadlineAt = currentEvent?.submission_deadline
    ? new Date(currentEvent.submission_deadline).getTime()
    : startsAt + 1000 * 60 * 60 * 24;
  const currentTime = now.getTime();

  // If status is ongoing, or any problem statement is revealed, the challenge IS LIVE!
  const hasUnsealedPS = problemStatements.length > 0 && problemStatements.some(ps => ps.is_revealed);
  const isEventExplicitlyLive = currentEvent?.status === 'ongoing' || hasUnsealedPS;
  const isPostDeadline = deadlineAt > 0 && currentTime > deadlineAt;
  const isLive = isEventExplicitlyLive || (startsAt > 0 && currentTime >= startsAt && !isPostDeadline);
  const isPreKickoff = !isLive && !isPostDeadline && startsAt > currentTime;

  const formatTimeDiff = (targetMs: number) => {
    const diff = Math.max(0, targetMs - currentTime);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLockPs = async (ps: any, autoNavigateToSubmit = false) => {
    if (!eventId) return;
    try {
      setLockingId(ps.id);
      await apiFetch<any>(`/events/${eventId}/teams/lock-ps`, {
        method: 'POST',
        body: JSON.stringify({ problem_statement_id: ps.id })
      });

      localStorage.setItem('whycode4u_ps_title', ps.title);
      localStorage.setItem('whycode4u_selected_ps', ps.id);

      setSuccessMsg(`"${ps.title}" locked for your squad! Submission Desk is unlocked.`);
      await loadData();

      if (autoNavigateToSubmit && onNavigate) {
        setTimeout(() => onNavigate('launch'), 400);
      } else {
        setTimeout(() => setSuccessMsg(null), 5000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to lock problem statement.');
    } finally {
      setLockingId(null);
    }
  };

  const lockedPsId = mySquad?.problem_statement_id || localStorage.getItem('whycode4u_selected_ps');
  const isPsLocked = Boolean(mySquad?.is_ps_locked) || Boolean(lockedPsId);

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-black animate-fadeIn">
      {/* Top Banner with Apple Timer */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-black/[0.08] shadow-apple-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  isPreKickoff ? 'bg-amber-500' : isLive ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'
                }`}
              />
              <span className="text-[11px] font-bold uppercase tracking-wider text-black">
                {isPreKickoff ? 'Pre-Kickoff Teaser' : isLive ? '🔥 Event is LIVE & Running' : 'Event Concluded'}
              </span>
              <span className="text-neutral-300">•</span>
              <span className="text-xs text-neutral-500 font-medium">
                {currentEvent?.format_config?.organization || currentEvent?.title || 'HackOS'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-black tracking-tight">
              {currentEvent?.title || 'Problem Statements & Tracks'}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-xl leading-relaxed">
              {isPreKickoff
                ? 'Problem statements are sealed until kickoff. Review the tracks below and coordinate with your squad before the timer expires.'
                : 'Select and lock your squad’s chosen problem statement below. Once locked, the Project Submission Desk unlocks immediately.'}
            </p>
          </div>

          {/* Live Apple Countdown Badge */}
          <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-center shrink-0 sm:min-w-[190px]">
            <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider flex items-center justify-center gap-1">
              <Clock className="w-3 h-3 text-neutral-500" />
              {isPreKickoff ? 'Kickoff Starting In' : isLive ? 'Time Left to Submit' : 'Status'}
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-black text-black mt-1 tracking-tight">
              {isPreKickoff
                ? formatTimeDiff(startsAt)
                : isLive
                ? formatTimeDiff(deadlineAt)
                : 'Concluded'}
            </div>
          </div>
        </div>

        {/* Squad Lock Status Pill */}
        {isPsLocked && (
          <div className="mt-5 p-3.5 bg-black text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center font-bold text-xs shrink-0">
                🔒
              </div>
              <div>
                <span className="font-bold uppercase tracking-wider text-[10px] text-neutral-400 block">Active Problem Statement:</span>
                <span className="text-white font-semibold text-sm">
                  {mySquad?.problem_statement?.title || localStorage.getItem('whycode4u_ps_title') || 'Locked Track Challenge'}
                </span>
              </div>
            </div>
            {onNavigate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('launch')}
                className="gap-1.5 rounded-xl bg-white text-black border-white hover:bg-neutral-100 text-xs py-1.5 px-3 cursor-pointer shrink-0 font-semibold"
              >
                <Rocket className="w-3.5 h-3.5" />
                <span>Go to Submission Desk</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 bg-neutral-900 text-white rounded-2xl text-xs font-semibold flex items-center justify-between gap-3 shadow-apple-card animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate('launch')}
              className="text-xs text-neutral-300 hover:text-white underline cursor-pointer flex items-center gap-1"
            >
              <span>Submit Project Now</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Problem Statements List */}
      {isLoading ? (
        <div className="p-12 text-center text-neutral-400 text-sm">Loading problem statements...</div>
      ) : problemStatements.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-black/[0.08] text-neutral-500 text-sm">
          No problem statements published for this event yet. Check back soon.
        </div>
      ) : (
        <div className="space-y-4">
          {problemStatements.map(ps => {
            const isThisLocked = lockedPsId === ps.id;
            const isCardRevealed = ps.is_revealed || isLive;

            return (
              <div
                key={ps.id}
                className={`bg-white rounded-3xl border transition-all duration-200 overflow-hidden relative ${
                  isThisLocked
                    ? 'border-black ring-2 ring-black/20 shadow-apple-card'
                    : 'border-black/[0.08] shadow-apple-card hover:border-black/20'
                }`}
              >
                <div className="p-6">
                  {/* Track & Lock Header */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-800 px-3 py-1 rounded-full border border-neutral-200">
                      {ps.track || 'Track Challenge'}
                    </span>

                    {isThisLocked ? (
                      <span className="text-[11px] font-bold uppercase tracking-wider bg-black text-white px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                        <Lock className="w-3 h-3 text-white" />
                        Selected & Locked
                      </span>
                    ) : isCardRevealed ? (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <Unlock className="w-3 h-3" />
                        Unsealed & Open
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Sealed
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-bold text-black tracking-tight">{ps.title}</h3>
                  <p className="text-xs sm:text-sm text-neutral-600 mt-2 leading-relaxed">
                    {ps.description}
                  </p>

                  {/* Requirements List */}
                  {ps.requirements && ps.requirements.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-black/[0.06]">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                        Deliverable Requirements
                      </h4>
                      <ul className="space-y-1.5">
                        {ps.requirements.map((req: string, idx: number) => (
                          <li key={idx} className="text-xs text-neutral-700 flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 mt-1.5 shrink-0" />
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Rules */}
                  {ps.rules && (
                    <div className="mt-3 pt-3 border-t border-black/[0.04]">
                      <span className="text-[11px] font-bold text-neutral-400">Rules & Attribution: </span>
                      <span className="text-xs text-neutral-500">{ps.rules}</span>
                    </div>
                  )}
                </div>

                {/* Footer Action Bar */}
                <div className="p-4 bg-neutral-50 border-t border-black/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-neutral-500">
                    {isPreKickoff && !isCardRevealed ? (
                      <span className="font-mono text-neutral-600">
                        🔒 Problem statements locked until kickoff
                      </span>
                    ) : isThisLocked ? (
                      <span className="text-black font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        Ready for Submission Desk
                      </span>
                    ) : (
                      <span className="text-neutral-600 text-xs">
                        Locking this track unlocks project code submission for your squad
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {isThisLocked ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onNavigate && onNavigate('launch')}
                        className="gap-1.5 rounded-xl text-xs py-1.5 px-4 bg-black text-white hover:bg-neutral-800 cursor-pointer shadow-sm"
                      >
                        <Rocket className="w-3.5 h-3.5" />
                        <span>Submit Project Now</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={lockingId === ps.id}
                          onClick={() => handleLockPs(ps, false)}
                          className="gap-1.5 rounded-xl text-xs py-1.5 border-neutral-300 text-black hover:bg-neutral-100 cursor-pointer"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>{lockingId === ps.id ? 'Locking...' : 'Select Track'}</span>
                        </Button>

                        <Button
                          variant="primary"
                          size="sm"
                          disabled={lockingId === ps.id}
                          onClick={() => handleLockPs(ps, true)}
                          className="gap-1.5 rounded-xl text-xs py-1.5 px-3.5 bg-black text-white hover:bg-neutral-800 cursor-pointer shadow-sm"
                        >
                          <Rocket className="w-3.5 h-3.5" />
                          <span>Lock & Submit</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
