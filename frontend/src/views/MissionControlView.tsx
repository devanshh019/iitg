import React, { useState, useEffect } from 'react';
import {
  Terminal, Users, ShieldAlert, Download, Activity, CheckCircle2,
  AlertTriangle, RefreshCw, FileText, Check, X, ShieldCheck
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
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
    <div className="space-y-5 max-w-5xl mx-auto text-black">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-black/[0.08] p-5 sm:p-6 rounded-3xl shadow-apple-card">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Terminal className="w-5 h-5 text-black" />
            <h1 className="text-xl sm:text-2xl font-bold text-black tracking-tight">Mission Control (Admin)</h1>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500">
            Real-time telemetry, duplicate review inbox, immutable audit chain, and report exports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleVerifyAuditChain}
            isLoading={verifyingAudit}
            className="gap-2 rounded-xl text-xs"
          >
            <ShieldCheck className="w-4 h-4 text-black" />
            <span>Verify Audit Chain</span>
          </Button>

          <Button variant="secondary" size="sm" onClick={() => triggerExport('xlsx')} className="gap-2 rounded-xl text-xs">
            <Download className="w-4 h-4" />
            <span>Master XLSX</span>
          </Button>

          <Button variant="primary" size="sm" onClick={() => triggerExport('pdf')} className="gap-2 rounded-xl shadow-apple-sm text-xs bg-black text-white hover:bg-neutral-800">
            <FileText className="w-4 h-4" />
            <span>Mission Debrief PDF</span>
          </Button>
        </div>
      </div>

      {/* Audit Verification Alert */}
      {auditVerifyResult && (
        <div
          className={`p-4 rounded-2xl border text-xs flex items-start justify-between ${
            auditVerifyResult.is_valid
              ? 'bg-neutral-50 border-neutral-300 text-black'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-bold text-sm">
              {auditVerifyResult.is_valid ? (
                <CheckCircle2 className="w-4 h-4 text-black" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              )}
              <span>{auditVerifyResult.message}</span>
            </div>
            <div>Total Blocks Verified: <span className="font-mono font-bold">{auditVerifyResult.total_entries}</span></div>
            {auditVerifyResult.tip_hash && <div className="font-mono truncate max-w-lg">Tip Hash: {auditVerifyResult.tip_hash}</div>}
          </div>
          <button onClick={() => setAuditVerifyResult(null)} className="text-neutral-400 hover:text-black cursor-pointer">✕</button>
        </div>
      )}

      {/* Funnel Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {[
          { label: 'Registered Crew', val: funnel?.registered_crew || 120 },
          { label: 'Formed Teams', val: funnel?.formed_squads || 25 },
          { label: 'Checked In', val: funnel?.boarded_crew || 86 },
          { label: 'Project Submissions', val: funnel?.launched_projects || 15 }
        ].map((metric, i) => (
          <Card key={i} className="text-center p-4 bg-white rounded-3xl">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">{metric.label}</span>
            <span className="text-2xl sm:text-3xl font-bold font-mono text-black mt-1 block">{metric.val}</span>
          </Card>
        ))}
      </div>

      {/* Main Split: Dedupe Inbox & Live Audit Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Dedupe Inbox */}
        <div className="lg:col-span-2 space-y-5">
          <Card className="bg-white rounded-3xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-black" />
                <h3 className="font-bold text-sm text-black uppercase tracking-wide">
                  Dedupe Inbox (Organizer Review)
                </h3>
              </div>
              <Badge variant="neutral">{dedupeMatches.length} Conflicts Flagged</Badge>
            </div>

            {dedupeMatches.length === 0 ? (
              <div className="p-8 text-center text-neutral-400 text-xs font-medium">
                No active duplicate anomalies. All registrations verified clean.
              </div>
            ) : (
              <div className="space-y-3">
                {dedupeMatches.map((cand) => (
                  <div key={cand.id} className="p-4 bg-neutral-50 border border-neutral-200/90 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-black text-sm">{cand.name}</span>
                        <Badge variant="neutral" size="sm">Potential Duplicate</Badge>
                      </div>
                      <div className="text-xs text-neutral-500 font-mono">
                        Email: {cand.email} | Phone: {cand.phone || 'N/A'} | College: {cand.college || 'N/A'}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleResolveDedupe(cand.id, cand.id, 'keep_both')}
                        className="text-xs py-1 px-3 rounded-xl"
                      >
                        Keep Both
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResolveDedupe(cand.id, cand.id, 'merge')}
                        className="text-xs py-1 px-3 rounded-xl"
                      >
                        Merge
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleResolveDedupe(cand.id, cand.id, 'reject')}
                        className="text-xs py-1 px-3 rounded-xl"
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
          <Card className="bg-white rounded-3xl">
            <h3 className="font-bold text-sm text-black uppercase tracking-wide mb-3">
              Attendance & Telemetry CSV Exports
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Participants CSV', type: 'participants' },
                { label: 'Teams CSV', type: 'squads' },
                { label: 'Attendance CSV', type: 'attendance' },
                { label: 'Audit Trail CSV', type: 'audit' }
              ].map(exp => (
                <Button
                  key={exp.type}
                  variant="secondary"
                  size="sm"
                  onClick={() => triggerExport('csv', exp.type)}
                  className="text-xs rounded-xl"
                >
                  {exp.label}
                </Button>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Col: Live Activity Feed */}
        <div className="space-y-5">
          <Card className="bg-white rounded-3xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-black" />
                <h3 className="font-bold text-sm text-black uppercase tracking-wide">
                  Live Audit Ledger
                </h3>
              </div>
              <span className="text-[10px] font-bold text-black animate-pulse font-mono">● LIVE</span>
            </div>

            <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
              {auditFeed.map((item) => (
                <div key={item.id} className="p-2.5 bg-neutral-50 border border-neutral-200/80 rounded-2xl text-xs">
                  <div className="flex justify-between items-center text-neutral-600">
                    <span className="font-bold text-black">{item.action}</span>
                    <span className="text-[10px] text-neutral-400 font-mono">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-500 mt-0.5">
                    Entity: {item.entity_type} ({item.entity_id.substring(0, 8)}...)
                  </div>
                  <div className="text-[10px] text-neutral-400 font-mono mt-0.5 truncate">
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
