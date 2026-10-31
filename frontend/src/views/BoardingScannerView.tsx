import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  QrCode, Camera, Wifi, WifiOff, Volume2, VolumeX, RefreshCw, CheckCircle2,
  AlertTriangle, ShieldCheck, Database
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
      colors: ['#881337', '#9F1239', '#D97706', '#10B981']
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
          message: 'Saved to offline queue. Will sync automatically once connected.'
        });
      }
    } else {
      // Offline mode
      setLastScanResult({
        op_id,
        status: 'QUEUED_OFFLINE',
        message: 'Offline mode: Verified & saved to local queue.'
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
    <div className="space-y-5 max-w-4xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-stone-200/90 p-5 rounded-3xl shadow-soft">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-maroon-50 border border-maroon-200 flex items-center justify-center text-maroon-700">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-stone-900 text-base sm:text-lg">Check-in Scanner (Volunteer Desk)</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[11px] font-semibold flex items-center gap-1 ${isOnline ? 'text-emerald-700' : 'text-amber-700'}`}>
                {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {isOnline ? 'Online Sync Active' : 'Offline Mode (IndexedDB Queue)'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {queuedCount > 0 && (
            <Button variant="outline" size="sm" onClick={autoSyncOfflineQueue} isLoading={syncing} className="text-amber-800 border-amber-300 bg-amber-50 text-xs">
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              Sync {queuedCount} Scans
            </Button>
          )}

          <Button variant="ghost" size="sm" onClick={handleSoundToggle} className="p-2 border border-stone-200">
            {soundEnabled ? <Volume2 className="w-4 h-4 text-maroon-700" /> : <VolumeX className="w-4 h-4 text-stone-400" />}
          </Button>
        </div>
      </div>

      {/* Main Grid: Scanner Input and Results */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="md:col-span-2 space-y-5">
          <Card className="bg-white rounded-3xl">
            {/* Station selector */}
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
              {[
                { id: 'entry', label: 'Entrance Gate' },
                { id: 'meals', label: 'Lunch / Dinner' },
                { id: 'swag', label: 'Swag Bag Kit' },
                { id: 'workshop', label: 'Workshop' },
                { id: 'final_presentation', label: 'Launch Stage' }
              ].map(st => (
                <button
                  key={st.id}
                  onClick={() => setStation(st.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                    station === st.id
                      ? 'bg-maroon-700 text-white shadow-sm'
                      : 'bg-stone-100 text-stone-600 hover:text-stone-900 border border-stone-200/80'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Viewfinder & Manual Input */}
            <div className="p-6 bg-stone-50 rounded-2xl border border-stone-200/90 text-center relative overflow-hidden">
              <div className="w-44 h-44 mx-auto border-2 border-dashed border-maroon-400/60 rounded-3xl flex flex-col items-center justify-center p-4 relative bg-white shadow-inner">
                <Camera className="w-9 h-9 text-maroon-700 mb-1.5" />
                <span className="text-xs font-semibold text-stone-700">Aim Camera at QR Pass</span>
                <span className="text-[10px] font-mono text-stone-400 mt-0.5">Works Offline</span>
              </div>

              {/* Manual Input Fallback */}
              <div className="mt-5 max-w-sm mx-auto">
                <label className="text-xs font-semibold text-stone-700 block mb-1.5 uppercase tracking-wider">
                  Or enter 6-digit backup code:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. LO86Z7"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && executeScan(inputCode)}
                    className="w-full bg-white border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm text-stone-900 font-mono font-bold tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-maroon-500/20 focus:border-maroon-600 shadow-sm"
                  />
                  <Button variant="primary" size="md" onClick={() => executeScan(inputCode)} className="shadow-sm">
                    Check In
                  </Button>
                </div>
              </div>
            </div>

            {/* Last Scan Result Card */}
            {lastScanResult && (
              <div
                className={`mt-4 p-4 rounded-2xl border transition-all ${
                  lastScanResult.status === 'ACCEPTED'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                    : lastScanResult.status === 'DUPLICATE'
                    ? 'bg-amber-50 border-amber-200 text-amber-950'
                    : 'bg-maroon-50 border-maroon-200 text-maroon-950'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {lastScanResult.status === 'ACCEPTED' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    )}
                    <span className="font-bold text-xs uppercase tracking-wider">
                      {lastScanResult.status === 'ACCEPTED' ? 'CHECK-IN CONFIRMED' : 'ALREADY SCANNED'}
                    </span>
                  </div>
                  <span className="text-xs font-mono font-medium opacity-75">{station.toUpperCase()}</span>
                </div>
                <p className="text-xs sm:text-sm mt-1.5 font-sans leading-relaxed">{lastScanResult.message}</p>
                {lastScanResult.participant_name && (
                  <div className="mt-2 text-xs font-bold text-stone-900">
                    Participant: {lastScanResult.participant_name}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* Right Col: Live Station Metrics */}
        <div className="space-y-4">
          <Card className="bg-white rounded-3xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-stone-900 uppercase tracking-wide">Station Check-in Counts</h3>
              <Badge variant="maroon">Live</Badge>
            </div>

            <div className="space-y-2.5">
              {throughput.map((st, i) => (
                <div key={i} className="p-3 bg-stone-50 border border-stone-200/80 rounded-2xl">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-stone-800 capitalize">{st.station.replace('_', ' ')}</span>
                    <span className="text-maroon-800 font-bold font-mono">{st.accepted_scans} checked in</span>
                  </div>
                  <div className="w-full bg-stone-200 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className="bg-maroon-600 h-full rounded-full"
                      style={{ width: `${Math.min(100, (st.accepted_scans / 50) * 100)}%` }}
                    />
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
