# HACKOS Security & Cryptography Architecture

## 1. Field-Level PII Encryption at Rest
Participant personal identifiers (`email`, `phone`, `college_id`) are never stored in plaintext within PostgreSQL.
- **Algorithm:** Authenticated 128-bit AES in CBC mode with HMAC-SHA256 via `cryptography.fernet.Fernet`.
- **Searchability:** Deterministic, one-way SHA-256 hashes (`normalized_email_hash`, `normalized_phone_hash`, `dedupe_key`) are computed upon input and indexed. Exact lookups and deduplication occur without decrypting the dataset.
- **Response Masking:** Responses mask email (`j***e@example.com`) and phone numbers for non-privileged roles (mentors, judges, crew). Only organizers, super_admins, or the crew member themselves receive unmasked data.

## 2. Hash-Chained Append-Only Audit Ledger
Every mutating service call records an entry to `audit_log`:
- Columns: `id`, `event_id`, `actor_id`, `action`, `entity_type`, `entity_id`, `payload`, `timestamp`, `prev_hash`, `hash`.
- Hash formula:
  $$\text{hash} = \text{SHA-256}(\text{prev\_hash} \parallel \text{actor\_id} \parallel \text{action} \parallel \text{entity\_type} \parallel \text{entity\_id} \parallel \text{timestamp} \parallel \text{payload\_json})$$
- Verification endpoint: `GET /audit/verify` iterates from the genesis block (`0000...`) to the tip, recomputing every hash and checking links. Any manual SQL `UPDATE` or `DELETE` breaks the chain.

## 3. Asymmetric Offline Boarding Pass Verification
- Each event generates a unique Ed25519 asymmetric keypair during setup.
- Crew QR tokens contain `{"p_id": ..., "e_id": ..., "exp": ...}` signed with the mission private key.
- The scanner PWA caches the public key in IndexedDB and verifies tokens offline in $< 0.5\text{ ms}$ without network connectivity.

## 4. Server-Side RBAC Enforcement
Every route verifies user permissions using event-scoped dependencies:
- Roles: `super_admin`, `organizer`, `volunteer`, `mentor`, `judge`, `participant`.
- No route accepts client-claimed roles. All permissions are evaluated server-side.

## 5. Optimistic Concurrency Control
Launches and score submissions enforce optimistic revision checks (`expected_revision`). If another teammate or judge submitted updates in the interim, the server rejects the write with HTTP `409 Conflict`, preventing silent overwrites.
