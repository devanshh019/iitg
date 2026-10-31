import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Rocket, History, CheckCircle2, AlertTriangle, ShieldCheck, ExternalLink, Hash, Clock } from 'lucide-react';
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
  const [repoUrl, setRepoUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [deckUrl, setDeckUrl] = useState('');
  const [description, setDescription] = useState('');
  const [currentRevNum, setCurrentRevNum] = useState(0);

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

      const sub = await apiFetch(`/events/${ev.id}/submissions/my-squad`);
      if (sub) {
        setSubmission(sub);
        if (sub.latest_revision) {
          const rev = sub.latest_revision;
          setRepoUrl(rev.repo_url || '');
          setDemoUrl(rev.demo_url || '');
          setVideoUrl(rev.video_url || '');
          setDeckUrl(rev.deck_url || '');
          setDescription(rev.description || '');
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
          description,
          claimed_at: new Date().toISOString()
        })
      });
      setCurrentRevNum(res.revision_number);
      setSuccessMsg(`Draft saved! Revision #${res.revision_number} recorded with SHA-256 hash.`);
      loadSubmission();
    } catch (err: any) {
      setConflictMsg(err.message || 'Save failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalLaunch = async () => {
    if (!confirm('Are you ready to initiate Final Launch? This issues a cryptographically verified Launch Receipt.')) {
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
          description,
          claimed_at: new Date().toISOString()
        })
      });
      setReceipt(rcpt);
      loadSubmission();
    } catch (err: any) {
      setConflictMsg(err.message || 'Launch failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-cyan-400" />
            <h1 className="text-2xl font-bold font-mono text-white tracking-tight">Project Launch Desk</h1>
          </div>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Submit your deliverables. Revisions are immutable, SHA-256 hashed, and time-stamped by Mission Control.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="cyan">CURRENT REVISION: #{currentRevNum}</Badge>
        </div>
      </div>

      {conflictMsg && (
        <div className="p-4 bg-rose-950/60 border border-rose-500/50 rounded-xl text-rose-300 text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{conflictMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Launch Receipt Banner if Issued */}
      {receipt && (
        <Card glow="cyan" className="bg-gradient-to-r from-space-900 to-cyan-950/40 border-cyan-500/50">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <Badge variant="cyan" className="mb-2">VERIFIED LAUNCH RECEIPT</Badge>
              <h2 className="text-xl font-bold font-mono text-white">Receipt ID: {receipt.receipt_id}</h2>
              <div className="text-xs font-mono text-slate-300 space-y-1 mt-2">
                <div>Squad: <span className="text-cyan-400 font-bold">{receipt.team_name}</span></div>
                <div>SHA-256 Hash: <span className="text-amber-400">{receipt.content_hash}</span></div>
                <div>Server Timestamp: <span>{new Date(receipt.server_timestamp).toUTCString()}</span></div>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl shadow-lg shrink-0">
              <QRCodeSVG value={receipt.verification_qr_payload} size={110} />
            </div>
          </div>
        </Card>
      )}

      {/* Submission Form */}
      <Card>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-mono text-slate-300 block mb-1">Source Code Repository (GitHub / GitLab)</label>
            <input
              type="url"
              placeholder="https://github.com/your-squad/mission-project"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="w-full bg-space-950 border border-space-800 rounded-lg p-2.5 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1">Live Demo URL</label>
              <input
                type="url"
                placeholder="https://launch-demo.live"
                value={demoUrl}
                onChange={(e) => setDemoUrl(e.target.value)}
                className="w-full bg-space-950 border border-space-800 rounded-lg p-2.5 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-slate-300 block mb-1">Demo Video (YouTube / Loom)</label>
              <input
                type="url"
                placeholder="https://youtube.com/watch?v=..."
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                className="w-full bg-space-950 border border-space-800 rounded-lg p-2.5 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-mono text-slate-300 block mb-1">Pitch Deck URL</label>
            <input
              type="url"
              placeholder="https://pitch.com/deck/..."
              value={deckUrl}
              onChange={(e) => setDeckUrl(e.target.value)}
              className="w-full bg-space-950 border border-space-800 rounded-lg p-2.5 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="text-xs font-mono text-slate-300 block mb-1">Executive Summary & Architectural Overview</label>
            <textarea
              rows={5}
              placeholder="Describe the problem, telemetry, architecture, and technology stack used..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-space-950 border border-space-800 rounded-lg p-3 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-space-800">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Protected by Optimistic Concurrency Engine</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button variant="secondary" size="md" onClick={handleSaveDraft} isLoading={loading} className="w-full sm:w-auto">
                Save Draft (Rev #{currentRevNum + 1})
              </Button>
              <Button variant="primary" size="md" onClick={handleFinalLaunch} isLoading={loading} className="w-full sm:w-auto gap-2">
                <Rocket className="w-4 h-4" />
                <span>Initiate Final Launch</span>
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
