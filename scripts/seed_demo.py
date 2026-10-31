"""HACKOS Demo Seed Script.
Populates an obviously fake demo mission:
- 120 crew members
- 25 squads
- Planted duplicates for dedupe testing (30% fuzzy/exact)
- 3 judges (including 1 with recorded conflict of interest)
- 2 mentors
- Announcements, schedule items, rubric
- Partially complete submissions and revisions
"""
import sys
import os
import random
import datetime

# Add project root to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.orm import Session
from backend.app.db import SessionLocal, Base, engine
from backend.app.models.entities import (
    Event, User, EventRole, Participant, Team, TeamMembership, TeamHistory,
    Checkin, Announcement, ScheduleItem, Rubric, RubricCriterion, JudgeAssignment,
    Submission, SubmissionRevision, utcnow
)
from backend.app.schemas.schemas import EventCreate, ParticipantRegister, TeamCreate
from backend.app.services.event_service import EventService
from backend.app.services.auth_service import AuthService
from backend.app.services.dedupe_service import DedupeService
from backend.app.services.team_service import TeamService
from backend.app.services.submission_service import SubmissionService
from backend.app.services.judging_service import JudgingService
from backend.app.crypto import encrypt_field, deterministic_hash, normalize_email

FAKE_FIRST_NAMES = ["Orion", "Nova", "Cosmo", "Astra", "Zephyr", "Lyra", "Atlas", "Echo", "Phoenix", "Stella", "Caelum", "Vega", "Rigel", "Sirius", "Cassiopeia"]
FAKE_LAST_NAMES = ["Vance", "Cross", "Mercer", "Thorne", "Sterling", "Valen", "Drake", "Sinclair", "Vesper", "Solari", "Stark", "Hale"]
FAKE_COLLEGES = ["MIT Orbit Campus", "Stanford Nebula Institute", "Imperial Cyber Academy", "Tokyo Tech Station", "Zurich Space Polytechnic"]


def run_seed():
    db: Session = SessionLocal()
    print("🚀 Initializing HACKOS Mission Control Demo Seed...")

    # Step 1: Clean previous demo if exists
    existing = db.query(Event).filter_by(slug="apollo-24").first()
    if existing:
        print(f"Purging existing demo mission '{existing.slug}'...")
        db.delete(existing)
        db.commit()

    # Step 2: Create Super Admin & Organizers
    admin_user = AuthService.register_or_get_user(
        db, email="commander@hackos.io", password="Password123!", is_super_admin=True
    )
    organizer_user = AuthService.register_or_get_user(
        db, email="flight-director@hackos.io", password="Password123!"
    )
    volunteer_user = AuthService.register_or_get_user(
        db, email="gate-crew@hackos.io", password="Password123!"
    )
    judge1 = AuthService.register_or_get_user(db, email="judge1@hackos.io", password="Password123!")
    judge2 = AuthService.register_or_get_user(db, email="judge2@hackos.io", password="Password123!")
    judge3_conflicted = AuthService.register_or_get_user(db, email="judge3@hackos.io", password="Password123!")
    mentor1 = AuthService.register_or_get_user(db, email="mentor1@hackos.io", password="Password123!")
    mentor2 = AuthService.register_or_get_user(db, email="mentor2@hackos.io", password="Password123!")

    # Step 3: Create Mission
    event_payload = EventCreate(
        slug="apollo-24",
        title="APOLLO 24: Deep Space Orbital Hackathon",
        description="High-velocity 24-hour engineering mission building autonomous telemetry, neural space-probes, and fault-tolerant space systems.",
        format_type="offline_24h",
        starts_at=utcnow() - datetime.timedelta(hours=6),
        ends_at=utcnow() + datetime.timedelta(hours=18),
        submission_deadline=utcnow() + datetime.timedelta(hours=12),
        grace_period_minutes=20
    )
    event = EventService.create_event(db, event_payload, actor_id=admin_user.id)
    print(f"✅ Mission created: {event.title} (ID: {event.id})")

    # Assign event roles
    AuthService.assign_role(db, event.id, organizer_user.id, "organizer", admin_user.id)
    AuthService.assign_role(db, event.id, volunteer_user.id, "volunteer", organizer_user.id)
    AuthService.assign_role(db, event.id, judge1.id, "judge", organizer_user.id)
    AuthService.assign_role(db, event.id, judge2.id, "judge", organizer_user.id)
    AuthService.assign_role(db, event.id, judge3_conflicted.id, "judge", organizer_user.id)
    AuthService.assign_role(db, event.id, mentor1.id, "mentor", organizer_user.id)
    AuthService.assign_role(db, event.id, mentor2.id, "mentor", organizer_user.id)

    # Step 4: Add Announcements & Schedule
    ann1 = Announcement(
        event_id=event.id,
        title="Orbital Ignition Initiated",
        content="Welcome all crew to Apollo 24. Boarding gates are active. Submit your team rosters before T+4 hours.",
        priority="high",
        is_pinned=True
    )
    ann2 = Announcement(
        event_id=event.id,
        title="Ration Station / Dinner Open",
        content="Hot rations served at Swag Hangar until 21:00 UTC. Remember to present your meal token barcode.",
        priority="normal",
        is_pinned=False
    )
    db.add_all([ann1, ann2])

    sch1 = ScheduleItem(
        event_id=event.id,
        title="Mission Briefing & Keynote",
        description="Opening keynote on edge computing in low earth orbit.",
        start_time=event.starts_at,
        end_time=event.starts_at + datetime.timedelta(hours=1),
        location="Main Flight Deck"
    )
    sch2 = ScheduleItem(
        event_id=event.id,
        title="Flight Review (Judging Window)",
        description="Live rubric evaluation with assigned mission judges.",
        start_time=event.submission_deadline,
        end_time=event.submission_deadline + datetime.timedelta(hours=3),
        location="Review Hangars A-D"
    )
    sch3 = ScheduleItem(
        event_id=event.id,
        title="Mission Debrief & Reveal Ceremony",
        description="Podium finish announcements and awards presentation.",
        start_time=event.ends_at - datetime.timedelta(hours=1),
        end_time=event.ends_at,
        location="Main Flight Deck"
    )
    db.add_all([sch1, sch2, sch3])
    db.commit()

    # Step 5: Register Hacker & 120 Crew with 30% planted duplicates
    print("Registering demo hacker and 120 crew participants (including planted duplicates)...")
    participants = []

    # Dedicated Hacker Demo Account
    hacker_user = AuthService.register_or_get_user(db, email="hacker@whycode4u.com", password="Password123!")
    hacker_reg = ParticipantRegister(
        name="Alex Rivera",
        email="hacker@whycode4u.com",
        phone="+1555010000",
        college="Stanford Innovation Lab",
        consent=True,
        custom_fields={"skills": ["React", "Python", "Full-Stack"]}
    )
    hacker_part, _ = DedupeService.register_participant(db, event.id, hacker_reg, actor_id=organizer_user.id)
    participants.append(hacker_part)

    for i in range(1, 91):  # 90 unique
        fname = random.choice(FAKE_FIRST_NAMES)
        lname = random.choice(FAKE_LAST_NAMES)
        name = f"{fname} {lname} #{i}"
        em = f"crew_{i}_{fname.lower()}@apollo.hackos.io"
        ph = f"+155501{i:04d}"
        col = random.choice(FAKE_COLLEGES)

        # Ensure user account has password
        u = AuthService.register_or_get_user(db, email=em, password="Password123!")

        reg = ParticipantRegister(
            name=name,
            email=em,
            phone=ph,
            college=col,
            consent=True,
            custom_fields={"skills": random.sample(["Python", "Rust", "React", "AI/ML", "DevOps", "Embedded"], k=2)}
        )
        part, _ = DedupeService.register_participant(db, event.id, reg, actor_id=organizer_user.id)
        participants.append(part)

    # 30 Planted duplicates (exact email, phone, or fuzzy name+college)
    print("Planting 30 duplicate registrations to test dedupe engine...")
    for j in range(1, 31):
        target = participants[(j * 2) % len(participants)]
        # Mix of exact and fuzzy
        if j % 3 == 0:
            dup_reg = ParticipantRegister(
                name=f"{target.name} Duplicate",
                email=f"dup_{j}_{random.randint(100,999)}@apollo.hackos.io",
                phone=f"+155501{(j*2)%len(participants):04d}",  # exact phone
                college=random.choice(FAKE_COLLEGES)
            )
        else:
            dup_reg = ParticipantRegister(
                name=target.name,  # identical or very close name
                email=f"alter_{j}@apollo.hackos.io",
                phone=f"+155599{j:04d}",
                college="MIT Orbit Campus"  # similar college
            )
        part, dedupe = DedupeService.register_participant(db, event.id, dup_reg, actor_id=organizer_user.id)
        participants.append(part)

    # Step 6: Form 25 Squads
    print("Forming 25 squads and assigning members...")
    squads = []
    usable_crew = [p for p in participants if p.status == "registered"]
    for s_idx in range(1, 26):
        if not usable_crew:
            break
        leader = usable_crew.pop(0)
        team_name = f"Squad {random.choice(FAKE_FIRST_NAMES)}-{s_idx:02d}"
        t_payload = TeamCreate(name=team_name, tagline="Autonomous deep space system.", track="Systems & AI")
        team = TeamService.create_team(db, event.id, leader.id, t_payload, actor_id=leader.user_id)
        squads.append(team)

        # Add 2-3 members
        for _ in range(random.randint(1, 3)):
            if usable_crew:
                member = usable_crew.pop(0)
                TeamService.join_team_by_code(db, event.id, member.id, team.join_code, actor_id=member.user_id)

    # Make judge3 a member of squad 25 to establish a verified Conflict of Interest
    judge3_part = db.query(Participant).filter_by(user_id=judge3_conflicted.id, event_id=event.id).first()
    if not judge3_part:
        judge3_reg = ParticipantRegister(
            name="Judge Conflicted Member",
            email="judge3@hackos.io",
            phone="+1555990003",
            college="Imperial Cyber Academy"
        )
        judge3_part, _ = DedupeService.register_participant(db, event.id, judge3_reg, actor_id=organizer_user.id)
    target_squad = squads[-1]
    if not judge3_part.squad_id and len(target_squad.memberships) < 4:
        TeamService.join_team_by_code(db, event.id, judge3_part.id, target_squad.join_code, actor_id=judge3_conflicted.id)

    # Step 7: Create Submissions with Revisions for First 15 Squads
    print("Creating launch submissions with SHA-256 revisions...")
    for t in squads[:15]:
        from backend.app.schemas.schemas import SubmissionDraft
        draft = SubmissionDraft(
            repo_url=f"https://github.com/hackos-demo/{t.name.lower().replace(' ', '-')}",
            demo_url=f"https://{t.name.lower().replace(' ', '-')}.hackos.live",
            video_url="https://youtube.com/watch?v=dQw4w9WgXcQ",
            description="Deep space distributed fault-tolerant database with automatic sensor failover.",
            claimed_at=utcnow()
        )
        SubmissionService.save_draft_or_launch(
            db=db,
            event_id=event.id,
            team_id=t.id,
            submitter_id=t.leader_id,
            payload=draft,
            is_final_launch=True
        )

    # Step 8: Auto Assign Judges & Score
    print("Configuring judge assignments and submitting Flight Review scores...")
    JudgingService.assign_judges_balanced(db, event.id, actor_id=admin_user.id)

    # Score squads 1 through 10
    rubric = db.query(Rubric).filter_by(event_id=event.id).first()
    if rubric and rubric.criteria:
        assignments = db.query(JudgeAssignment).filter_by(event_id=event.id, is_conflict=False).all()
        for a in assignments[:15]:
            from backend.app.schemas.schemas import ScoreInput
            scores = [
                ScoreInput(
                    criterion_id=c.id,
                    score=round(random.uniform(7.0, 9.8), 1),
                    comment="Strong architecture and clean execution."
                )
                for c in rubric.criteria
            ]
            JudgingService.submit_scores(
                db=db,
                assignment_id=a.id,
                scores=scores,
                judge_user_id=a.judge_id,
                actor_id=a.judge_id
            )

    db.close()
    print("✨ HACKOS DEMO SEED COMPLETED SUCCESSFULLY! ✨")
    print("\nDEMO CREDENTIALS (Password: Password123!):")
    print("  Super Admin: commander@hackos.io")
    print("  Organizer:   flight-director@hackos.io")
    print("  Volunteer:   gate-crew@hackos.io")
    print("  Judge 1:     judge1@hackos.io")
    print("  Judge 2:     judge2@hackos.io")
    print("  Conflicted:  judge3@hackos.io")
    print("  Mentors:     mentor1@hackos.io, mentor2@hackos.io")


if __name__ == "__main__":
    run_seed()
