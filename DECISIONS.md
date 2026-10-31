# HACKOS Architecture & Technical Decisions Log

This document records all architectural, technical, cryptographic, and operational decisions made during the design and implementation of HACKOS.

## Decision 1: Monorepo Architecture
- **Decision:** Use a clean monorepo structure with `/backend`, `/frontend`, `/infra`, `/docs`, `/scripts`, and `/e2e`.
- **Reason:** Enables unified type synchronization, co-located integration tests, consolidated CI/CD pipelines, and atomic cross-stack commits.

## Decision 2: Field-Level PII Encryption
- **Decision:** Use `cryptography.fernet.Fernet` with key derivation from `PII_ENCRYPTION_KEY`.
- **Reason:** Provides authenticated 128-bit AES in CBC mode with HMAC-SHA256. Protects participant email, phone, and college ID at rest in PostgreSQL, while normalized deterministic hashes (`hashlib.sha256(email.strip().lower().encode())`) provide fast indexable exact lookups without decrypting the table.

## Decision 3: Hash-Chained Audit Ledger
- **Decision:** Every table mutation emits an entry to `audit_log` with fields: `id`, `event_id`, `actor_id`, `action`, `entity_type`, `entity_id`, `payload`, `timestamp`, `prev_hash`, `hash`.
- **Reason:** `hash = SHA256(f"{prev_hash}|{timestamp}|{actor_id}|{action}|{entity_type}|{entity_id}|{payload_json}")`. The verification endpoint `GET /audit/verify` iterates through all logs for an event and confirms the chain's cryptographic integrity. Any direct SQL UPDATE or DELETE breaks the chain immediately.

## Decision 4: Asymmetric Offline Boarding (Ed25519)
- **Decision:** Each mission generates an Ed25519 asymmetric keypair. Boarding tokens are URL-safe base64 strings containing `{"p_id": ..., "e_id": ..., "exp": ...}` plus a 64-byte Ed25519 signature.
- **Reason:** The scanner PWA caches the mission public key and can verify the signature and expiry offline in 0.1ms without internet connectivity or network roundtrips.

## Decision 5: Offline Sync Engine & Idempotency
- **Decision:** Scanners record boarding scans into an IndexedDB queue (Dexie.js) with client-generated UUID `op_id` and client timestamp `claimed_at`. The server records `claimed_at` and `server_at = utcnow()`.
- **Reason:** First scan for a participant per station is marked `ACCEPTED`. Duplicate scans retain the existing check-in and are flagged `DUPLICATE` with full audit. Replayed op_ids return the existing result idempotently.

## Decision 6: Flight Review Scoring Normalization
- **Decision:** Both raw scores and per-judge z-score normalized scores (`z = (score - mean) / std_dev`) are computed and presented side-by-side.
- **Reason:** Eliminates harsh-judge vs. lenient-judge grading bias across multiple judging panels while maintaining transparency.

## Decision 7: Apple-Inspired Fluid Physics for Mission Control UI
- **Decision:** UI styling follows Apple HIG fluid motion principles (critically damped springs, interruptible transitions, direct manipulation, instant pointer-down visual feedback, spatial consistency) combined with a dark space-control-room aesthetic (deep navy `#070B14`, electric cyan `#06B6D4`, amber `#F59E0B`).
- **Reason:** Delivers high responsiveness, professional density for organizers, and tactile feedback (sound/confetti) during critical milestones like boarding and launch submission.
