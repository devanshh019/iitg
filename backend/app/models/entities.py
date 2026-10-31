"""SQLAlchemy 2 database models for HACKOS."""
import datetime
import uuid
from typing import Optional, List
from sqlalchemy import (
    Column, String, Text, Boolean, Integer, Float, DateTime,
    ForeignKey, Index, JSON, UniqueConstraint
)
from sqlalchemy.orm import relationship
from backend.app.db import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime.datetime:
    return datetime.datetime.now(datetime.timezone.utc)


class Event(Base):
    """Missions / Events table."""
    __tablename__ = "events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    format_type = Column(String(50), default="offline_24h")  # offline_24h, online_48h, hybrid_rounds
    status = Column(String(50), default="draft")  # draft, published, ongoing, completed, archived
    format_config = Column(JSON, nullable=False, default=dict)
    
    # Asymmetric keys for Ed25519 offline boarding verification
    ed25519_public_key = Column(String(255), nullable=False)
    ed25519_private_key_enc = Column(Text, nullable=False)

    starts_at = Column(DateTime(timezone=True), nullable=True)
    ends_at = Column(DateTime(timezone=True), nullable=True)
    submission_deadline = Column(DateTime(timezone=True), nullable=True)
    grace_period_minutes = Column(Integer, default=15)
    is_submissions_locked = Column(Boolean, default=False)
    is_teams_locked = Column(Boolean, default=False)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    # Relationships
    organization_rel = relationship("Organization", back_populates="events")
    roles = relationship("EventRole", back_populates="event", cascade="all, delete-orphan")
    participants = relationship("Participant", back_populates="event", cascade="all, delete-orphan")
    teams = relationship("Team", back_populates="event", cascade="all, delete-orphan")
    checkins = relationship("Checkin", back_populates="event", cascade="all, delete-orphan")
    announcements = relationship("Announcement", back_populates="event", cascade="all, delete-orphan")
    submissions = relationship("Submission", back_populates="event", cascade="all, delete-orphan")
    rubrics = relationship("Rubric", back_populates="event", cascade="all, delete-orphan")
    audit_logs = relationship("AuditLog", back_populates="event", cascade="all, delete-orphan")


class Organization(Base):
    """Organizations hosting hackathon arenas (Universities, Enterprises, DAOs)."""
    __tablename__ = "organizations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    website = Column(String(255), nullable=True)
    contact_email = Column(String(255), nullable=True)
    logo_url = Column(String(255), nullable=True)
    category = Column(String(100), default="university")
    is_verified = Column(Boolean, default=True)
    owner_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    owner = relationship("User")
    events = relationship("Event", back_populates="organization_rel")


class User(Base):
    """Platform Users table."""
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email_enc = Column(Text, nullable=False)  # Fernet encrypted
    email_hash = Column(String(64), unique=True, nullable=False, index=True)  # Deterministic lookup
    password_hash = Column(String(255), nullable=True)  # Argon2
    is_active = Column(Boolean, default=True)
    is_super_admin = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    event_roles = relationship("EventRole", back_populates="user", cascade="all, delete-orphan")
    participant = relationship("Participant", back_populates="user", uselist=False)


class EventRole(Base):
    """Event-scoped RBAC roles: super_admin, organizer, volunteer, mentor, judge, participant."""
    __tablename__ = "event_roles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_id = Column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(50), nullable=False)  # super_admin, organizer, volunteer, mentor, judge, participant
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    event = relationship("Event", back_populates="roles")
    user = relationship("User", back_populates="event_roles")

    __table_args__ = (
        UniqueConstraint("event_id", "user_id", "role", name="uq_event_user_role"),
    )


class Participant(Base):
    """Crew / Hackathon participants."""
    __tablename__ = "participants"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_id = Column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    name = Column(String(255), nullable=False)
    email_enc = Column(Text, nullable=False)
    phone_enc = Column(Text, nullable=True)
    college_enc = Column(Text, nullable=True)

    # Deterministic lookups & dedupe
    normalized_email_hash = Column(String(64), nullable=False, index=True)
    normalized_phone_hash = Column(String(64), nullable=True, index=True)
    dedupe_key = Column(String(64), nullable=False, index=True)
    consent = Column(Boolean, default=True, nullable=False)
    custom_fields = Column(JSON, nullable=False, default=dict)

    # Status
    status = Column(String(50), default="registered")  # registered, squad_locked, boarded, launched, reviewed, debriefed
    short_fallback_code = Column(String(10), nullable=False, index=True)
    squad_id = Column(String(36), ForeignKey("teams.id", ondelete="SET NULL"), nullable=True, index=True)

    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    event = relationship("Event", back_populates="participants")
    user = relationship("User", back_populates="participant")
    team = relationship("Team", back_populates="members", foreign_keys=[squad_id])
    checkins = relationship("Checkin", back_populates="participant")
    badges = relationship("ParticipantBadge", back_populates="participant", cascade="all, delete-orphan")


class Team(Base):
    """Squads / Teams table."""
    __tablename__ = "teams"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_id = Column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    tagline = Column(String(255), nullable=True)
    join_code = Column(String(16), unique=True, nullable=False, index=True)
    leader_id = Column(String(36), ForeignKey("participants.id", ondelete="SET NULL", use_alter=True, name="fk_teams_leader_id"), nullable=True)
    track = Column(String(100), nullable=True)

    is_locked = Column(Boolean, default=False)
    lock_reason = Column(String(255), nullable=True)
    extension_deadline = Column(DateTime(timezone=True), nullable=True)
    extension_reason = Column(String(255), nullable=True)

    # Problem Statement selection and lock
    problem_statement_id = Column(String(36), ForeignKey("problem_statements.id", ondelete="SET NULL"), nullable=True)
    is_ps_locked = Column(Boolean, default=False)
    ps_locked_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    event = relationship("Event", back_populates="teams")
    problem_statement = relationship("ProblemStatement")
    members = relationship("Participant", back_populates="team", foreign_keys="[Participant.squad_id]")
    memberships = relationship("TeamMembership", back_populates="team", cascade="all, delete-orphan")
    history = relationship("TeamHistory", back_populates="team", cascade="all, delete-orphan")
    submission = relationship("Submission", back_populates="team", uselist=False)


class TeamMembership(Base):
    """Team membership records."""
    __tablename__ = "team_memberships"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    team_id = Column(String(36), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)
    participant_id = Column(String(36), ForeignKey("participants.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(50), default="member")  # leader, member
    joined_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    team = relationship("Team", back_populates="memberships")
    participant = relationship("Participant")

    __table_args__ = (
        UniqueConstraint("team_id", "participant_id", name="uq_team_participant"),
    )


class TeamHistory(Base):
    """Audit log of team roster changes."""
    __tablename__ = "team_history"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    team_id = Column(String(36), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)
    action = Column(String(50), nullable=False)  # created, joined, left, transfer_lead, locked, unlocked, override
    actor_id = Column(String(36), nullable=False)
    details = Column(JSON, nullable=False, default=dict)
    timestamp = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    team = relationship("Team", back_populates="history")


class Checkin(Base):
    """Boarding / Check-in entries (offline sync capable)."""
    __tablename__ = "checkins"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_id = Column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    participant_id = Column(String(36), ForeignKey("participants.id", ondelete="CASCADE"), nullable=False, index=True)
    station = Column(String(50), default="entry")  # entry, meals, swag, workshop, final_presentation
    method = Column(String(50), default="qr")  # qr, fallback_code, manual
    device_id = Column(String(100), nullable=False)
    op_id = Column(String(64), unique=True, nullable=False, index=True)  # Idempotency key from client

    claimed_at = Column(DateTime(timezone=True), nullable=False)  # Client timestamp
    server_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)  # Assigned by server
    synced_from_offline = Column(Boolean, default=False)
    status = Column(String(20), default="ACCEPTED")  # ACCEPTED, DUPLICATE

    event = relationship("Event", back_populates="checkins")
    participant = relationship("Participant", back_populates="checkins")

    __table_args__ = (
        Index("idx_checkin_event_part_station", "event_id", "participant_id", "station"),
    )


class SyncOp(Base):
    """Recorded sync operations for strict idempotency."""
    __tablename__ = "sync_ops"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    op_id = Column(String(64), unique=True, nullable=False, index=True)
    device_id = Column(String(100), nullable=False)
    station = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False)
    result_payload = Column(JSON, nullable=False, default=dict)
    processed_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


class Announcement(Base):
    """Event broadcasts / Mission bulletins."""
    __tablename__ = "announcements"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_id = Column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    audience_filter = Column(String(50), default="all")  # all, crew, mentors, judges
    priority = Column(String(20), default="normal")  # normal, high, critical
    is_pinned = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    event = relationship("Event", back_populates="announcements")
    acknowledgements = relationship("AnnouncementAcknowledgement", back_populates="announcement", cascade="all, delete-orphan")


class AnnouncementAcknowledgement(Base):
    """Crew read receipts for announcements."""
    __tablename__ = "announcement_acknowledgements"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    announcement_id = Column(String(36), ForeignKey("announcements.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    acknowledged_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    announcement = relationship("Announcement", back_populates="acknowledgements")

    __table_args__ = (
        UniqueConstraint("announcement_id", "user_id", name="uq_announcement_user"),
    )


class ScheduleItem(Base):
    """Mission timeline schedule."""
    __tablename__ = "schedule_items"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_id = Column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    track = Column(String(100), default="general")
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    location = Column(String(255), nullable=True)


class ProblemStatement(Base):
    """Mission Challenges / Problem Statements with timed reveal."""
    __tablename__ = "problem_statements"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_id = Column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    track = Column(String(100), default="general")
    description = Column(Text, nullable=False)
    requirements = Column(JSON, nullable=False, default=list)
    rules = Column(Text, nullable=True)
    reveal_at = Column(DateTime(timezone=True), nullable=False)
    is_revealed = Column(Boolean, default=False)


class MentorSlot(Base):
    """Mentor Pit Stop bookable slots."""
    __tablename__ = "mentor_slots"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_id = Column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    mentor_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=False)
    is_booked = Column(Boolean, default=False)
    booked_by_team_id = Column(String(36), ForeignKey("teams.id", ondelete="SET NULL"), nullable=True)


class HelpTicket(Base):
    """Crew help tickets routed by skill tag."""
    __tablename__ = "help_tickets"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_id = Column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    team_id = Column(String(36), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)
    mentor_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    skill_tag = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(30), default="open")  # open, assigned, in_progress, resolved
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)


class Submission(Base):
    """Squad Launches / Submissions."""
    __tablename__ = "submissions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_id = Column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    team_id = Column(String(36), ForeignKey("teams.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    final_receipt_id = Column(String(64), nullable=True, index=True)
    is_late = Column(Boolean, default=False)
    extension_reason = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    event = relationship("Event", back_populates="submissions")
    team = relationship("Team", back_populates="submission")
    revisions = relationship("SubmissionRevision", back_populates="submission", cascade="all, delete-orphan", order_by="SubmissionRevision.revision_number")


class SubmissionRevision(Base):
    """Append-only revision records for submissions."""
    __tablename__ = "submission_revisions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    submission_id = Column(String(36), ForeignKey("submissions.id", ondelete="CASCADE"), nullable=False, index=True)
    revision_number = Column(Integer, nullable=False)
    repo_url = Column(String(500), nullable=True)
    demo_url = Column(String(500), nullable=True)
    video_url = Column(String(500), nullable=True)
    deck_url = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)
    custom_answers = Column(JSON, nullable=False, default=dict)

    content_hash = Column(String(64), nullable=False)  # SHA-256 of fields
    submitter_id = Column(String(36), nullable=False)
    claimed_at = Column(DateTime(timezone=True), nullable=False)
    server_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    submission = relationship("Submission", back_populates="revisions")

    __table_args__ = (
        UniqueConstraint("submission_id", "revision_number", name="uq_sub_revision"),
    )


class Rubric(Base):
    """Flight Review Rubric definition."""
    __tablename__ = "rubrics"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_id = Column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    is_default = Column(Boolean, default=True)

    event = relationship("Event", back_populates="rubrics")
    criteria = relationship("RubricCriterion", back_populates="rubric", cascade="all, delete-orphan")


class RubricCriterion(Base):
    """Rubric criterion with weights and band anchors."""
    __tablename__ = "rubric_criteria"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    rubric_id = Column(String(36), ForeignKey("rubrics.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    weight = Column(Float, default=1.0)
    scale_min = Column(Float, default=1.0)
    scale_max = Column(Float, default=10.0)
    band_anchors = Column(JSON, nullable=False, default=dict)  # {"1": "Poor", "5": "Average", "10": "Exceptional"}

    rubric = relationship("Rubric", back_populates="criteria")


class JudgeAssignment(Base):
    """Assignments of judges to squads."""
    __tablename__ = "judge_assignments"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_id = Column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    judge_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    team_id = Column(String(36), ForeignKey("teams.id", ondelete="CASCADE"), nullable=False, index=True)
    is_conflict = Column(Boolean, default=False)
    conflict_reason = Column(String(255), nullable=True)

    scores = relationship("ScoreRevision", back_populates="assignment", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("event_id", "judge_id", "team_id", name="uq_judge_team_assignment"),
    )


class ScoreRevision(Base):
    """Append-only judging scores."""
    __tablename__ = "scores"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    assignment_id = Column(String(36), ForeignKey("judge_assignments.id", ondelete="CASCADE"), nullable=False, index=True)
    criterion_id = Column(String(36), ForeignKey("rubric_criteria.id", ondelete="CASCADE"), nullable=False, index=True)
    score = Column(Float, nullable=False)
    comment = Column(Text, nullable=True)
    revision_number = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    assignment = relationship("JudgeAssignment", back_populates="scores")
    criterion = relationship("RubricCriterion")


class AuditLog(Base):
    """Append-only, hash-chained audit ledger."""
    __tablename__ = "audit_log"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_id = Column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=True, index=True)
    actor_id = Column(String(36), nullable=False)
    action = Column(String(100), nullable=False)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(String(64), nullable=False)
    payload = Column(JSON, nullable=False, default=dict)
    
    prev_hash = Column(String(64), nullable=False)
    hash = Column(String(64), nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    event = relationship("Event", back_populates="audit_logs")


class Badge(Base):
    """Gamification badges / Mission stamps."""
    __tablename__ = "badges"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    key = Column(String(50), unique=True, nullable=False)
    title = Column(String(100), nullable=False)
    description = Column(String(255), nullable=False)
    icon = Column(String(50), nullable=False)


class ParticipantBadge(Base):
    """Badges awarded to crew."""
    __tablename__ = "participant_badges"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    participant_id = Column(String(36), ForeignKey("participants.id", ondelete="CASCADE"), nullable=False, index=True)
    badge_key = Column(String(50), nullable=False)
    awarded_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    participant = relationship("Participant", back_populates="badges")


class Token(Base):
    """Meal and swag one-time tokens."""
    __tablename__ = "tokens"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_id = Column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    participant_id = Column(String(36), ForeignKey("participants.id", ondelete="CASCADE"), nullable=False, index=True)
    token_type = Column(String(50), nullable=False)  # MEAL_LUNCH, MEAL_DINNER, SWAG
    code = Column(String(32), unique=True, nullable=False, index=True)
    is_used = Column(Boolean, default=False)
    used_at = Column(DateTime(timezone=True), nullable=True)


class MoodPulse(Base):
    """Anonymous Crew Pulse mood check-in."""
    __tablename__ = "mood_pulses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_id = Column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    mood_score = Column(Integer, nullable=False)  # 1 to 5
    energy_level = Column(String(50), default="high")  # low, medium, high, hyper
    note = Column(String(255), nullable=True)
    timestamp = Column(DateTime(timezone=True), default=utcnow, nullable=False)


class ExportJob(Base):
    """Export jobs for CSV, XLSX, PDF."""
    __tablename__ = "export_jobs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    event_id = Column(String(36), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True)
    export_type = Column(String(50), nullable=False)
    status = Column(String(50), default="completed")
    file_path = Column(String(500), nullable=True)
    requester_id = Column(String(36), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
