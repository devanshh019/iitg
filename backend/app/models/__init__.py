"""Expose all models cleanly for Alembic and application imports."""
from backend.app.models.entities import (
    Event, User, EventRole, Participant, Team, TeamMembership, TeamHistory,
    Checkin, SyncOp, Announcement, AnnouncementAcknowledgement, ScheduleItem,
    ProblemStatement, MentorSlot, HelpTicket, Submission, SubmissionRevision,
    Rubric, RubricCriterion, JudgeAssignment, ScoreRevision, AuditLog,
    Badge, ParticipantBadge, Token, MoodPulse, ExportJob, generate_uuid, utcnow
)

__all__ = [
    "Event", "User", "EventRole", "Participant", "Team", "TeamMembership", "TeamHistory",
    "Checkin", "SyncOp", "Announcement", "AnnouncementAcknowledgement", "ScheduleItem",
    "ProblemStatement", "MentorSlot", "HelpTicket", "Submission", "SubmissionRevision",
    "Rubric", "RubricCriterion", "JudgeAssignment", "ScoreRevision", "AuditLog",
    "Badge", "ParticipantBadge", "Token", "MoodPulse", "ExportJob", "generate_uuid", "utcnow"
]
