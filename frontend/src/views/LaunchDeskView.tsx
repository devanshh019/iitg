import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Rocket, CheckCircle2, AlertTriangle, ShieldCheck, Code, Globe, Video, Presentation, FileText, Lock } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { apiFetch } from '../api/client';

interface LaunchDeskViewProps {
  eventId?: string;
}

export const LaunchDeskView: React.FC<LaunchDeskViewProps> = ({ eventId = 'apollo-24' }) => {
  const [missionId, setMissionId] = useState('');
  const [submission, setSubmission] = useState<any>(null);
  
  // Form fields as requested by user
  const [psTitle, setPsTitle] = useState(() => localStorage.getItem('whycode4u_ps_title') || 'Autonomous Edge Diagnostics');
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
    loadSubmission();
  }, [eventId]);

  const loadSubmission = async () => {
    try {
      setLoading(true);
      const ev = await apiFetch(`/events/by-slug/${eventId}`);
      setMissionId(ev.id);

      // Check deadline
      if (ev.submission_deadline) {
        const deadlineDate = new Date(ev.submission_deadline);
        const now = new Date();
        setDeadlineString(deadlineDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        if (now > deadlineDate && ev.is_submissions_locked) {
          setIsDeadlineOver(true);
        }
      }

      const sub = await apiFetch(`/events/${ev.id}/submissions/my-squad`);
      if (sub) {
        setSubmission(sub);
        if (sub.final_receipt_id) {
          setReceipt({
            receipt_id: sub.final_receipt_id,
            team_name: 'Your Squad',
            content_hash: sub.latest_revision?.content_hash || 'SHA256:VERIFIED',
            server_timestamp: sub.latest_revision?.server_at || new Date().toISOString(),
            verification_qr_payload: `WHYCODE4U:SUBMISSION:${sub.id}`
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
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (isDeadlineOver) return;
    setConflictMsg('');
    setSuccessMsg('');
    try {
      setLoading(true);
      const res = await apiFetch(`/events/${missionId}/submissions/draft?expected_revision=${currentRevNum}`, {
        method: 'POST',
        body: JSON.stringify({
          repo_url: repoUrl,
          demo_url: demoUrl,
          video_url: videoUrl,
          deck_url: deckUrl,
          description: `[PS: ${psTitle}] ${psDescription}`,
          claimed_at: new Date().toISOString()
        })
      });
      setCurrentRevNum(res.revision_number);
      setSuccessMsg(`Draft saved! Revision #${res.revision_number} recorded.`);
      loadSubmission();
    } catch (err: any) {
      setConflictMsg(err.message || 'Draft save failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalLaunch = async () => {
    if (isDeadlineOver) return;
    if (!repoUrl.trim() || !demoUrl.trim()) {
      setConflictMsg('Please provide both GitHub repository URL and Live Demo URL before submitting.');
      return;
    }

    if (!confirm('Submit final project? Once submitted, your Launch Receipt is issued for flight evaluation.')) {
      return;
    }

    setConflictMsg('');
    setSuccessMsg('');
    try {
      setLoading(true);
      const rcpt = await apiFetch(`/events/${missionId}/submissions/launch?expected_revision=${currentRevNum}`, {
        method: 'POST',
        body: JSON.stringify({
          repo_url: repoUrl,
          demo_url: demoUrl,
          video_url: videoUrl,
          deck_url: deckUrl,
          description: `[PS: ${psTitle}] ${psDescription}`,
          claimed_at: new Date().toISOString()
        })
      });
      setReceipt(rcpt);
      setSuccessMsg('Project successfully submitted! Receipt generated.');
      loadSubmission();
    } catch (err: any) {
      setConflictMsg(err.message || 'Submission failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-4xl mx-auto text-black">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-black/[0.08] shadow-apple-card">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Rocket className="w-5 h-5 text-black" />
            <h1 className="text-xl sm:text-2xl font-bold text-black tracking-tight">Project Submission</h1>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500">
            Submit your project deliverables stage by stage. Once the deadline passes, submissions freeze permanently.
          </p>
        </div>

        <div className="flex items-center gap-2">
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

      {/* Strict Deadline Over Banner */}
      {isDeadlineOver && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-900 text-xs flex items-center gap-3 animate-fadeIn">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <div>
            <span className="font-bold block text-sm">Deadline Has Expired</span>
            <span>The hackathon submission deadline has passed. No new projects or modifications can be accepted.</span>
          </div>
        </div>
      )}

      {conflictMsg && (
        <div className="p-4 bg-neutral-50 border border-red-200 rounded-2xl text-red-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{conflictMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-neutral-50 border border-neutral-300 rounded-2xl text-black text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-black" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Launch Receipt Card */}
      {receipt && (
        <Card className="bg-white border-black ring-1 ring-black shadow-apple-lift rounded-3xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-black text-white px-2.5 py-0.5 rounded-full inline-block mb-2">
                Official Submission Receipt
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-black">Receipt ID: {receipt.receipt_id}</h2>
              <div className="text-xs text-neutral-600 space-y-1 mt-2">
                <div>Team: <span className="text-black font-bold">{receipt.team_name}</span></div>
                <div className="truncate max-w-md font-mono text-[11px]">Hash: {receipt.content_hash}</div>
                <div>Timestamp: <span>{new Date(receipt.server_timestamp).toLocaleString()}</span></div>
              </div>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-neutral-200 shadow-sm shrink-0">
              <QRCodeSVG value={receipt.verification_qr_payload} size={110} />
            </div>
          </div>
        </Card>
      )}

      {/* Stage-wise Submission Form */}
      <Card className="bg-white rounded-3xl">
        <form onSubmit={(e) => { e.preventDefault(); handleFinalLaunch(); }} className="space-y-5">
          {/* Stage 1: Problem Statement Details */}
          <div className="space-y-3 pb-4 border-b border-neutral-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">
              Stage 1: Problem Statement & Solution Summary
            </span>

            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1">
                Problem Statement Title
              </label>
              <input
                type="text"
                disabled={isDeadlineOver}
                value={psTitle}
                onChange={(e) => setPsTitle(e.target.value)}
                placeholder="e.g. Autonomous Real-time Edge Diagnostics"
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-sm text-black focus:outline-none focus:border-black disabled:opacity-50"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1">
                Solution Description & Architecture
              </label>
              <textarea
                rows={3}
                disabled={isDeadlineOver}
                value={psDescription}
                onChange={(e) => setPsDescription(e.target.value)}
                placeholder="Explain the problem you solved, your core approach, and the libraries/models used..."
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-sm text-black focus:outline-none focus:border-black disabled:opacity-50"
              />
            </div>
          </div>

          {/* Stage 2: Code & Deployment Deliverables */}
          <div className="space-y-3 pb-4 border-b border-neutral-100">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">
              Stage 2: Code Repository & Live Deployment Links
            </span>

            <div>
              <label className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5 mb-1">
                <Code className="w-4 h-4 text-black" />
                <span>Git Repository Link (GitHub / GitLab) *</span>
              </label>
              <input
                type="url"
                required
                disabled={isDeadlineOver}
                placeholder="https://github.com/myteam/whycode4u-project"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-sm text-black focus:outline-none focus:border-black disabled:opacity-50 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5 mb-1">
                <Globe className="w-4 h-4 text-black" />
                <span>Live Deployment Link (Vercel / Netlify / Cloud) *</span>
              </label>
              <input
                type="url"
                required
                disabled={isDeadlineOver}
                placeholder="https://my-app.vercel.app"
                value={demoUrl}
                onChange={(e) => setDemoUrl(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-sm text-black focus:outline-none focus:border-black disabled:opacity-50 font-mono"
              />
            </div>
          </div>

          {/* Stage 3: Presentation & Demo Video */}
          <div className="space-y-3 pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">
              Stage 3: Pitch Deck & Optional Demo Video
            </span>

            <div>
              <label className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5 mb-1">
                <Presentation className="w-4 h-4 text-black" />
                <span>Pitch Deck / Presentation Slides URL *</span>
              </label>
              <input
                type="url"
                required
                disabled={isDeadlineOver}
                placeholder="https://pitch.com/deck/..."
                value={deckUrl}
                onChange={(e) => setDeckUrl(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-sm text-black focus:outline-none focus:border-black disabled:opacity-50 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-neutral-700 flex items-center gap-1.5 mb-1">
                <Video className="w-4 h-4 text-neutral-500" />
                <span>Demo Video URL (YouTube / Loom) — Optional</span>
              </label>
              <input
                type="url"
                disabled={isDeadlineOver}
                placeholder="https://youtube.com/watch?v=..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-sm text-black focus:outline-none focus:border-black disabled:opacity-50 font-mono"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-neutral-100">
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <ShieldCheck className="w-4 h-4 text-black" />
              <span>Cryptographically signed with SHA-256 timestamp</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="md"
                type="button"
                onClick={handleSaveDraft}
                disabled={isDeadlineOver || loading}
                className="w-full sm:w-auto text-xs rounded-xl"
              >
                Save Draft (Rev #{currentRevNum + 1})
              </Button>
              <Button
                variant="primary"
                size="md"
                type="submit"
                disabled={isDeadlineOver || loading}
                className="w-full sm:w-auto gap-1.5 shadow-sm text-xs rounded-xl bg-black text-white hover:bg-neutral-800"
              >
                <Rocket className="w-4 h-4" />
                <span>Submit Final Project</span>
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
};
