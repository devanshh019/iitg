import Dexie, { Table } from 'dexie';

export interface QueuedScan {
  id?: number;
  op_id: string;
  event_id: string;
  participant_token_or_code: string;
  station: string;
  method: string;
  device_id: string;
  claimed_at: string;
  synced: number; // 0 = false, 1 = true
  sync_result?: any;
}

export interface CachedMissionKey {
  event_id: string;
  slug: string;
  title: string;
  public_key: string;
  cached_at: string;
}

export class HackosOfflineDatabase extends Dexie {
  scans!: Table<QueuedScan, number>;
  missionKeys!: Table<CachedMissionKey, string>;

  constructor() {
    super('HackosOfflineDB');
    this.version(1).stores({
      scans: '++id, op_id, event_id, station, synced, claimed_at',
      missionKeys: 'event_id, slug'
    });
  }
}

export const offlineDb = new HackosOfflineDatabase();
