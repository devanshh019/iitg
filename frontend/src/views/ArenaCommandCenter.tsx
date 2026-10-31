import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QrCode, Users, Shield, Trophy, Bell, Rocket, ArrowLeft, CheckCircle2,
  AlertTriangle, Lock, Unlock, Search, Download, Plus, Check, X,
  ExternalLink, Clock, RefreshCw, AlertCircle, FileText, Sparkles, Filter
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { apiFetch } from '../api/client';
import { useEvent } from '../context/EventContext';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface ArenaCommandCenterProps {
  arena?: any;
  organization?: any;
  onBack?: () => void;
}

export const ArenaCommandCenter: React.FC<ArenaCommandCenterProps> = ({ arena: propArena, organization: propOrg, onBack }) => {
  const { currentEvent, events, selectEvent } = useEvent();
  const arena = propArena || currentEvent || events[0] || { id: '', title: 'Select Hackathon Arena', slug: '' };
  const organization = propOrg || { name: 'HackOS Federation' };
  const [activeTab, setActiveTab] = useState<'scan' | 'participants' | 'squads' | 'judges' | 'broadcast' | 'submissions'>('scan');
  const [loading, setLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Data states
  const [participants, setParticipants] = useState<any[]>([]);
  const [squads, setSquads] = useState<any[]>([]);
  const [judgeAssignments, setJudgeAssignments] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);

  // Scan state
  const [manualCode, setManualCode] = useState('');
  const [scanResult, setScanResult] = useState<any | null>(null);
  const [scanningActive, setScanningActive] = useState(false);
  const [cameraScanner, setCameraScanner] = useState<any | null>(null);

  // Timer & Schedule
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleStartsAt, setScheduleStartsAt] = useState('');
  const [scheduleDeadline, setScheduleDeadline] = useState('');
  const [scheduleStatus, setScheduleStatus] = useState('ongoing');
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Search & Filter
  const [partSearch, setPartSearch] = useState('');
  const [partStatusFilter, setPartStatusFilter] = useState<'all' | 'boarded' | 'registered'>('all');
  const [squadSearch, setSquadSearch] = useState('');

  // Modals for squads
  const [penaltyModalSquad, setPenaltyModalSquad] = useState<any | null>(null);
  const [penaltyPoints, setPenaltyPoints] = useState('5');
  const [penaltyReason, setPenaltyReason] = useState('Deadline infraction or guideline violation');

  const [blacklistModalSquad, setBlacklistModalSquad] = useState<any | null>(null);
  const [blacklistReason, setBlacklistReason] = useState('Plagiarism / Code of conduct violation');

  // Broadcast Form
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annPriority, setAnnPriority] = useState('normal');
  const [annPinned, setAnnPinned] = useState(false);

  const eventId = arena.id;

  useEffect(() => {
    loadAllArenaData();
  }, [eventId]);

  const loadAllArenaData = async () => {
    try {
      setLoading(true);
      const [parts, sqds, asgns, ldr, anns] = await Promise.allSettled([
        apiFetch<any[]>(`/events/${eventId}/participants`),
        apiFetch<any[]>(`/events/${eventId}/teams`),
        apiFetch<any[]>(`/events/${eventId}/judging/assignments`),
        apiFetch<any[]>(`/events/${eventId}/judging/leaderboard`),
        apiFetch<any[]>(`/events/${eventId}/announcements`)
      ]);

      if (parts.status === 'fulfilled') setParticipants(parts.value || []);
      if (sqds.status === 'fulfilled') setSquads(sqds.value || []);
      if (asgns.status === 'fulfilled') setJudgeAssignments(asgns.value || []);
      if (ldr.status === 'fulfilled') setLeaderboard(ldr.value || []);
      if (anns.status === 'fulfilled') setAnnouncements(anns.value || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const handleMakeLive = async () => {
    try {
      const nowIso = new Date().toISOString();
      await apiFetch<any>(`/events/${eventId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'ongoing',
          starts_at: nowIso
        })
      });
      showNotification(`Arena "${arena.title}" is now officially LIVE! Kickoff timer started.`);
      await loadAllArenaData();
    } catch (err: any) {
      alert(err.message || 'Failed to make live');
    }
  };

  const handleOpenScheduleModal = () => {
    setShowScheduleModal(true);
    setScheduleStatus(arena.status || 'ongoing');
    if (arena.starts_at) {
      setScheduleStartsAt(new Date(arena.starts_at).toISOString().slice(0, 16));
    } else {
      setScheduleStartsAt(new Date().toISOString().slice(0, 16));
    }
    if (arena.submission_deadline) {
      setScheduleDeadline(new Date(arena.submission_deadline).toISOString().slice(0, 16));
    } else {
      const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
      setScheduleDeadline(d.toISOString().slice(0, 16));
    }
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSchedule(true);
      await apiFetch<any>(`/events/${eventId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: scheduleStatus,
          starts_at: scheduleStartsAt ? new Date(scheduleStartsAt).toISOString() : undefined,
          submission_deadline: scheduleDeadline ? new Date(scheduleDeadline).toISOString() : undefined
        })
      });
      showNotification(`Schedule and timer updated successfully!`);
      setShowScheduleModal(false);
      await loadAllArenaData();
    } catch (err: any) {
      alert(err.message || 'Failed to update schedule');
    } finally {
      setSavingSchedule(false);
    }
  };

  const toggleCameraScanner = () => {
    if (scanningActive) {
      if (cameraScanner) {
        try { cameraScanner.clear(); } catch (e) {}
      }
      setScanningActive(false);
      setCameraScanner(null);
    } else {
      setScanningActive(true);
      setTimeout(() => {
        try {
          const scanner = new Html5QrcodeScanner(
            'reader-scanner',
            { fps: 10, qrbox: { width: 220, height: 220 } },
            /* verbose= */ false
          );
          scanner.render(
            (decodedText: string) => {
              handleScanOrCode(decodedText);
            },
            (error: any) => {
              // scanning frame error (normal during search)
            }
          );
          setCameraScanner(scanner);
        } catch (e) {
          console.error('Camera init error', e);
        }
      }, 100);
    }
  };

  // 1. QR Attendance & Manual Scan
  const handleScanOrCode = async (tokenOrCode: string) => {
    if (!tokenOrCode.trim()) return;
    try {
      const res = await apiFetch<any>(`/events/${eventId}/boarding/scan`, {
        method: 'POST',
        body: JSON.stringify({ token_or_code: tokenOrCode.trim(), station: 'Gate Command Desk' })
      });
      setScanResult(res);
      setManualCode('');
      showNotification(`Attendance confirmed for ${res.name}!`);
      // Refresh participant list
      const parts = await apiFetch<any[]>(`/events/${eventId}/participants`);
      setParticipants(parts || []);
    } catch (err: any) {
      alert(err.message || 'Check-in failed. Please verify token or code.');
    }
  };

  // 2. Squad Controls: Penalties, Blacklist, Round Progression
  const handleApplyPenalty = async () => {
    if (!penaltyModalSquad) return;
    try {
      const res = await apiFetch<any>(`/events/${eventId}/teams/${penaltyModalSquad.id}/penalty`, {
        method: 'POST',
        body: JSON.stringify({ points: parseInt(penaltyPoints) || 5, reason: penaltyReason })
      });
      showNotification(res.message);
      setPenaltyModalSquad(null);
      const sqds = await apiFetch<any[]>(`/events/${eventId}/teams`);
      setSquads(sqds || []);
    } catch (err: any) {
      alert(err.message || 'Failed to apply penalty');
    }
  };

  const handleToggleBlacklist = async () => {
    if (!blacklistModalSquad) return;
    const isCurrentlyBlacklisted = blacklistModalSquad.is_blacklisted;
    try {
      const res = await apiFetch<any>(`/events/${eventId}/teams/${blacklistModalSquad.id}/blacklist`, {
        method: 'POST',
        body: JSON.stringify({ is_blacklisted: !isCurrentlyBlacklisted, reason: blacklistReason })
      });
      showNotification(res.message);
      setBlacklistModalSquad(null);
      const sqds = await apiFetch<any[]>(`/events/${eventId}/teams`);
      setSquads(sqds || []);
    } catch (err: any) {
      alert(err.message || 'Failed to toggle blacklist');
    }
  };

  const handleUpdateRound = async (squadId: string, newRound: string) => {
    try {
      const res = await apiFetch<any>(`/events/${eventId}/teams/${squadId}/round`, {
        method: 'POST',
        body: JSON.stringify({ round_status: newRound, feedback: `Advanced by organizer to ${newRound}` })
      });
      showNotification(res.message);
      const sqds = await apiFetch<any[]>(`/events/${eventId}/teams`);
      setSquads(sqds || []);
    } catch (err: any) {
      alert(err.message || 'Failed to update round');
    }
  };

  // 3. Judge Auto-Balance & Conflict
  const handleAutoAssignJudges = async () => {
    try {
      const res = await apiFetch<any>(`/events/${eventId}/judging/auto-assign`, { method: 'POST' });
      showNotification(res.message);
      const asgns = await apiFetch<any[]>(`/events/${eventId}/judging/assignments`);
      setJudgeAssignments(asgns || []);
    } catch (err: any) {
      alert(err.message || 'Failed to auto-assign judges');
    }
  };

  const handleDeclareConflict = async (assignmentId: string) => {
    const reason = prompt('Enter conflict of interest reason (e.g. mentor affiliation, alma mater):');
    if (!reason) return;
    try {
      const res = await apiFetch<any>(`/events/${eventId}/judging/declare-conflict`, {
        method: 'POST',
        body: JSON.stringify({ assignment_id: assignmentId, reason })
      });
      showNotification(res.message);
      const asgns = await apiFetch<any[]>(`/events/${eventId}/judging/assignments`);
      setJudgeAssignments(asgns || []);
    } catch (err: any) {
      alert(err.message || 'Failed to declare conflict');
    }
  };

  // 4. Broadcast Announcement
  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle || !annContent) return;
    try {
      const res = await apiFetch<any>(`/events/${eventId}/announcements`, {
        method: 'POST',
        body: JSON.stringify({
          title: annTitle,
          content: annContent,
          priority: annPriority,
          is_pinned: annPinned
        })
      });
      showNotification(`Announcement "${res.title}" broadcast to all crew!`);
      setAnnTitle('');
      setAnnContent('');
      const anns = await apiFetch<any[]>(`/events/${eventId}/announcements`);
      setAnnouncements(anns || []);
    } catch (err: any) {
      alert(err.message || 'Failed to broadcast');
    }
  };

  // 5. Export CSV
  const handleExportCSV = () => {
    const headers = ['Team Name', 'Track', 'Locked PS', 'Round Status', 'Penalty Points', 'Blacklisted', 'Member Count'];
    const rows = squads.map(s => [
      `"${s.name}"`,
      `"${s.track || 'General'}"`,
      `"${s.problem_statement_title || 'None'}"`,
      `"${s.round_status}"`,
      s.penalty_points || 0,
      s.is_blacklisted ? 'YES' : 'NO',
      s.member_count || 0
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${arena.slug}_hackathon_results.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Participants
  const filteredParticipants = participants.filter(p => {
    const matchesSearch = p.name?.toLowerCase().includes(partSearch.toLowerCase()) ||
      p.email?.toLowerCase().includes(partSearch.toLowerCase()) ||
      p.college?.toLowerCase().includes(partSearch.toLowerCase()) ||
      p.short_fallback_code?.toLowerCase().includes(partSearch.toLowerCase());
    if (partStatusFilter === 'boarded') return matchesSearch && p.status === 'boarded';
    if (partStatusFilter === 'registered') return matchesSearch && p.status !== 'boarded';
    return matchesSearch;
  });

  const boardedCount = participants.filter(p => p.status === 'boarded').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto text-black animate-fadeIn">
      {/* Top Header Card */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-black/[0.08] shadow-apple-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="w-9 h-9 rounded-2xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 flex items-center justify-center cursor-pointer transition-colors active:scale-95 shrink-0"
                title="Return to Organizations"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-black text-white px-2.5 py-0.5 rounded-full">
                  Operations Console
                </span>
                <span className="text-xs text-neutral-400 font-semibold truncate max-w-[200px]">
                  {organization.name}
                </span>
                {events && events.length > 1 && (
                  <select
                    value={arena.id}
                    onChange={(e) => {
                      const ev = events.find(item => item.id === e.target.value);
                      if (ev) selectEvent(ev);
                    }}
                    className="ml-2 text-xs bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded-lg px-2 py-0.5 font-semibold text-black focus:outline-none cursor-pointer"
                  >
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-black tracking-tight">
                {arena.title}
              </h1>
            </div>
          </div>

          {/* Quick Metrics Pill */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            {arena.status !== 'ongoing' && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleMakeLive}
                className="gap-1.5 rounded-xl text-xs py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-sm"
              >
                <Rocket className="w-3.5 h-3.5" />
                <span>Kickoff Live</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenScheduleModal}
              className="gap-1.5 rounded-xl text-xs py-2 px-3 cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Timer & Schedule</span>
            </Button>

            <div className="p-2.5 bg-neutral-50 rounded-2xl border border-neutral-200 text-center min-w-[85px]">
              <div className="text-[9px] uppercase font-bold text-neutral-400">Checked In</div>
              <div className="text-base font-mono font-bold text-black">
                {boardedCount} / {participants.length}
              </div>
            </div>
            <div className="p-2.5 bg-neutral-50 rounded-2xl border border-neutral-200 text-center min-w-[85px]">
              <div className="text-[9px] uppercase font-bold text-neutral-400">Squads</div>
              <div className="text-base font-mono font-bold text-black">{squads.length}</div>
            </div>
          </div>
        </div>

        {/* Global Notification Banner */}
        {actionNotice && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-neutral-900 text-white rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionNotice}</span>
          </motion.div>
        )}

        {/* Apple Segmented Operations Sub-Tabs */}
        <div className="flex items-center gap-1.5 mt-6 pt-5 border-t border-black/[0.06] overflow-x-auto pb-1">
          {[
            { id: 'scan', label: 'QR Attendance', icon: QrCode },
            { id: 'participants', label: 'Hacker Dossiers', icon: Users },
            { id: 'squads', label: 'Squad Controls & Rounds', icon: Shield },
            { id: 'judges', label: 'Judge Desk', icon: Sparkles },
            { id: 'broadcast', label: 'Broadcast Alerts', icon: Bell },
            { id: 'submissions', label: 'Results & Monitor', icon: Trophy }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer select-none shrink-0 active:scale-95 ${
                  isActive
                    ? 'bg-black text-white shadow-sm'
                    : 'bg-neutral-100 text-neutral-600 hover:text-black hover:bg-neutral-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab 1: QR Base Scan & Attendance Marking */}
      {activeTab === 'scan' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Scan Input & Scanner */}
          <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-black/[0.08] shadow-apple-card space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-black flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-black" />
                  Physical Check-In & Gate Scanner
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Scan attendee cryptographic Ed25519 QR passes or input the 6-character short fallback code.
                </p>
              </div>

              <button
                type="button"
                onClick={toggleCameraScanner}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                  scanningActive
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-black hover:bg-neutral-800 text-white'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{scanningActive ? 'Stop Scanner' : 'Launch Camera Scanner'}</span>
              </button>
            </div>

            {/* Live Camera Scanner Viewport */}
            {scanningActive && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-5 bg-neutral-900 rounded-2xl flex flex-col items-center justify-center space-y-3 overflow-hidden text-white border border-black"
              >
                <div className="text-xs font-semibold flex items-center gap-2 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Camera Active — Point at Attendee Pass QR</span>
                </div>
                <div id="reader-scanner" className="w-full max-w-sm rounded-xl overflow-hidden bg-black text-white" />
                <p className="text-[11px] text-neutral-400 font-mono">
                  Auto-detects Ed25519 pass payloads and marks attendance in &lt;100ms.
                </p>
              </motion.div>
            )}

            {/* Manual Code Fallback Form */}
            <form
              onSubmit={(e) => { e.preventDefault(); handleScanOrCode(manualCode); }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                placeholder="Enter 6-char fallback code (e.g. 7X9AB2)"
                maxLength={10}
                className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm font-mono uppercase tracking-wider text-black focus:outline-none focus:border-black"
              />
              <Button
                variant="primary"
                type="submit"
                className="gap-1.5 rounded-xl text-xs px-4 bg-black text-white hover:bg-neutral-800 cursor-pointer shrink-0 font-semibold"
              >
                <Check className="w-4 h-4" />
                <span>Mark Present</span>
              </Button>
            </form>

            {/* 1-Click Fast Simulated Scanner */}
            <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                Instant Test Scanners (1-Click Pass Simulation)
              </span>
              <div className="flex flex-wrap gap-2">
                {participants.slice(0, 6).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleScanOrCode(p.short_fallback_code)}
                    className={`text-xs border rounded-xl px-2.5 py-1.5 font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                      p.status === 'boarded'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-white border-neutral-200 hover:border-black text-black'
                    }`}
                  >
                    <QrCode className="w-3 h-3 text-neutral-500" />
                    <span>{p.name} ({p.short_fallback_code})</span>
                    {p.status === 'boarded' && <Check className="w-3 h-3 text-emerald-600" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Check-in Confirmation Card */}
            {scanResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                    ✓
                  </div>
                  <div>
                    <div className="font-bold text-sm text-emerald-950">{scanResult.name}</div>
                    <div className="text-xs text-emerald-700">
                      Squad: {scanResult.squad_name} • Code: {scanResult.fallback_code}
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-200 text-emerald-900 px-2.5 py-1 rounded-full">
                  Checked In
                </span>
              </motion.div>
            )}

            {/* Station Live Stats */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-black/[0.06] text-center">
              <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200">
                <div className="text-[10px] font-bold uppercase text-neutral-400">Total Registered</div>
                <div className="text-lg font-mono font-bold text-black mt-0.5">{participants.length}</div>
              </div>
              <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200">
                <div className="text-[10px] font-bold uppercase text-neutral-400">Boarded / In-Venue</div>
                <div className="text-lg font-mono font-bold text-emerald-600 mt-0.5">{boardedCount}</div>
              </div>
              <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200">
                <div className="text-[10px] font-bold uppercase text-neutral-400">Check-in Rate</div>
                <div className="text-lg font-mono font-bold text-black mt-0.5">
                  {participants.length > 0 ? Math.round((boardedCount / participants.length) * 100) : 0}%
                </div>
              </div>
            </div>
          </div>

          {/* Recent Attendance Feed */}
          <div className="bg-white p-6 rounded-3xl border border-black/[0.08] shadow-apple-card space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-black flex items-center gap-2">
              <Clock className="w-4 h-4 text-black" />
              Recent Check-ins
            </h3>

            <div className="space-y-2 overflow-y-auto max-h-[300px]">
              {participants.filter(p => p.status === 'boarded').slice(0, 10).map(p => (
                <div
                  key={p.id}
                  className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-black block">{p.name}</span>
                    <span className="text-[10px] text-neutral-400 font-mono">Code: {p.short_fallback_code}</span>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Boarded
                  </span>
                </div>
              ))}
              {boardedCount === 0 && (
                <p className="text-neutral-400 text-xs text-center py-6">No check-ins marked yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Participant Directory & Dossiers */}
      {activeTab === 'participants' && (
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-black/[0.08] shadow-apple-card space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-black">Hacker Directory & Dossiers ({filteredParticipants.length})</h2>
              <p className="text-xs text-neutral-500 mt-0.5">Full unmasked participant details, emergency contacts, and check-in status.</p>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2">
              {(['all', 'boarded', 'registered'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setPartStatusFilter(f)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize cursor-pointer transition-colors ${
                    partStatusFilter === f
                      ? 'bg-black text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:text-black'
                  }`}
                >
                  {f === 'all' ? 'All Hackers' : f === 'boarded' ? 'Present' : 'Pending'}
                </button>
              ))}
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={partSearch}
              onChange={(e) => setPartSearch(e.target.value)}
              placeholder="Search by hacker name, email, institution, or fallback code..."
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-black focus:outline-none focus:border-black"
            />
          </div>

          {/* Participants Table */}
          <div className="overflow-x-auto border border-neutral-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Hacker</th>
                  <th className="p-3.5">Contact</th>
                  <th className="p-3.5">Institution</th>
                  <th className="p-3.5">Fallback Code</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredParticipants.map(p => (
                  <tr key={p.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="p-3.5 font-bold text-black">{p.name}</td>
                    <td className="p-3.5 text-neutral-600 font-mono text-[11px]">{p.email}</td>
                    <td className="p-3.5 text-neutral-700">{p.college || 'Individual Developer'}</td>
                    <td className="p-3.5 font-mono text-black font-semibold">{p.short_fallback_code}</td>
                    <td className="p-3.5">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        p.status === 'boarded'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                      }`}>
                        {p.status === 'boarded' ? 'Checked In' : 'Registered'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      {p.status !== 'boarded' ? (
                        <button
                          onClick={() => handleScanOrCode(p.short_fallback_code)}
                          className="px-2.5 py-1 bg-black text-white hover:bg-neutral-800 text-[11px] font-semibold rounded-lg cursor-pointer"
                        >
                          Check In
                        </button>
                      ) : (
                        <span className="text-neutral-400 text-[11px]">✓ Verified</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Squad Controls & Multi-Round Progression */}
      {activeTab === 'squads' && (
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-black/[0.08] shadow-apple-card space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-black">Squad Controls & Round Progression ({squads.length})</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Apply penalty points, blacklist violators, and advance teams across evaluation rounds.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="gap-1.5 rounded-xl text-xs py-1.5 cursor-pointer self-start"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Squads CSV</span>
            </Button>
          </div>

          {/* Squads Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {squads.map(sq => (
              <div
                key={sq.id}
                className={`p-5 rounded-2xl border transition-all ${
                  sq.is_blacklisted
                    ? 'bg-red-50/50 border-red-200'
                    : 'bg-neutral-50 hover:bg-white border-neutral-200 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-black text-white px-2 py-0.5 rounded-md">
                        {sq.track || 'Track'}
                      </span>
                      {sq.is_blacklisted && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-red-600 text-white px-2 py-0.5 rounded-md flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Disqualified
                        </span>
                      )}
                      {(sq.penalty_points > 0) && (
                        <span className="text-[10px] font-bold uppercase text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                          -{sq.penalty_points} Pts Penalty
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-black">{sq.name}</h3>
                    <div className="text-xs text-neutral-500 mt-1">
                      <span className="font-semibold text-neutral-700">Locked PS: </span>
                      {sq.problem_statement_title || 'Pending PS selection'}
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      Members: {sq.members?.map((m: any) => m.name).join(', ') || `${sq.member_count} hackers`}
                    </div>
                  </div>

                  <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${
                    sq.round_status === 'finalist'
                      ? 'bg-purple-100 text-purple-900 border-purple-300'
                      : sq.round_status === 'shortlisted_r2'
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : sq.round_status === 'rejected'
                      ? 'bg-neutral-200 text-neutral-700 border-neutral-300'
                      : 'bg-white text-black border-neutral-200'
                  }`}>
                    {sq.round_status?.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                {/* Round Progression Buttons */}
                <div className="mt-4 pt-3 border-t border-neutral-200/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleUpdateRound(sq.id, 'shortlisted_r2')}
                      className="px-2.5 py-1 bg-white hover:bg-neutral-100 text-black border border-neutral-200 text-[11px] font-semibold rounded-lg cursor-pointer"
                    >
                      Advance R2
                    </button>
                    <button
                      onClick={() => handleUpdateRound(sq.id, 'finalist')}
                      className="px-2.5 py-1 bg-black hover:bg-neutral-800 text-white text-[11px] font-semibold rounded-lg cursor-pointer"
                    >
                      Make Finalist
                    </button>
                    <button
                      onClick={() => handleUpdateRound(sq.id, 'rejected')}
                      className="px-2.5 py-1 text-red-600 hover:bg-red-50 text-[11px] font-semibold rounded-lg cursor-pointer"
                    >
                      Eliminate
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPenaltyModalSquad(sq)}
                      className="text-[11px] text-neutral-600 hover:text-black underline cursor-pointer"
                    >
                      Penalize
                    </button>
                    <span className="text-neutral-300">•</span>
                    <button
                      onClick={() => setBlacklistModalSquad(sq)}
                      className="text-[11px] text-red-600 hover:text-red-800 underline cursor-pointer"
                    >
                      {sq.is_blacklisted ? 'Reinstate' : 'Blacklist'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Judge Desk */}
      {activeTab === 'judges' && (
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-black/[0.08] shadow-apple-card space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-black flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-black" />
                Judge Assignment Desk ({judgeAssignments.length} Assignments)
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Manage judge queues, balance evaluation workloads, and audit conflict of interest flags.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handleAutoAssignJudges}
              className="gap-1.5 rounded-xl text-xs py-2 px-4 bg-black text-white hover:bg-neutral-800 cursor-pointer self-start"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Auto-Balance Judge Queues</span>
            </Button>
          </div>

          {/* Assignments Table */}
          <div className="overflow-x-auto border border-neutral-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Judge</th>
                  <th className="p-3.5">Assigned Squad</th>
                  <th className="p-3.5">Track</th>
                  <th className="p-3.5">Review Status</th>
                  <th className="p-3.5">Conflict State</th>
                  <th className="p-3.5 text-right">Conflict Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {judgeAssignments.map(a => (
                  <tr key={a.assignment_id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="p-3.5 font-bold text-black">{a.judge_email}</td>
                    <td className="p-3.5 font-semibold text-neutral-800">{a.team_name}</td>
                    <td className="p-3.5 text-neutral-600">{a.track}</td>
                    <td className="p-3.5">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        a.scores_submitted
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {a.scores_submitted ? 'Completed' : 'Pending'}
                      </span>
                    </td>
                    <td className="p-3.5">
                      {a.is_conflict ? (
                        <span className="text-[10px] font-bold uppercase text-red-700 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                          Conflict: {a.conflict_reason || 'Flagged'}
                        </span>
                      ) : (
                        <span className="text-neutral-400 text-xs">✓ Clear</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right">
                      {!a.is_conflict ? (
                        <button
                          onClick={() => handleDeclareConflict(a.assignment_id)}
                          className="text-[11px] text-red-600 hover:text-red-800 underline cursor-pointer"
                        >
                          Declare Conflict
                        </button>
                      ) : (
                        <span className="text-neutral-400 text-xs">Bypassed</span>
                      )}
                    </td>
                  </tr>
                ))}
                {judgeAssignments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-neutral-400 text-xs">
                      No judge assignments formed yet. Click "Auto-Balance Judge Queues" above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 5: Broadcast Announcements */}
      {activeTab === 'broadcast' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Broadcaster Form */}
          <div className="bg-white p-6 rounded-3xl border border-black/[0.08] shadow-apple-card space-y-4">
            <div>
              <h2 className="text-lg font-bold text-black flex items-center gap-2">
                <Bell className="w-5 h-5 text-black" />
                Publish Live Announcement
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Broadcast instant mission alerts to all active hackers and display on the digital ticker.
              </p>
            </div>

            <form onSubmit={handleBroadcast} className="space-y-4 text-xs">
              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Announcement Title *</label>
                <input
                  type="text"
                  required
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="e.g. Mentor Hours Opening at Main Deck"
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-xs text-black focus:outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="font-semibold text-neutral-700 block mb-1">Broadcast Content *</label>
                <textarea
                  rows={4}
                  required
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  placeholder="Details regarding schedule shift, food stations, or submission instructions..."
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-xs text-black focus:outline-none focus:border-black"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Priority Level</label>
                  <select
                    value={annPriority}
                    onChange={(e) => setAnnPriority(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-2 text-xs text-black focus:outline-none focus:border-black"
                  >
                    <option value="normal">Normal Priority</option>
                    <option value="high">High Priority</option>
                    <option value="urgent">🚨 Urgent / Action Required</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="pinToggle"
                    checked={annPinned}
                    onChange={(e) => setAnnPinned(e.target.checked)}
                    className="rounded border-neutral-300 cursor-pointer"
                  />
                  <label htmlFor="pinToggle" className="font-semibold text-neutral-700 cursor-pointer select-none">
                    Pin to top of feed
                  </label>
                </div>
              </div>

              <Button
                variant="primary"
                type="submit"
                className="w-full gap-2 rounded-xl text-xs py-2.5 bg-black text-white hover:bg-neutral-800 cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Publish Broadcast</span>
              </Button>
            </form>
          </div>

          {/* Past Announcements Feed */}
          <div className="bg-white p-6 rounded-3xl border border-black/[0.08] shadow-apple-card space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-black">
              Published Alerts ({announcements.length})
            </h3>

            <div className="space-y-3 overflow-y-auto max-h-[420px]">
              {announcements.map(ann => (
                <div
                  key={ann.id}
                  className={`p-4 rounded-2xl border ${
                    ann.priority === 'urgent'
                      ? 'bg-red-50/60 border-red-200'
                      : ann.priority === 'high'
                      ? 'bg-amber-50/60 border-amber-200'
                      : 'bg-neutral-50 border-neutral-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-xs text-black">{ann.title}</span>
                    <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-white border border-neutral-200">
                      {ann.priority}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 leading-relaxed">{ann.content}</p>
                  <div className="text-[10px] text-neutral-400 mt-2 flex items-center justify-between">
                    <span>{new Date(ann.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>Read by {ann.acknowledgements_count || 0} crew</span>
                  </div>
                </div>
              ))}
              {announcements.length === 0 && (
                <p className="text-neutral-400 text-xs text-center py-10">No announcements published yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Live Submissions & Leaderboard Results Monitor */}
      {activeTab === 'submissions' && (
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-black/[0.08] shadow-apple-card space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-black flex items-center gap-2">
                <Trophy className="w-5 h-5 text-black" />
                Live Flight Review Leaderboard & Results
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Aggregate judge scoring across criteria, tie-breakers, and final standings.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="gap-1.5 rounded-xl text-xs py-1.5 cursor-pointer self-start"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Standings CSV</span>
            </Button>
          </div>

          {/* Standings Table */}
          <div className="overflow-x-auto border border-neutral-200 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 border-b border-neutral-200 text-neutral-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Rank</th>
                  <th className="p-3.5">Squad</th>
                  <th className="p-3.5">Track</th>
                  <th className="p-3.5">Total Score</th>
                  <th className="p-3.5">Review Progress</th>
                  <th className="p-3.5">Prize Grant Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {leaderboard.map((entry, idx) => (
                  <tr key={entry.team_id || idx} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="p-3.5">
                      <span className={`w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-xs ${
                        idx === 0
                          ? 'bg-amber-400 text-black'
                          : idx === 1
                          ? 'bg-neutral-300 text-black'
                          : idx === 2
                          ? 'bg-amber-700 text-white'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}>
                        #{idx + 1}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-black">{entry.team_name}</td>
                    <td className="p-3.5 text-neutral-600">{entry.track || 'General'}</td>
                    <td className="p-3.5 font-mono font-bold text-sm text-black">
                      {entry.total_score ? entry.total_score.toFixed(1) : '—'}
                    </td>
                    <td className="p-3.5">
                      <span className="text-[10px] font-semibold text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md">
                        {entry.reviews_count || 0} Reviews
                      </span>
                    </td>
                    <td className="p-3.5">
                      {idx === 0 ? (
                        <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                          🏆 1st Champion
                        </span>
                      ) : idx === 1 ? (
                        <span className="text-[10px] font-bold text-neutral-800 bg-neutral-100 px-2.5 py-0.5 rounded-full border border-neutral-300">
                          🥈 2nd Place
                        </span>
                      ) : idx === 2 ? (
                        <span className="text-[10px] font-bold text-amber-900 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                          🥉 3rd Place
                        </span>
                      ) : (
                        <span className="text-neutral-400 text-[10px]">Participant</span>
                      )}
                    </td>
                  </tr>
                ))}
                {leaderboard.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-neutral-400 text-xs">
                      No scoring results compiled yet. Judges must submit evaluations through the Judge Desk.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal A: Apply Penalty Points */}
      <AnimatePresence>
        {penaltyModalSquad && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPenaltyModalSquad(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-md cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="bg-white rounded-3xl border border-black/[0.08] shadow-2xl max-w-md w-full relative z-10 p-6 space-y-4"
            >
              <h3 className="text-base font-bold text-black">Apply Penalty Points</h3>
              <p className="text-xs text-neutral-500">
                Squad: <span className="font-bold text-black">{penaltyModalSquad.name}</span>
              </p>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Deduction Points</label>
                  <input
                    type="number"
                    value={penaltyPoints}
                    onChange={(e) => setPenaltyPoints(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-sm font-mono text-black"
                  />
                </div>
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Reason for Penalty *</label>
                  <textarea
                    rows={2}
                    value={penaltyReason}
                    onChange={(e) => setPenaltyReason(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-xs text-black"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setPenaltyModalSquad(null)} className="rounded-xl text-xs">
                  Cancel
                </Button>
                <Button variant="primary" size="sm" onClick={handleApplyPenalty} className="rounded-xl text-xs bg-black text-white hover:bg-neutral-800">
                  Confirm Penalty
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Schedule & Timer Configuration Modal */}
        {showScheduleModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-black/10 shadow-apple-card max-w-lg w-full p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
                <div>
                  <h3 className="text-base font-bold text-black flex items-center gap-2">
                    <Clock className="w-4 h-4 text-black" />
                    <span>Arena Timer & Kickoff Schedule</span>
                  </h3>
                  <p className="text-xs text-neutral-500">{arena.title}</p>
                </div>
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="text-xs text-neutral-400 hover:text-black font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleSaveSchedule} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                    Event Operational Status
                  </label>
                  <select
                    value={scheduleStatus}
                    onChange={(e) => setScheduleStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-black text-sm font-semibold cursor-pointer"
                  >
                    <option value="ongoing">🔥 Live Now (Ongoing)</option>
                    <option value="scheduled">⏳ Scheduled (Pre-Kickoff)</option>
                    <option value="concluded">🏁 Concluded</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                      Event Kickoff Date & Time
                    </label>
                    <button
                      type="button"
                      onClick={() => setScheduleStartsAt(new Date().toISOString().slice(0, 16))}
                      className="text-[10px] text-neutral-500 hover:text-black font-semibold underline cursor-pointer"
                    >
                      Set to Right Now
                    </button>
                  </div>
                  <input
                    type="datetime-local"
                    value={scheduleStartsAt}
                    onChange={(e) => setScheduleStartsAt(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-black text-sm font-mono focus:outline-none focus:border-black"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                      Submission Deadline Date & Time
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const base = scheduleStartsAt ? new Date(scheduleStartsAt) : new Date();
                          const d = new Date(base.getTime() + 24 * 60 * 60 * 1000);
                          setScheduleDeadline(d.toISOString().slice(0, 16));
                        }}
                        className="text-[10px] text-neutral-500 hover:text-black font-semibold underline cursor-pointer"
                      >
                        +24 Hours
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const base = scheduleStartsAt ? new Date(scheduleStartsAt) : new Date();
                          const d = new Date(base.getTime() + 48 * 60 * 60 * 1000);
                          setScheduleDeadline(d.toISOString().slice(0, 16));
                        }}
                        className="text-[10px] text-neutral-500 hover:text-black font-semibold underline cursor-pointer"
                      >
                        +48 Hours
                      </button>
                    </div>
                  </div>
                  <input
                    type="datetime-local"
                    value={scheduleDeadline}
                    onChange={(e) => setScheduleDeadline(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-black text-sm font-mono focus:outline-none focus:border-black"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/[0.06]">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowScheduleModal(false)}
                    className="rounded-xl text-xs py-2 cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={savingSchedule}
                    className="rounded-xl text-xs py-2 px-5 bg-black text-white hover:bg-neutral-800 cursor-pointer font-semibold shadow-sm"
                  >
                    {savingSchedule ? 'Saving...' : 'Update Schedule & Timer'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal B: Blacklist / Disqualify */}
      <AnimatePresence>
        {blacklistModalSquad && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setBlacklistModalSquad(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-md cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              className="bg-white rounded-3xl border border-black/[0.08] shadow-2xl max-w-md w-full relative z-10 p-6 space-y-4"
            >
              <h3 className="text-base font-bold text-red-600 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                {blacklistModalSquad.is_blacklisted ? 'Reinstate Squad' : 'Disqualify / Blacklist Squad'}
              </h3>
              <p className="text-xs text-neutral-500">
                Squad: <span className="font-bold text-black">{blacklistModalSquad.name}</span>
              </p>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-neutral-700 block mb-1">Mandatory Audit Reason *</label>
                  <textarea
                    rows={3}
                    value={blacklistReason}
                    onChange={(e) => setBlacklistReason(e.target.value)}
                    placeholder="Document specific policy or code plagiarism violation..."
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-2.5 text-xs text-black"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setBlacklistModalSquad(null)} className="rounded-xl text-xs">
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleToggleBlacklist}
                  className="rounded-xl text-xs bg-red-600 hover:bg-red-700 text-white"
                >
                  {blacklistModalSquad.is_blacklisted ? 'Confirm Reinstatement' : 'Confirm Disqualification'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Schedule & Timer Configuration Modal */}
        {showScheduleModal && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl border border-black/10 shadow-apple-card max-w-lg w-full p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
                <div>
                  <h3 className="text-base font-bold text-black flex items-center gap-2">
                    <Clock className="w-4 h-4 text-black" />
                    <span>Arena Timer & Kickoff Schedule</span>
                  </h3>
                  <p className="text-xs text-neutral-500">{arena.title}</p>
                </div>
                <button
                  onClick={() => setShowScheduleModal(false)}
                  className="text-xs text-neutral-400 hover:text-black font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <form onSubmit={handleSaveSchedule} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                    Event Operational Status
                  </label>
                  <select
                    value={scheduleStatus}
                    onChange={(e) => setScheduleStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-black text-sm font-semibold cursor-pointer"
                  >
                    <option value="ongoing">🔥 Live Now (Ongoing)</option>
                    <option value="scheduled">⏳ Scheduled (Pre-Kickoff)</option>
                    <option value="concluded">🏁 Concluded</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                      Event Kickoff Date & Time
                    </label>
                    <button
                      type="button"
                      onClick={() => setScheduleStartsAt(new Date().toISOString().slice(0, 16))}
                      className="text-[10px] text-neutral-500 hover:text-black font-semibold underline cursor-pointer"
                    >
                      Set to Right Now
                    </button>
                  </div>
                  <input
                    type="datetime-local"
                    value={scheduleStartsAt}
                    onChange={(e) => setScheduleStartsAt(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-black text-sm font-mono focus:outline-none focus:border-black"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                      Submission Deadline Date & Time
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const base = scheduleStartsAt ? new Date(scheduleStartsAt) : new Date();
                          const d = new Date(base.getTime() + 24 * 60 * 60 * 1000);
                          setScheduleDeadline(d.toISOString().slice(0, 16));
                        }}
                        className="text-[10px] text-neutral-500 hover:text-black font-semibold underline cursor-pointer"
                      >
                        +24 Hours
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const base = scheduleStartsAt ? new Date(scheduleStartsAt) : new Date();
                          const d = new Date(base.getTime() + 48 * 60 * 60 * 1000);
                          setScheduleDeadline(d.toISOString().slice(0, 16));
                        }}
                        className="text-[10px] text-neutral-500 hover:text-black font-semibold underline cursor-pointer"
                      >
                        +48 Hours
                      </button>
                    </div>
                  </div>
                  <input
                    type="datetime-local"
                    value={scheduleDeadline}
                    onChange={(e) => setScheduleDeadline(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl text-black text-sm font-mono focus:outline-none focus:border-black"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/[0.06]">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowScheduleModal(false)}
                    className="rounded-xl text-xs py-2 cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={savingSchedule}
                    className="rounded-xl text-xs py-2 px-5 bg-black text-white hover:bg-neutral-800 cursor-pointer font-semibold shadow-sm"
                  >
                    {savingSchedule ? 'Saving...' : 'Update Schedule & Timer'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
