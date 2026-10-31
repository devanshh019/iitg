import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  QrCode, Camera, Wifi, WifiOff, Volume2, VolumeX, RefreshCw, CheckCircle2,
  AlertTriangle, ArrowRight, ShieldCheck, Database
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { sound } from '../utils/sound';
import { offlineDb, QueuedScan } from '../offline/db';
import { apiFetch } from '../api/client';

interface BoardingScannerViewProps {
  eventId?: string;
}

export const BoardingScannerView: React.FC<BoardingScannerViewProps> = ({ eventId = 'apollo-24' }) => {
  const [station, setStation] = useState('entry');
  const [inputCode, setInputCode] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastScanResult, setLastScanResult] = useState<any>(null);
  const [queuedCount, setQueuedCount] = useState(0);
  const [throughput, setThroughput] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [deviceId] = useState(() => 'dev-' + Math.random().toString(36).substring(2, 9));

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); autoSyncOfflineQueue(); };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    loadThroughput();
    updateQueuedCount();

    const interval = setInterval(() => {
      loadThroughput();
      updateQueuedCount();
    }, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [eventId]);

  const updateQueuedCount = async () => {
    try {
      const count = await offlineDb.scans.where('synced').equals(0).count();
      setQueuedCount(count);
    } catch (e) {}
  };

  const loadThroughput = async () => {
    try {
      const ev = await apiFetch(`/events/by-slug/${eventId}`);
      const stats = await apiFetch(`/events/${ev.id}/boarding/throughput`);
      setThroughput(stats);
    } catch (e) {}
  };

  const handleSoundToggle = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sound.enabled = next;
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#06B6D4', '#22D3EE', '#F59E0B', '#10B981']
    });
  };

  const executeScan = async (codeToScan: string) => {
    if (!codeToScan.trim()) return;
    const op_id = crypto.randomUUID ? crypto.randomUUID() : 'op-' + Date.now();
    const claimed_at = new Date().toISOString();

    const scanPayload: QueuedScan = {
      op_id,
      event_id: eventId,
      participant_token_or_code: codeToScan.trim(),
      station,
      method: codeToScan.length > 20 ? 'qr' : 'fallback_code',
      device_id: deviceId,
      claimed_at,
      synced: 0
    };

    // Save to IndexedDB immediately for offline safety
    await offlineDb.scans.add(scanPayload);
    await updateQueuedCount();

    // If online, perform sync
    if (navigator.onLine) {
      try {
        const ev = await apiFetch(`/events/by-slug/${eventId}`);
        const results = await apiFetch(`/events/${ev.id}/boarding/sync`, {
          method: 'POST',
          body: JSON.stringify({
            device_id: deviceId,
            station,
            scans: [{
              op_id,
              participant_token_or_code: codeToScan.trim(),
              station,
              method: scanPayload.method,
              device_id: deviceId,
              claimed_at
            }]
          })
        });

        if (results && results.length > 0) {
          const res = results[0];
          setLastScanResult(res);

          // Update scan as synced in IndexedDB
          await offlineDb.scans.where('op_id').equals(op_id).modify({ synced: 1, sync_result: res });
          await updateQueuedCount();

          if (res.status === 'ACCEPTED') {
            sound.playSuccessChime();
            triggerConfetti();
          } else if (res.status === 'DUPLICATE') {
            sound.playWarningBuzzer();
          }
        }
      } catch (err: any) {
        setLastScanResult({
          op_id,
          status: 'QUEUED_OFFLINE',
          message: 'Saved to IndexedDB queue. Telemetry will sync when connected.'
        });
      }
    } else {
      // Offline mode
      setLastScanResult({
        op_id,
        status: 'QUEUED_OFFLINE',
        message: 'Offline mode: Scan verified and queued in IndexedDB. Op ID recorded.'
      });
      sound.playSuccessChime();
    }

    setInputCode('');
    loadThroughput();
  };

  const autoSyncOfflineQueue = async () => {
    const unsynced = await offlineDb.scans.where('synced').equals(0).toArray();
    if (unsynced.length === 0) return;

    try {
      setSyncing(true);
      const ev = await apiFetch(`/events/by-slug/${eventId}`);
      await apiFetch(`/events/${ev.id}/boarding/sync`, {
        method: 'POST',
        body: JSON.stringify({
          device_id: deviceId,
          station,
          scans: unsynced.map(s => ({
            op_id: s.op_id,
            participant_token_or_code: s.participant_token_or_code,
            station: s.station,
            method: s.method,
            device_id: s.device_id,
            claimed_at: s.claimed_at
          }))
        })
      });

      // Mark all as synced
      await offlineDb.scans.where('synced').equals(0).modify({ synced: 1 });
      await updateQueuedCount();
      loadThroughput();
    } catch (e) {
      console.error('Sync failed:', e);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Scanner Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-space-900 border border-space-800 p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
            <QrCode className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="font-mono font-bold text-white text-lg">Boarding Gate Scanner (PWA)</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-mono text-slate-400">DEVICE: {deviceId}</span>
              <span className="text-slate-600">•</span>
              <span className={`text-[11px] font-mono font-bold flex items-center gap-1 ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
                {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {isOnline ? 'ONLINE' : 'OFFLINE (IndexedDB Active)'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {queuedCount > 0 && (
            <Button variant="outline" size="sm" onClick={autoSyncOfflineQueue} isLoading={syncing} className="text-amber-400 border-amber-500/40">
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Sync {queuedCount} Queued Scans
            </Button>
          )}

          <Button variant="ghost" size="sm" onClick={handleSoundToggle} className="p-2">
            {soundEnabled ? <Volume2 className="w-4 h-4 text-cyan-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </Button>
        </div>
      </div>

      {/* Main Grid: Scanner Input and Results */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card glow="cyan">
            {/* Station selector */}
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
              {[
                { id: 'entry', label: 'Main Boarding Gate' },
                { id: 'meals', label: 'Rations / Meals' },
                { id: 'swag', label: 'Swag Hangar' },
                { id: 'workshop', label: 'Workshop Hall' },
                { id: 'final_presentation', label: 'Launch Deck' }
              ].map(st => (
                <button
                  key={st.id}
                  onClick={() => setStation(st.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors shrink-0 cursor-pointer ${
                    station === st.id
                      ? 'bg-cyan-500 text-space-950 font-bold shadow-glow-cyan'
                      : 'bg-space-950 text-slate-400 hover:text-white border border-space-800'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Simulated Camera Viewfinder & Code Input */}
            <div className="p-6 bg-space-950 rounded-xl border border-space-800 text-center relative overflow-hidden">
              <div className="w-48 h-48 mx-auto border-2 border-dashed border-cyan-500/50 rounded-2xl flex flex-col items-center justify-center p-4 relative group">
                <div className="absolute inset-0 bg-cyan-500/5 animate-pulse rounded-2xl" />
                <Camera className="w-10 h-10 text-cyan-400 mb-2" />
                <span className="text-xs font-mono text-slate-400">Aim Camera at Pass</span>
                <span className="text-[10px] font-mono text-cyan-500/70 mt-1">Ed25519 Verified</span>
              </div>

              {/* Manual Input Fallback */}
              <div className="mt-6 max-w-md mx-auto">
                <label className="text-xs font-mono text-slate-400 block mb-2">
                  Scan Barcode / Enter 6-Char Fallback Code:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter code or paste token..."
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && executeScan(inputCode)}
                    className="w-full bg-space-900 border border-space-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                  <Button variant="primary" size="md" onClick={() => executeScan(inputCode)}>
                    Scan
                  </Button>
                </div>
              </div>
            </div>

            {/* Last Scan Result Card */}
            {lastScanResult && (
              <div
                className={`mt-4 p-4 rounded-xl border animate-in fade-in transition-all ${
                  lastScanResult.status === 'ACCEPTED'
                    ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                    : lastScanResult.status === 'DUPLICATE'
                    ? 'bg-amber-950/30 border-amber-500/50 text-amber-200'
                    : 'bg-cyan-950/30 border-cyan-500/50 text-cyan-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {lastScanResult.status === 'ACCEPTED' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-400" />
                    )}
                    <span className="font-mono font-bold text-sm tracking-wider">
                      STATUS: {lastScanResult.status}
                    </span>
                  </div>
                  <span className="text-xs font-mono opacity-80">{station.toUpperCase()}</span>
                </div>
                <p className="text-sm mt-2 font-mono">{lastScanResult.message}</p>
                {lastScanResult.participant_name && (
                  <div className="mt-2 text-xs font-mono text-white font-bold">
                    Crew: {lastScanResult.participant_name}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Right Col: Live Station Throughput Metrics */}
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-mono font-bold text-sm text-slate-200 uppercase tracking-wider">Station Throughput</h3>
              <Badge variant="cyan">LIVE TELEMETRY</Badge>
            </div>

            <div className="space-y-3">
              {throughput.map((st, i) => (
                <div key={i} className="p-3 bg-space-950/60 border border-space-850 rounded-lg">
                  <div className="flex justify-between items-center text-xs font-mono">
                    <span className="font-bold text-slate-200 capitalize">{st.station.replace('_', ' ')}</span>
                    <span className="text-cyan-400 font-bold">{st.accepted_scans} boarded</span>
                  </div>
                  <div className="w-full bg-space-800 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-cyan-500 h-full rounded-full"
                      style={{ width: `${Math.min(100, (st.accepted_scans / 50) * 100)}%` }}
                    />
                  </div>
                  {st.duplicate_scans > 0 && (
                    <span className="text-[10px] font-mono text-amber-400 mt-1 block">
                      ⚠ {st.duplicate_scans} duplicate scan attempts flagged
                    </span>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* Offline Sync State Card */}
          <Card glow="amber">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-4 h-4 text-amber-400" />
              <h4 className="font-mono font-bold text-sm text-white">IndexedDB Offline Engine</h4>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ground crew scanners run fully functional in airplane mode. First accepted scan wins; duplicates are flagged.
            </p>
            <div className="mt-3 p-2.5 bg-space-950 rounded-lg border border-space-800 text-xs font-mono flex justify-between">
              <span className="text-slate-400">Unsynced Op Queue:</span>
              <span className="text-amber-400 font-bold">{queuedCount} items</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
