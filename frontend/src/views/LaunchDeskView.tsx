import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Rocket, CheckCircle2, AlertTriangle, ShieldCheck, Code, Globe,
  Video, Presentation, FileText, Lock, ArrowRight, Sparkles, Check,
  RefreshCw, ExternalLink
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { apiFetch } from '../api/client';
import { useEvent } from '../context/EventContext';

interface LaunchDeskViewProps {
  onNavigate?: (view: string) => void;
  eventId?: string;
}

export const LaunchDeskView: React.FC<LaunchDeskViewProps> = ({ onNavigate, eventId: propEventId }) => {
  const { currentEvent, events, selectEvent } = useEvent();
  const activeEvent = currentEvent || events[0];
  const activeEventId = propEventId || activeEvent?.id;

  const [missionId, setMissionId] = useState('');
  const [submission, setSubmission] = useState<any>(null);
  const [mySquad, setMySquad] = useState<any>(null);
  const [availablePs, setAvailablePs] = useState<any[]>([]);
  const [isSquadLoading, setIsSquadLoading] = useState(true);
  const [selectedPsId, setSelectedPsId] = useState<string>('');
  const [lockingPs, setLockingPs] = useState(false);

  // Form fields
  const [projectTitle, setProjectTitle] = useState('');
  const [psTitle, setPsTitle] = useState(() => localStorage.getItem('whycode4u_ps_title') || '');
  const [psDescription, setPsDescription] = useState(() => localStorage.getItem('whycode4u_ps_desc') || '');
  const [repoUrl, setRepoUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [deckUrl, setDeckUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [currentRevNum, setCurrentRevNum] = useState(0);

  // Status and deadlines
  const [isDeadlineOver, setIsDeadlineOver] = useState(false);
  const [deadlineString, setDeadlineString] = useState('24 Hours');
  const [receipt, setReceipt] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [conflictMsg, setConflictMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (activeEventId) {
      loadSubmissionAndSquad();
    }
  }, [activeEventId]);

  const loadSubmissionAndSquad = async () => {
    try {
      setIsSquadLoading(true);
      setLoading(true);

      const targetId = activeEventId;
      setMissionId(targetId || '');

      // Check deadline
      if (activeEvent?.submission_deadline) {
        const deadlineDate = new Date(activeEvent.submission_deadline);
        const now = new Date();
        setDeadlineString(deadlineDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        if (now > deadlineDate && activeEvent.is_submissions_locked) {
          setIsDeadlineOver(true);
        }
      }

      // Fetch squad and available problem statements in parallel
      const [squadRes, psRes, subRes] = await Promise.allSettled([
        apiFetch<any>(`/events/${targetId}/teams/my-squad`),
        apiFetch<any>(`/events/${targetId}/problem-statements`),
        apiFetch<any>(`/events/${targetId}/submissions/my-squad`)
      ]);

      if (squadRes.status === 'fulfilled' && squadRes.value) {
        setMySquad(squadRes.value);
        if (squadRes.value.problem_statement) {
          setPsTitle(squadRes.value.problem_statement.title);
          setSelectedPsId(squadRes.value.problem_statement_id);
          localStorage.setItem('whycode4u_ps_title', squadRes.value.problem_statement.title);
          localStorage.setItem('whycode4u_selected_ps', squadRes.value.problem_statement_id);
        }
      }

      if (psRes.status === 'fulfilled' && psRes.value) {
        const list = psRes.value.problem_statements || [];
        setAvailablePs(list);
        if (list.length > 0 && !selectedPsId) {
          setSelectedPsId(list[0].id);
        }
      }

      if (subRes.status === 'fulfilled' && subRes.value) {
        const sub = subRes.value;
        setSubmission(sub);
        if (sub.final_receipt_id) {
          setReceipt({
            receipt_id: sub.final_receipt_id,
            team_name: mySquad?.name || 'Your Squad',
            content_hash: sub.latest_revision?.content_hash || 'SHA256:VERIFIED',
            server_timestamp: sub.latest_revision?.server_at || new Date().toISOString(),
            verification_qr_payload: `HACKOS:SUBMISSION:${sub.id}`
          });
        }
        if (sub.latest_revision) {
          const rev = sub.latest_revision;
          setRepoUrl(rev.repo_url || '');
          setDemoUrl(rev.demo_url || '');
          setVideoUrl(rev.video_url || '');
          setDeckUrl(rev.deck_url || '');
          setPsDescription(rev.description || '');
          setCurrentRevNum(rev.revision_number);
        }
      }
    } catch (e) {
      console.error('Failed to load submission data', e);
    } finally {
      setIsSquadLoading(false);
      setLoading(false);
    }
  };

  const handleInstantLockPs = async () => {
    if (!selectedPsId || !missionId) return;
    try {
      setLockingPs(true);
      const chosen = availablePs.find(p => p.id === selectedPsId);
      await apiFetch<any>(`/events/${missionId}/teams/lock-ps`, {
        method: 'POST',
        body: JSON.stringify({ problem_statement_id: selectedPsId })
      });

      if (chosen) {
        setPsTitle(chosen.title);
        localStorage.setItem('whycode4u_ps_title', chosen.title);
      }
      localStorage.setItem('whycode4u_selected_ps', selectedPsId);
      setSuccessMsg(`Problem statement locked! Submission fields are now open.`);
      await loadSubmissionAndSquad();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to lock problem statement');
    } finally {
      setLockingPs(false);
    }
  };

  const handlePreFillSample = () => {
    setProjectTitle('Aegis Neural Satellite Sentinel');
    setRepoUrl('https://github.com/hackos-team/aegis-orbital-ai');
    setDemoUrl('https://aegis-sentinel.web.app');
    setDeckUrl('https://pitch.com/v/aegis-telemetry-deck');
    setVideoUrl('https://youtu.be/aegis-demo-walkthrough');
    setPsDescription('Autonomous anomaly detection and telemetry recovery pipeline built for space probes and orbital telemetry.');
  };

  const handleSaveDraft = async () => {
    if (isDeadlineOver) return;
    setConflictMsg('');
    setSuccessMsg('');
    try {
      setLoading(true);
      const descCombined = projectTitle ? `[${projectTitle}] ${psDescription}` : `[PS: ${psTitle}] ${psDescription}`;
      const res = await apiFetch<any>(`/events/${missionId}/submissions/draft?expected_revision=${currentRevNum}`, {
        method: 'POST',
        body: JSON.stringify({
          repo_url: repoUrl || 'https://github.com/sample/project',
          demo_url: demoUrl || 'https://demo.app',
          video_url: videoUrl,
          deck_url: deckUrl,
          description: descCombined,
          claimed_at: new Date().toISOString()
        })
      });
      setCurrentRevNum(res.revision_number);
      setSuccessMsg(`Draft saved successfully as Revision #${res.revision_number}`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setConflictMsg(err.message || 'Draft save conflict. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalLaunch = async () => {
    if (isDeadlineOver) return;
    if (!repoUrl) {
      setConflictMsg('Please provide at minimum your Project Repository URL.');
      return;
    }

    setConflictMsg('');
    setSuccessMsg('');
    try {
      setLoading(true);
      const descCombined = projectTitle ? `[${projectTitle}] ${psDescription}` : `[PS: ${psTitle}] ${psDescription}`;
      const rcpt = await apiFetch<any>(`/events/${missionId}/submissions/launch?expected_revision=${currentRevNum}`, {
        method: 'POST',
        body: JSON.stringify({
          repo_url: repoUrl,
          demo_url: demoUrl || repoUrl,
          video_url: videoUrl,
          deck_url: deckUrl,
          description: descCombined,
          claimed_at: new Date().toISOString()
        })
      });
      setReceipt(rcpt);
      setSuccessMsg('Project officially launched! Cryptographic receipt generated.');
      loadSubmissionAndSquad();
    } catch (err: any) {
      setConflictMsg(err.message || 'Submission failed. Please check inputs.');
    } finally {
      setLoading(false);
    }
  };

  const isPsLocked = Boolean(mySquad?.is_ps_locked) || Boolean(mySquad?.problem_statement_id) || Boolean(localStorage.getItem('whycode4u_selected_ps'));

  return (
    <div className="space-y-6 max-w-4xl mx-auto text-black animate-fadeIn">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-7 rounded-3xl border border-black/[0.08] shadow-apple-card">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider bg-black text-white px-2 py-0.5 rounded-full">
              Hacker Launch Desk
            </span>
            <span className="text-xs text-neutral-400 font-medium">{activeEvent?.title}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-black tracking-tight">Project Submission Desk</h1>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-xl">
            Submit your code repository, deployed live link, presentation pitch deck, and demo video for judge evaluation.
          </p>
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

          {isDeadlineOver ? (
            <span className="text-xs font-bold uppercase tracking-wider bg-red-100 text-red-800 border border-red-300 px-3 py-1 rounded-full flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              Submissions Closed
            </span>
          ) : (
            <Badge variant="black">Revision #{currentRevNum}</Badge>
          )}
        </div>
      </div>

      {/* Track Selection Card (if not yet locked) */}
      {!isPsLocked && (
        <div className="bg-white p-6 rounded-3xl border border-black/[0.08] shadow-apple-card space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-black" />
            <h2 className="text-base font-bold text-black">Select Your Challenge Track</h2>
          </div>
          <p className="text-xs text-neutral-500">
            Pick which Problem Statement your squad is solving to activate the submission form inputs:
          </p>

          {availablePs.length === 0 ? (
            <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-2xl text-xs text-neutral-600">
              No problem statements found for this arena yet. You may still submit an open track project below.
            </div>
          ) : (
            <div className="space-y-2">
              {availablePs.map((ps) => (
                <label
                  key={ps.id}
                  onClick={() => setSelectedPsId(ps.id)}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                    selectedPsId === ps.id
                      ? 'border-black bg-neutral-50 ring-1 ring-black'
                      : 'border-neutral-200 hover:bg-neutral-50'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold bg-neutral-200 text-neutral-800 px-2 py-0.5 rounded-full uppercase">
                        {ps.track || 'Track'}
                      </span>
                      <span className="text-xs font-bold text-black">{ps.title}</span>
                    </div>
                    <p className="text-[11px] text-neutral-500 line-clamp-1">{ps.description}</p>
                  </div>
                  <input
                    type="radio"
                    name="ps_selector"
                    checked={selectedPsId === ps.id}
                    onChange={() => setSelectedPsId(ps.id)}
                    className="w-4 h-4 text-black focus:ring-black cursor-pointer"
                  />
                </label>
              ))}

              <div className="pt-2">
                <Button
                  type="button"
                  variant="primary"
                  disabled={lockingPs || !selectedPsId}
                  onClick={handleInstantLockPs}
                  className="gap-2 rounded-xl text-xs py-2 px-4 bg-black text-white hover:bg-neutral-800 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{lockingPs ? 'Locking Track...' : 'Lock Selected Track & Unlock Submission'}</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Feedback Messages */}
      {successMsg && (
        <div className="p-4 bg-neutral-900 text-white rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-apple-card animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {conflictMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-900 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-apple-card animate-fadeIn">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{conflictMsg}</span>
        </div>
      )}

      {/* Official Cryptographic Receipt Card (if already launched) */}
      {receipt && (
        <div className="bg-white p-6 rounded-3xl border border-black shadow-apple-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center font-bold text-lg shadow-sm">
                ✓
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Officially Launched & Receipt Minted
                </span>
                <h3 className="text-lg font-bold text-black mt-1">Cryptographic Submission Receipt</h3>
                <p className="text-xs text-neutral-500 font-mono">Receipt ID: {receipt.receipt_id}</p>
              </div>
            </div>

            <div className="p-2 bg-white rounded-2xl border border-neutral-200 shrink-0 self-center">
              <QRCodeSVG value={receipt.verification_qr_payload || receipt.receipt_id} size={88} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-neutral-100 text-xs font-mono">
            <div className="p-3 bg-neutral-50 rounded-xl">
              <span className="text-neutral-400 block text-[10px]">CONTENT SHA-256 HASH</span>
              <span className="text-neutral-800 font-bold truncate block">{receipt.content_hash}</span>
            </div>
            <div className="p-3 bg-neutral-50 rounded-xl">
              <span className="text-neutral-400 block text-[10px]">SUBMISSION TIMESTAMP</span>
              <span className="text-neutral-800 font-bold block">{new Date(receipt.server_timestamp).toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Submission Form Card */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-black/[0.08] shadow-apple-card space-y-5">
        <div className="flex items-center justify-between border-b border-black/[0.06] pb-4">
          <div>
            <h2 className="text-lg font-bold text-black">Project Deliverables</h2>
            <p className="text-xs text-neutral-500">Provide the links and artifacts evaluated by the jury.</p>
          </div>
          <button
            type="button"
            onClick={handlePreFillSample}
            className="text-xs font-semibold text-neutral-600 hover:text-black bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
          >
            Fill Sample Deliverables
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleFinalLaunch(); }} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Project Name / Title
              </label>
              <input
                type="text"
                value={projectTitle}
                onChange={(e) => setProjectTitle(e.target.value)}
                placeholder="e.g. Aegis Neural Satellite"
                className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-black text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Problem Statement Track
              </label>
              <input
                type="text"
                value={psTitle || 'Open Innovation Challenge'}
                readOnly
                className="w-full px-3.5 py-2.5 bg-neutral-100 border border-neutral-200 rounded-xl text-neutral-700 text-sm font-semibold cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Code Repository URL (GitHub / GitLab) *
            </label>
            <div className="relative">
              <Code className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/organization/project-repo"
                required
                className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-black text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Live Deployment / Hosted Demo URL
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="url"
                  value={demoUrl}
                  onChange={(e) => setDemoUrl(e.target.value)}
                  placeholder="https://my-app.vercel.app"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-black text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Pitch Deck URL (Slides / PDF)
              </label>
              <div className="relative">
                <Presentation className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="url"
                  value={deckUrl}
                  onChange={(e) => setDeckUrl(e.target.value)}
                  placeholder="https://pitch.com/v/deck"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-black text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Video Walkthrough / Demo Recording URL (Loom / YouTube)
            </label>
            <div className="relative">
              <Video className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=demo"
                className="w-full pl-10 pr-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-black text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
              Architecture & System Description
            </label>
            <textarea
              value={psDescription}
              onChange={(e) => setPsDescription(e.target.value)}
              rows={3}
              placeholder="Explain the tech stack, algorithmic innovations, and deployment instructions for judges..."
              className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-black text-sm focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black"
            />
          </div>

          <div className="pt-3 border-t border-black/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={loading || isDeadlineOver}
              onClick={handleSaveDraft}
              className="rounded-xl text-xs py-2 px-4 cursor-pointer"
            >
              {loading ? 'Saving...' : `Save Draft (Rev #${currentRevNum + 1})`}
            </Button>

            <Button
              type="submit"
              disabled={loading || isDeadlineOver}
              className="gap-2 rounded-xl text-xs py-2 px-5 bg-black text-white hover:bg-neutral-800 cursor-pointer shadow-sm font-semibold"
            >
              <Rocket className="w-4 h-4" />
              <span>{loading ? 'Launching...' : 'Execute Official Final Launch'}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
