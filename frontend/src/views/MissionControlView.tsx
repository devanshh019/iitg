import React, { useState, useEffect } from 'react';
import {
  Terminal, Users, ShieldAlert, Download, Activity, CheckCircle2,
  AlertTriangle, RefreshCw, FileText, Check, X, ShieldCheck
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { apiFetch } from '../api/client';

interface MissionControlViewProps {
  eventId?: string;
}

export const MissionControlView: React.FC<MissionControlViewProps> = ({ eventId = 'apollo-24' }) => {
  const [missionId, setMissionId] = useState('');
  const [funnel, setFunnel] = useState<any>(null);
  const [auditFeed, setAuditFeed] = useState<any[]>([]);
  const [auditVerifyResult, setAuditVerifyResult] = useState<any>(null);
  const [dedupeMatches, setDedupeMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifyingAudit, setVerifyingAudit] = useState(false);

  useEffect(() => {
    loadMissionControl();
  }, [eventId]);

  const loadMissionControl = async () => {
    try {
      setLoading(true);
      const ev = await apiFetch(`/events/by-slug/${eventId}`);
      setMissionId(ev.id);

      const f = await apiFetch(`/events/${ev.id}/funnel`);
      setFunnel(f.funnel);

      const feed = await apiFetch(`/audit/feed?event_id=${ev.id}&limit=25`);
      setAuditFeed(feed);

      // Check participants flagged duplicate for Dedupe Inbox
      const parts = await apiFetch(`/events/${ev.id}/participants`);
      const flagged = parts.filter((p: any) => p.status === 'flagged_duplicate');
      setDedupeMatches(flagged);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAuditChain = async () => {
    try {
      setVerifyingAudit(true);
      const rep = await apiFetch(`/audit/verify${missionId ? `?event_id=${missionId}` : ''}`);
      setAuditVerifyResult(rep);
    } catch (e: any) {
      alert('Verification request failed: ' + e.message);
    } finally {
      setVerifyingAudit(false);
    }
  };

  const handleResolveDedupe = async (primaryId: string, secondaryId: string, action: string) => {
    try {
      await apiFetch(`/events/${missionId}/participants/dedupe/resolve`, {
        method: 'POST',
        body: JSON.stringify({ primary_id: primaryId, secondary_id: secondaryId, action })
      });
      loadMissionControl();
    } catch (err: any) {
      alert('Failed to resolve dedupe: ' + err.message);
    }
  };

  const triggerExport = (format: 'csv' | 'xlsx' | 'pdf', type = 'participants') => {
    if (!missionId) return;
    if (format === 'csv') {
      window.open(`/api/events/${missionId}/exports/csv?export_type=${type}`, '_blank');
    } else if (format === 'xlsx') {
      window.open(`/api/events/${missionId}/exports/xlsx`, '_blank');
    } else {
      window.open(`/api/events/${missionId}/exports/pdf/debrief`, '_blank');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Top Telemetry Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-space-900 border border-space-800 p-6 rounded-2xl shadow-glass">
        <div>
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-cyan-400" />
            <h1 className="text-2xl font-bold font-mono text-white tracking-tight">Mission Control Command Center</h1>
          </div>
          <p className="text-xs font-mono text-slate-400 mt-1">
            Real-time telemetry, deduplication inbox, immutable audit chain, and report exports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleVerifyAuditChain}
            isLoading={verifyingAudit}
            className="gap-2 border-cyan-500/40 text-cyan-300"
          >
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Verify Audit Chain</span>
          </Button>

          <Button variant="secondary" size="sm" onClick={() => triggerExport('xlsx')} className="gap-2">
            <Download className="w-4 h-4" />
            <span>Master XLSX</span>
          </Button>

          <Button variant="primary" size="sm" onClick={() => triggerExport('pdf')} className="gap-2 shadow-glow-cyan">
            <FileText className="w-4 h-4" />
            <span>Mission Debrief PDF</span>
          </Button>
        </div>
      </div>

      {/* Audit Verification Alert if run */}
      {auditVerifyResult && (
        <div
          className={`p-4 rounded-xl border font-mono text-xs flex items-start justify-between ${
            auditVerifyResult.is_valid
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold text-sm">
              {auditVerifyResult.is_valid ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400" />
              )}
              <span>{auditVerifyResult.message}</span>
            </div>
            <div>Total Blocks Verified: {auditVerifyResult.total_entries}</div>
            {auditVerifyResult.tip_hash && <div>Tip Hash: {auditVerifyResult.tip_hash}</div>}
          </div>
          <button onClick={() => setAuditVerifyResult(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Funnel Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Registered Crew', val: funnel?.registered_crew || 120, color: 'text-cyan-400' },
          { label: 'Formed Squads', val: funnel?.formed_squads || 25, color: 'text-blue-400' },
          { label: 'Boarded at Gate', val: funnel?.boarded_crew || 86, color: 'text-amber-400' },
          { label: 'Project Launches', val: funnel?.launched_projects || 15, color: 'text-emerald-400' }
        ].map((metric, i) => (
          <Card key={i} className="text-center p-4">
            <span className="text-xs font-mono text-slate-400 uppercase tracking-wider block">{metric.label}</span>
            <span className={`text-3xl font-bold font-mono ${metric.color} mt-1 block`}>{metric.val}</span>
          </Card>
        ))}
      </div>

      {/* Main Split: Dedupe Inbox & Live Audit Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Dedupe Inbox */}
        <div className="lg:col-span-2 space-y-6">
          <Card glow="amber">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <h3 className="font-mono font-bold text-sm text-slate-100 uppercase tracking-wider">
                  Dedupe Inbox (Organizer Review)
                </h3>
              </div>
              <Badge variant="amber">{dedupeMatches.length} CONFLICTS FLAGGED</Badge>
            </div>

            {dedupeMatches.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-mono text-xs">
                No active duplicate anomalies. All crew registrations verified clean.
              </div>
            ) : (
              <div className="space-y-3">
                {dedupeMatches.map((cand) => (
                  <div key={cand.id} className="p-4 bg-space-950 border border-amber-500/30 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{cand.name}</span>
                        <Badge variant="amber" size="sm">POTENTIAL DUPLICATE</Badge>
                      </div>
                      <div className="text-xs font-mono text-slate-400 mt-1">
                        Email: {cand.email} | Phone: {cand.phone || 'N/A'} | College: {cand.college || 'N/A'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleResolveDedupe(cand.id, cand.id, 'keep_both')}
                        className="text-xs py-1 px-2.5"
                      >
                        Keep Both
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResolveDedupe(cand.id, cand.id, 'merge')}
                        className="text-xs py-1 px-2.5 text-cyan-400 border-cyan-500/40"
                      >
                        Merge
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleResolveDedupe(cand.id, cand.id, 'reject')}
                        className="text-xs py-1 px-2.5"
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Quick CSV Export Shortcuts */}
          <Card>
            <h3 className="font-mono font-bold text-sm text-slate-100 uppercase tracking-wider mb-3">
              Telemetry & Attendance CSV Exports
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Crew CSV', type: 'participants' },
                { label: 'Squads CSV', type: 'squads' },
                { label: 'Attendance CSV', type: 'attendance' },
                { label: 'Audit Trail CSV', type: 'audit' }
              ].map(exp => (
                <Button
                  key={exp.type}
                  variant="secondary"
                  size="sm"
                  onClick={() => triggerExport('csv', exp.type)}
                  className="text-xs font-mono"
                >
                  {exp.label}
                </Button>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Col: Live Activity Feed from Hash Audit Ledger */}
        <div className="space-y-6">
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <h3 className="font-mono font-bold text-sm text-slate-100 uppercase tracking-wider">
                  Live Audit Ledger
                </h3>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 animate-pulse">● LIVE STREAM</span>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {auditFeed.map((item) => (
                <div key={item.id} className="p-2.5 bg-space-950/70 border border-space-850 rounded-lg text-xs font-mono">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="text-cyan-400 font-bold">{item.action}</span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1">
                    Entity: {item.entity_type} ({item.entity_id.substring(0, 8)}...)
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    Hash: {item.hash}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
