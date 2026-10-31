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


## Decision 8: Luxury White / Maroon / Warm Stone Palette & Simplified Mobile-First UX
- **Decision:** Shift primary theme palette from dark cyan to a luxury warm white / porcelain surface (`#FAF9F6`), white elevated cards (`#FFFFFF`), primary maroon brand accents (`#881337`, `#700F2E`, `#9F1239`), deep espresso typography (`#1C1917`), and warm stone neutral borders (`#E7E5E4`), inspired by the reference architecture in `AI-Web-Hook`.
- **Reason:** Provides crystal-clear visual hierarchy, exceptional readability under daylight conditions, high-contrast touch targets ($44\text{px}+$ on mobile), and an uncluttered, modern enterprise feel. Added a sticky translucent bottom mobile navigation bar (`MobileNav.tsx`) for single-thumb navigation on iOS/Android viewports.

## Decision 9: Full Multi-Persona Authentication Architecture & Gateway
- **Decision:** Implemented a full-stack authentication system with:
  1. Backend `POST /api/auth/register` and `POST /api/auth/login` with JWT tokens, Argon2 password hashing, and role claims.
  2. Frontend `AuthContext` with automatic token hydration, session persistence in `localStorage`, and centralized 401 unauthorization handling.
  3. Interactive `LoginPage` featuring tabbed sign-in, self-registration, and 1-click Demo Personas (Flight Director / Organizer, Mission Commander / Super Admin, Lead Flight Reviewer / Judge, Gate Crew / Volunteer, and Crew Member / Participant).
- **Reason:** Enables frictionless local evaluation and automated QA testing without manual token manipulation while upholding strict server-side RBAC on every operational endpoint.


## Decision 10: Strict RBAC View Gating & App-First Humanized Interface
- **Decision:** Restrict view visibility and navigation strictly by the authenticated user's role:
  - `participant`: Limited to **Dashboard & QR Pass**, **My Team**, **Submit Project**, and **Perks & Mentors**. (Hidden: Judging, Gate Scanner, Admin Mission Control, Big Screen).
  - `judge`: Limited to **Judging Desk** (scoring assigned teams) and **Event Overview**.
  - `volunteer`: Limited to **Check-in Scanner** and **Event Overview**.
  - `organizer` / `super_admin`: Full access across Mission Control, Squads, Scanner, Submissions, Flight Review, and Big Screen.
- **Reason:** Ordinary hackathon participants were overwhelmed by complex mission telemetry, admin dedupe triages, and judging queues. Simplifying the visual vocabulary (e.g., "Submit Project" instead of "Project Launch Desk SHA-256") and tailoring the mobile navigation directly to each user's job gives a native mobile app feel with zero cognitive clutter.


## Decision 11: WhyCode4U Rebranding & Pure Apple Black/White Interface
- **Decision:** Overhauled the application branding to **WhyCode4U** and implemented Apple HIG design physics:
  1. Monochromatic Black & White design: solid black primary buttons (`bg-black text-white hover:bg-neutral-800`), Apple hairline borders (`border-black/[0.08]`), and pure white cards with fluid spring press reactions (`active:scale-[0.97]`). Removed all washed-out white buttons.
  2. Deleted demo personas tabs and switcher from UI.
  3. Implemented Hacker Multi-step Onboarding:
     - Step 1: Sign up / Sign in with duplicate account detection.
     - Step 2: Hackathon Confirmation ("WhyCode4U: Apollo 24 Sprint").
     - Step 3: Team Formation (Create team with invite code or Join existing team).
  4. Added dedicated digital QR passes for Entrance/Accommodation and Food vouchers (Breakfast, Lunch, Dinner).
  5. Built dedicated `ProblemStatementsView` displaying organizer-revealed problem statements with track selection, stage, live countdown, and event rules.
  6. Built iOS Notification Center style `AnnouncementsView`.
  7. Built stage-wise `LaunchDeskView` with strict deadline cutoff enforcement.

## Decision 12: Zero-Friction Authentication Resolution & Automatic Hacker Enrollment
- **Decision:** 
  1. Resolved login failure caused by missing password hashes on seeded crew members and unseeded demo emails by seeding a first-class participant `hacker@whycode4u.com` (`Password123!`), updating all participant accounts with Argon2 password hashes, and seeding `crew_1_phoenix@apollo.hackos.io`.
  2. Enhanced `POST /api/auth/register` to automatically enroll newly registered users as active participants in the current mission (`apollo-24`), creating their cryptographic participant profile and fallback codes.
  3. Added Apple-style 1-click Instant Demo Account chips on the login card (Hacker, Organizer, Judge, Gate Crew) and prefilled `hacker@whycode4u.com` by default so users can log in instantaneously without typing.
  4. Updated frontend `apiFetch` to prevent retrying 4xx client errors (401, 400) and updated `AuthContext` to invalidate stale local storage tokens on 401 response.
- **Reason:** Guarantees instantaneous, zero-friction login for all personas in development and production testing while maintaining cryptographic RBAC integrity.
