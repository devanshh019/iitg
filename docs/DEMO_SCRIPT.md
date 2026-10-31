# HACKOS 5-Minute Production Demo Script

Follow this script to demonstrate the full end-to-end hackathon journey in under 5 minutes.

---

### Step 1: Mission Control Setup & Funnel Overview (1:00)
1. Navigate to `http://localhost:5173`.
2. Select **Role: Organizer** from the top right selector.
3. Open **Mission Control** tab:
   - Review live funnel metrics: 120 Registered Crew, 25 Formed Squads, 86 Boarded, 15 Launches.
   - Inspect the **Dedupe Inbox**: View the 30 planted duplicate anomalies (flagged by RapidFuzz and exact hashes). Click **Merge** or **Keep Both** on a candidate.
   - In the top action bar, click **Verify Audit Chain**: Observe cryptographic verification across all blocks from genesis to tip.

---

### Step 2: Crew Portal Journey & Boarding Pass (1:00)
1. Switch **Role: Crew (Participant)**.
2. In **Crew Portal**:
   - Observe the animated Mission Status Ribbon (`Registered -> Squad Locked -> Boarded -> Launched -> Reviewed -> Debrief`).
   - Click the **Boarding Pass** button: view your personal Ed25519-signed QR pass and 6-character fallback code.
   - Note the **One Clear Next Action** hero card prompting the next directive.
   - Check the **Crew Pulse** slider: slide to "Orbital Velocity" (5) and submit mood telemetry.

---

### Step 3: Squad Assembly & Squad Finder (0:45)
1. Navigate to **Squads** tab:
   - View active squads in the mission hangar.
   - Review **Squad Finder Recommendations**: note automated skill-gap matching for solo participants.
   - Click **Assemble Squad**: click "Randomize" to see the Mission Control name generator create fun space-themed squad names and taglines.

---

### Step 4: Boarding Gate Offline Scanner (0:45)
1. Switch **Role: Volunteer** and navigate to **Boarding Gate**.
2. Select station: `Main Boarding Gate` or `Rations / Meals`.
3. In the manual input box, paste a 6-character fallback code (e.g. `APOLLO-99`) or enter any test code.
4. Click **Scan**:
   - Hear the synthesized Web Audio chime and see the celebratory confetti animation!
   - Note the live station throughput metrics updating in real-time.
   - Toggle Wi-Fi offline or simulate offline: observe scans queuing in IndexedDB and syncing idempotently.

---

### Step 5: Launch Submission & Receipt (0:45)
1. Switch **Role: Crew** and navigate to **Launches**.
2. Observe the current revision number.
3. Enter repository and demo URLs, and click **Initiate Final Launch**:
   - View the verified **Launch Receipt** with server timestamp, revision SHA-256 hash, and verification QR code.
   - Optimistic concurrency prevents race conditions if a teammate edits concurrently.

---

### Step 6: Flight Review, Big Screen & Reveal Ceremony (0:45)
1. Switch **Role: Judge** and navigate to **Flight Review**:
   - Inspect assigned squads. Toggle **Blind Mode** to see squad names masked.
   - Click **Score Squad**: score rubric criteria with live weightings and band anchors.
   - View the **Leaderboard**: inspect Raw Averages vs. Z-Score Normalized scores side-by-side with outlier detection flags.
2. Press **⌘K** (Command Palette) and navigate to **Big Screen**:
   - View the full-screen auto-rotating projection mode with countdown clock.
   - Trigger the **Reveal Ceremony**: reveal 3rd, 2nd, and Champion 1st place with victory animation!
