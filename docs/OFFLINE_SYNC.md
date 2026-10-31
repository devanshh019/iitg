# HACKOS Offline-First Boarding & Sync Engine

## Architecture Overview
The HACKOS Boarding Gate Scanner is an installable Progressive Web App (PWA) designed to operate under adverse, zero-connectivity hangar conditions.

```mermaid
sequenceDiagram
    participant Scanner as Scanner PWA (Offline)
    participant Dexie as IndexedDB Queue (Dexie.js)
    participant API as HACKOS Gateway (/api/boarding/sync)
    participant DB as PostgreSQL Ledger

    Note over Scanner: Airplane Mode Enabled
    Scanner->>Scanner: Scan QR Code
    Scanner->>Scanner: Verify Ed25519 signature with cached Event Public Key
    Scanner->>Dexie: Enqueue Scan (UUID op_id, station, claimed_at, synced=0)
    Scanner->>Scanner: Play Audio Chime & Confetti

    Note over Scanner: Network Re-established
    Scanner->>Dexie: Query unsynced scans (synced=0)
    Scanner->>API: POST /api/events/{id}/boarding/sync (Batch)
    API->>DB: Check idempotency table (sync_ops by op_id)
    API->>DB: First Scan = ACCEPTED; Subsequent = DUPLICATE
    API->>DB: Record Audit Log mutation
    API-->>Scanner: Return Batch Results
    Scanner->>Dexie: Mark synced=1
```

## Conflict Resolution & Idempotency Rules
1. **Client-Generated UUID `op_id`:** Every scan action generates a UUID `op_id` at the moment of scanning.
2. **First Accepted Scan Wins:** If a participant is scanned at the same non-multi-scan station (e.g. `entry`) on multiple scanners or multiple times, the first scan recorded in the database is assigned `ACCEPTED`. All subsequent scans are marked `DUPLICATE` and never deleted.
3. **Multi-Scan Stations:** Stations configured with `is_multi_scan_allowed = true` (e.g., `meals`) allow multiple scans across meal windows.
4. **Network Retry Idempotency:** If a scanner re-transmits an already-processed `op_id` due to a network timeout, the server looks up `sync_ops` by `op_id` and idempotently returns the original response.
