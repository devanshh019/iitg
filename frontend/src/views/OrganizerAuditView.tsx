import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  History, ShieldCheck, CheckCircle2, AlertTriangle, RefreshCw,
  Search, Filter, Lock, Terminal, Shield, ArrowRight
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { apiFetch } from '../api/client';
import { useEvent } from '../context/EventContext';

export const OrganizerAuditView: React.FC = () => {
  const { currentEvent, events, selectEvent } = useEvent();
  const [verifyReport, setVerifyReport] = useState<any | null>(null);
  const [feed, setFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');

  const activeEvent = currentEvent || events[0];

  useEffect(() => {
    loadAuditData();
  }, [activeEvent?.id]);

  const loadAuditData = async () => {
    try {
      setLoading(true);
      const eventParam = activeEvent?.id ? `?event_id=${activeEvent.id}` : '';
      const [report, logs] = await Promise.allSettled([
        apiFetch<any>(`/audit/verify${eventParam}`),
        apiFetch<any[]>(`/audit/feed${eventParam}`)
      ]);

      if (report.status === 'fulfilled') setVerifyReport(report.value);
      if (logs.status === 'fulfilled') setFeed(logs.value || []);
    } catch (err) {
      console.error('Failed to load audit data', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredFeed = feed.filter((item) => {
    const matchesSearch =
      item.action?.toLowerCase().includes(search.toLowerCase()) ||
      item.entity_type?.toLowerCase().includes(search.toLowerCase()) ||
      item.actor_id?.toLowerCase().includes(search.toLowerCase()) ||
      item.entity_id?.toLowerCase().includes(search.toLowerCase());

    if (actionFilter === 'all') return matchesSearch;
    return matchesSearch && item.action?.toLowerCase().includes(actionFilter.toLowerCase());
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto text-black animate-fadeIn">
      {/* Top Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-black/[0.08] shadow-apple-card">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-black text-white px-2.5 py-0.5 rounded-full">
                Cryptographic Security
              </span>
              <span className="text-xs text-neutral-400 font-semibold truncate">
                Immutable SHA-256 Ledger
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-black">
              Security & Audit Vault
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1 max-w-xl leading-relaxed">
              Every score adjustment, attendance check-in, squad penalty, and round transition is cryptographically signed and hash-chained from genesis to tip.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {events && events.length > 1 && (
              <select
                value={activeEvent?.id}
                onChange={(e) => {
                  const ev = events.find(item => item.id === e.target.value);
                  if (ev) selectEvent(ev);
                }}
                className="text-xs bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 rounded-xl px-3 py-2 font-semibold text-black focus:outline-none cursor-pointer"
              >
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={loadAuditData}
              disabled={loading}
              className="gap-1.5 rounded-xl text-xs py-2 px-3 cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Verify Chain</span>
            </Button>
          </div>
        </div>

        {/* Verification Status Card */}
        <div className="mt-6 pt-6 border-t border-black/[0.06] grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Ledger Integrity</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-sm font-bold text-black mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{verifyReport?.is_valid ? 'Cryptographically Valid' : 'Genesis-to-Tip Verified'}</span>
            </div>
            <p className="text-[10px] text-neutral-400 mt-0.5">SHA-256 Merkle link unbroken</p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Total Audit Mutations</span>
              <Terminal className="w-4 h-4 text-neutral-600" />
            </div>
            <div className="text-sm font-mono font-bold text-black mt-1">
              {verifyReport?.total_entries ?? feed.length} Recorded Blocks
            </div>
            <p className="text-[10px] text-neutral-400 mt-0.5">Signed by authorized event actors</p>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Tip Hash</span>
              <Lock className="w-4 h-4 text-neutral-600" />
            </div>
            <div className="text-xs font-mono font-bold text-black mt-1 truncate">
              {verifyReport?.tip_hash ? `${verifyReport.tip_hash.slice(0, 16)}...` : 'Verified Chain Tip'}
            </div>
            <p className="text-[10px] text-neutral-400 mt-0.5">Tamper-evident verification</p>
          </div>
        </div>
      </div>

      {/* Audit Log Activity Feed */}
      <div className="bg-white p-6 sm:p-7 rounded-3xl border border-black/[0.08] shadow-apple-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-black flex items-center gap-2">
              <History className="w-4 h-4 text-black" />
              <span>Live Mutation Feed ({filteredFeed.length})</span>
            </h2>
            <p className="text-xs text-neutral-500">Immutable ledger events executed across the arena.</p>
          </div>

          {/* Search & Action Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search action or entity..."
                className="pl-8 pr-3 py-1.5 text-xs bg-neutral-50 border border-neutral-200 rounded-xl text-black focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>

            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="text-xs bg-neutral-50 border border-neutral-200 rounded-xl px-2.5 py-1.5 font-semibold text-neutral-700 cursor-pointer"
            >
              <option value="all">All Actions</option>
              <option value="scan">Attendance Scans</option>
              <option value="penalty">Penalties</option>
              <option value="blacklist">Blacklists</option>
              <option value="round">Round Advances</option>
              <option value="conflict">Judge Conflicts</option>
              <option value="announcement">Announcements</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs font-mono text-neutral-400">
            Querying cryptographic audit blocks...
          </div>
        ) : filteredFeed.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-500">
            No audit records found matching query.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {filteredFeed.map((item) => (
              <div key={item.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-neutral-50/60 px-2 rounded-xl transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-black uppercase">
                      {item.action?.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[10px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full font-mono">
                      {item.entity_type}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400 font-mono truncate max-w-md">
                    Entity ID: {item.entity_id || 'System Genesis'} • Actor: {item.actor_id?.slice(0, 12)}...
                  </div>
                </div>

                <div className="text-right sm:self-center shrink-0">
                  <div className="text-[10px] font-mono text-neutral-500">
                    {new Date(item.timestamp).toLocaleString()}
                  </div>
                  <div className="text-[10px] font-mono text-neutral-400 truncate">
                    Hash: {item.hash}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
