import React, { useState, useEffect } from 'react';
import { FileCode2, Clock, CheckCircle2, Lock, Unlock, Shield, ArrowRight, Sparkles, Building2, Tag, AlertCircle } from 'lucide-react';
import { Card } from '../components/ui/Card';
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
      // Fetch PS and Squad in parallel
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
  const deadlineAt = currentEvent?.submission_deadline ? new Date(currentEvent.submission_deadline).getTime() : 0;
  const currentTime = now.getTime();

  const isPreKickoff = startsAt > currentTime;
  const isPostDeadline = deadlineAt > 0 && currentTime > deadlineAt;
  const isLive = !isPreKickoff && !isPostDeadline;

  const formatTimeDiff = (targetMs: number) => {
    const diff = Math.max(0, targetMs - currentTime);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLockPs = async (ps: any) => {
    if (!eventId) return;
    try {
      setLockingId(ps.id);
      const res = await apiFetch<any>(`/events/${eventId}/teams/lock-ps`, {
        method: 'POST',
        body: JSON.stringify({ problem_statement_id: ps.id })
      });

      localStorage.setItem('whycode4u_ps_title', ps.title);
      localStorage.setItem('whycode4u_selected_ps', ps.id);

      setSuccessMsg(`Problem statement locked for your squad! Project Submission Desk is now unlocked.`);
      await loadData();
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      alert(err.message || 'Failed to lock problem statement.');
    } finally {
      setLockingId(null);
    }
  };

  const lockedPsId = mySquad?.problem_statement_id || localStorage.getItem('whycode4u_selected_ps');
  const isPsLocked = Boolean(mySquad?.is_ps_locked);

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
                {isPreKickoff ? 'Pre-Kickoff Teaser' : isLive ? 'Live Challenge Window' : 'Event Concluded'}
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
                : 'Review the problem statements below. Select and lock your squad’s chosen problem statement to unlock the Project Submission Desk.'}
            </p>
          </div>

          {/* Live Apple Countdown Badge */}
          <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-center shrink-0 sm:min-w-[180px]">
            <div className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider flex items-center justify-center gap-1">
              <Clock className="w-3 h-3 text-neutral-500" />
              {isPreKickoff ? 'Starting In' : isLive ? 'Time Left to Build' : 'Status'}
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
        {isPsLocked && mySquad?.problem_statement && (
          <div className="mt-5 p-3.5 bg-black text-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-white text-black flex items-center justify-center font-bold text-xs shrink-0">
                🔒
              </div>
              <div>
                <span className="font-bold">LOCKED FOR SQUAD: </span>
                <span className="text-neutral-300 font-medium">{mySquad.problem_statement.title}</span>
              </div>
            </div>
            {onNavigate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('launch')}
                className="gap-1.5 rounded-xl bg-white text-black border-white hover:bg-neutral-100 text-xs py-1 cursor-pointer shrink-0"
              >
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
              className="text-xs text-neutral-300 hover:text-white underline cursor-pointer"
            >
              Open Submission &rarr;
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
            const canLock = !isPreKickoff && (!isPsLocked || isThisLocked);

            return (
              <div
                key={ps.id}
                className={`bg-white rounded-3xl border transition-all duration-200 overflow-hidden relative ${
                  isThisLocked
                    ? 'border-black ring-1 ring-black shadow-apple-card'
                    : 'border-black/[0.08] shadow-apple-card'
                }`}
              >
                <div className="p-6">
                  {/* Track & Lock Header */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-[11px] font-bold uppercase tracking-wider bg-neutral-100 text-neutral-800 px-3 py-1 rounded-full border border-neutral-200">
                      {ps.track || 'Track Challenge'}
                    </span>

                    {isThisLocked ? (
                      <span className="text-[11px] font-bold uppercase tracking-wider bg-black text-white px-3 py-1 rounded-full flex items-center gap-1.5">
                        <Lock className="w-3 h-3 text-white" />
                        Selected & Locked
                      </span>
                    ) : ps.is_revealed ? (
                      <span className="text-[11px] font-semibold text-neutral-500 flex items-center gap-1">
                        <Unlock className="w-3 h-3 text-neutral-400" />
                        Available Track
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-neutral-400" />
                        Sealed
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-bold text-black tracking-tight">{ps.title}</h3>
                  <p className="text-xs sm:text-sm text-neutral-600 mt-2 leading-relaxed">
                    {ps.description}
                  </p>

                  {/* Requirements List (Unsealed) */}
                  {ps.is_revealed && ps.requirements && ps.requirements.length > 0 && (
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

                  {/* Rules (Unsealed) */}
                  {ps.is_revealed && ps.rules && (
                    <div className="mt-3 pt-3 border-t border-black/[0.04]">
                      <span className="text-[11px] font-bold text-neutral-400">Rules & Attribution: </span>
                      <span className="text-xs text-neutral-500">{ps.rules}</span>
                    </div>
                  )}
                </div>

                {/* Footer Lock Action */}
                <div className="p-4 bg-neutral-50 border-t border-black/[0.06] flex items-center justify-between gap-4">
                  <div className="text-xs text-neutral-500">
                    {isPreKickoff ? (
                      <span className="font-mono text-neutral-600">
                        🔒 Sealed until countdown reaches 00:00:00
                      </span>
                    ) : isThisLocked ? (
                      <span className="text-black font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-black" />
                        Active for Project Submission
                      </span>
                    ) : isPsLocked ? (
                      <span className="text-neutral-400 text-xs">
                        Squad locked another track
                      </span>
                    ) : (
                      <span className="text-neutral-600 text-xs">
                        Locking this problem unlocks the Submission Desk
                      </span>
                    )}
                  </div>

                  <div>
                    {isPreKickoff ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="rounded-xl text-xs py-1.5 opacity-50 cursor-not-allowed"
                      >
                        <Lock className="w-3.5 h-3.5 mr-1" />
                        Sealed
                      </Button>
                    ) : isThisLocked ? (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onNavigate && onNavigate('launch')}
                        className="gap-1.5 rounded-xl text-xs py-1.5 bg-black text-white hover:bg-neutral-800 cursor-pointer"
                      >
                        <span>Open Submission Desk</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={lockingId === ps.id || (isPsLocked && !isThisLocked)}
                        onClick={() => handleLockPs(ps)}
                        className="gap-1.5 rounded-xl text-xs py-1.5 border-black text-black hover:bg-neutral-100 cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>{lockingId === ps.id ? 'Locking...' : 'Select & Lock for Squad'}</span>
                      </Button>
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
