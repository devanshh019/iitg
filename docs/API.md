# HACKOS Mission Control API Contract

This document provides the complete API specification implemented in HACKOS.

## Authentication & RBAC (`/api/auth`)
- `POST /api/auth/login`: Authenticate with email + password or magic OTP code. Returns JWT access & refresh tokens.
- `POST /api/auth/magic-link`: Request OTP / magic login verification code.
- `GET /api/auth/me`: Retrieve current authenticated profile, assigned roles, and linked participant record.

## Missions / Events (`/api/events`)
- `GET /api/events/templates`: List event setup wizard templates (`offline_24h`, `online_48h`, `hybrid_rounds`).
- `GET /api/events`: List all missions.
- `POST /api/events`: Create a new mission with Ed25519 keypair generation and format validation.
- `GET /api/events/by-slug/{slug}`: Fetch event by slug.
- `GET /api/events/{id}`: Fetch event by ID.
- `PATCH /api/events/{id}`: Update mission status, format config, and deadline locks.
- `POST /api/events/{id}/clone`: Clone an existing mission with all rubrics and configuration.
- `GET /api/events/{id}/funnel`: Telemetry funnel stats (registered, squads, boarded, launched).

## Crew & Deduplication (`/api/events/{id}/participants`)
- `POST /api/events/{id}/participants/register`: Register new participant with normalized hashes & fuzzy dedupe checks.
- `GET /api/events/{id}/participants`: List participants with role-scoped PII masking.
- `POST /api/events/{id}/participants/dedupe/resolve`: Dedupe Inbox actions: `merge`, `keep_both`, or `reject`.
- `POST /api/events/{id}/participants/csv-preview`: Dry-run CSV import preview with error validation.
- `GET /api/events/{id}/participants/{p_id}/export-personal-data`: GDPR data export on request.

## Squads (`/api/events/{id}/teams`)
- `GET /api/events/{id}/teams`: List squads and rosters.
- `POST /api/events/{id}/teams`: Create squad with join code and history audit.
- `POST /api/events/{id}/teams/join`: Join squad via 6-character code.
- `POST /api/events/{id}/teams/leave`: Disembark from squad.
- `POST /api/events/{id}/teams/{t_id}/transfer-lead`: Transfer squad leadership.
- `POST /api/events/{id}/teams/{t_id}/override-lock`: Organizer override of squad lock state.
- `GET /api/events/{id}/teams/squad-finder`: Algorithmic squad suggestions based on skill gaps.
- `GET /api/events/{id}/teams/generate-name`: Random Mission Control squad name and tagline generator.

## Boarding Gate & Sync (`/api/events/{id}/boarding`)
- `GET /api/events/{id}/boarding/pass`: Retrieve personal signed Ed25519 QR pass & fallback code.
- `POST /api/events/{id}/boarding/sync`: Idempotent batch sync endpoint for scanner PWAs.
- `GET /api/events/{id}/boarding/throughput`: Real-time throughput metrics per boarding station.

## Launches / Submissions (`/api/events/{id}/submissions`)
- `GET /api/events/{id}/submissions/my-squad`: Fetch squad submission and revision history.
- `POST /api/events/{id}/submissions/draft`: Save revision draft with optimistic concurrency check.
- `POST /api/events/{id}/submissions/launch`: Final launch issuing verified Launch Receipt with SHA-256 hash.
- `POST /api/events/{id}/submissions/grant-extension`: Organizer deadline extension override.

## Flight Review / Judging (`/api/events/{id}/judging`)
- `GET /api/events/{id}/judging/rubric`: Fetch rubric criteria, weights, and band anchors.
- `POST /api/events/{id}/judging/auto-assign`: Balanced judge-to-squad assignment with conflict blocking.
- `GET /api/events/{id}/judging/assignments`: List assigned squads for the current judge.
- `POST /api/events/{id}/judging/assignments/{id}/scores`: Submit append-only score revisions with comment.
- `GET /api/events/{id}/judging/leaderboard`: Standing leaderboard showing raw averages and z-score normalized scores.

## Cryptographic Audit Ledger (`/api/audit`)
- `GET /api/audit/verify`: Recomputes SHA-256 hash chain from genesis to tip to confirm ledger integrity.
- `GET /api/audit/feed`: Real-time audit activity feed for Mission Control dashboard.

## Reports & Exports (`/api/events/{id}/exports`)
- `GET /api/events/{id}/exports/csv?export_type={type}`: CSV export (participants, squads, attendance, scores, audit).
- `GET /api/events/{id}/exports/xlsx`: Multi-tab Excel workbook.
- `GET /api/events/{id}/exports/pdf/debrief`: Formatted printable PDF Mission Debrief report.

## Fun Layer (`/api/events/{id}/fun`)
- `GET /api/events/{id}/fun/passport`: Crew achievement badges & stamps.
- `POST /api/events/{id}/fun/mood-pulse`: Anonymous mood telemetry submission.
- `GET /api/events/{id}/fun/mood-trend`: Mood trend analytics.
- `POST /api/events/{id}/fun/help-tickets`: Request mentor help routed by skill tag.
- `GET /api/events/{id}/fun/big-screen`: Auto-rotating feed for big-screen projection.
- `POST /api/events/{id}/fun/reveal-ceremony`: Trigger staged results ceremony (3rd, 2nd, 1st).
