"""Pydantic schemas for all API requests and responses."""
import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, Field
from backend.app.schemas.event_config import EventFormatConfig


# Auth
class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str
    is_super_admin: bool
    roles: List[Dict[str, str]] = []


class LoginRequest(BaseModel):
    email: EmailStr
    password: Optional[str] = None
    magic_code: Optional[str] = None


class RequestMagicLogin(BaseModel):
    email: EmailStr
    event_slug: Optional[str] = None


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: Optional[str] = None
    is_super_admin: bool = False


# Organizations
class OrganizationCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    slug: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = None
    website: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    logo_url: Optional[str] = None
    category: str = "university"


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    contact_email: Optional[EmailStr] = None
    logo_url: Optional[str] = None
    category: Optional[str] = None


class OrganizationResponse(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    website: Optional[str] = None
    contact_email: Optional[str] = None
    logo_url: Optional[str] = None
    category: str
    is_verified: bool
    owner_id: Optional[str] = None
    events_count: int = 0
    created_at: datetime.datetime


# Events / Missions
class EventCreate(BaseModel):
    slug: str = Field(..., min_length=3, max_length=50)
    title: str = Field(..., min_length=3, max_length=255)
    description: Optional[str] = None
    format_type: str = "offline_24h"
    format_config: Optional[EventFormatConfig] = None
    starts_at: Optional[datetime.datetime] = None
    ends_at: Optional[datetime.datetime] = None
    submission_deadline: Optional[datetime.datetime] = None
    grace_period_minutes: int = 15


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    format_config: Optional[EventFormatConfig] = None
    status: Optional[str] = None
    starts_at: Optional[datetime.datetime] = None
    ends_at: Optional[datetime.datetime] = None
    submission_deadline: Optional[datetime.datetime] = None
    is_submissions_locked: Optional[bool] = None
    is_teams_locked: Optional[bool] = None


class EventResponse(BaseModel):
    id: str
    slug: str
    title: str
    description: Optional[str]
    format_type: str
    status: str
    format_config: Dict[str, Any]
    ed25519_public_key: str
    starts_at: Optional[datetime.datetime]
    ends_at: Optional[datetime.datetime]
    submission_deadline: Optional[datetime.datetime]
    grace_period_minutes: int
    is_submissions_locked: bool
    is_teams_locked: bool
    created_at: datetime.datetime


# Participants / Crew
class ParticipantRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: Optional[str] = None
    college: Optional[str] = None
    consent: bool = True
    custom_fields: Dict[str, Any] = Field(default_factory=dict)


class ParticipantResponse(BaseModel):
    id: str
    event_id: str
    user_id: Optional[str]
    name: str
    email: str  # Masked or plain based on role
    phone: Optional[str]
    college: Optional[str]
    status: str
    short_fallback_code: str
    squad_id: Optional[str]
    created_at: datetime.datetime


class DedupeMatch(BaseModel):
    existing_participant_id: str
    existing_name: str
    existing_email: str
    incoming_participant_id: str
    incoming_name: str
    incoming_email: str
    match_type: str  # exact_email, exact_phone, fuzzy_name_college
    confidence: float


class DedupeResolveRequest(BaseModel):
    action: str = Field(..., description="merge, keep_both, reject")
    primary_id: str
    secondary_id: str


# Squads / Teams
class TeamCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    tagline: Optional[str] = None
    track: Optional[str] = None


class TeamJoin(BaseModel):
    join_code: str


class TeamTransferLead(BaseModel):
    new_leader_id: str


class TeamOverrideLock(BaseModel):
    is_locked: bool
    reason: str


class TeamResponse(BaseModel):
    id: str
    event_id: str
    name: str
    tagline: Optional[str]
    join_code: str
    leader_id: Optional[str]
    track: Optional[str]
    is_locked: bool
    lock_reason: Optional[str]
    problem_statement_id: Optional[str] = None
    is_ps_locked: bool = False
    ps_locked_at: Optional[datetime.datetime] = None
    member_count: int = 0
    members: List[ParticipantResponse] = []
    created_at: datetime.datetime


class ProblemStatementResponse(BaseModel):
    id: str
    event_id: str
    title: str
    track: str
    description: str
    requirements: List[str] = []
    rules: Optional[str] = None
    reveal_at: datetime.datetime
    is_revealed: bool


class TeamLockPSRequest(BaseModel):
    problem_statement_id: str


# Boarding / Checkin
class CheckinScan(BaseModel):
    op_id: str  # Client-side UUID
    participant_token_or_code: str
    station: str = "entry"
    method: str = "qr"  # qr, fallback_code, manual
    device_id: str
    claimed_at: datetime.datetime


class SyncCheckinBatch(BaseModel):
    device_id: str
    station: str
    scans: List[CheckinScan]


class CheckinResult(BaseModel):
    op_id: str
    participant_id: Optional[str]
    participant_name: Optional[str]
    status: str  # ACCEPTED, DUPLICATE, INVALID, EXPIRED
    station: str
    claimed_at: datetime.datetime
    server_at: datetime.datetime
    message: str


class StationThroughput(BaseModel):
    station: str
    total_scans: int
    accepted_scans: int
    duplicate_scans: int
    last_scan_time: Optional[datetime.datetime]


# Launch / Submissions
class SubmissionDraft(BaseModel):
    repo_url: Optional[str] = None
    demo_url: Optional[str] = None
    video_url: Optional[str] = None
    deck_url: Optional[str] = None
    description: Optional[str] = None
    custom_answers: Dict[str, Any] = Field(default_factory=dict)
    claimed_at: datetime.datetime


class LaunchReceipt(BaseModel):
    receipt_id: str
    submission_id: str
    team_id: str
    team_name: str
    revision_number: int
    content_hash: str
    server_timestamp: datetime.datetime
    is_late: bool
    verification_qr_payload: str


class SubmissionResponse(BaseModel):
    id: str
    event_id: str
    team_id: str
    team_name: str
    final_receipt_id: Optional[str]
    is_late: bool
    current_revision: Optional[Dict[str, Any]]
    total_revisions: int
    updated_at: datetime.datetime


# Flight Review / Judging
class ScoreInput(BaseModel):
    criterion_id: str
    score: float
    comment: Optional[str] = None


class FlightReviewSubmit(BaseModel):
    scores: List[ScoreInput]
    comment: Optional[str] = None


class LeaderboardEntry(BaseModel):
    team_id: str
    team_name: str
    track: Optional[str]
    raw_average: float
    normalized_score: float
    review_count: int
    outlier_flag: bool = False
    rank: int = 1


# Announcements
class AnnouncementCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    content: str
    audience_filter: str = "all"
    priority: str = "normal"  # normal, high, critical
    is_pinned: bool = False


# Audit
class AuditVerifyReport(BaseModel):
    is_valid: bool
    total_entries: int
    tampered_index: Optional[int] = None
    tampered_entry_id: Optional[str] = None
    genesis_hash: Optional[str] = None
    tip_hash: Optional[str] = None
    message: str
