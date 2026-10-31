"""Concurrency, Optimistic Locking, and Security Vulnerability Tests."""
import pytest
from fastapi import HTTPException
from backend.app.schemas.schemas import ParticipantRegister, TeamCreate, SubmissionDraft
from backend.app.services.dedupe_service import DedupeService
from backend.app.services.team_service import TeamService
from backend.app.services.submission_service import SubmissionService
from backend.app.models.entities import utcnow


def test_submission_optimistic_concurrency(db_session, test_event):
    # Register crew & team
    p1, _ = DedupeService.register_participant(
        db_session, test_event.id,
        ParticipantRegister(name="Alice", email="alice@test.io", college="MIT")
    )
    team = TeamService.create_team(
        db_session, test_event.id, p1.id,
        TeamCreate(name="Vanguard One", tagline="Orbital Telemetry"),
        actor_id=p1.user_id
    )

    # Teammate 1 saves revision 1
    rev1, _ = SubmissionService.save_draft_or_launch(
        db=db_session,
        event_id=test_event.id,
        team_id=team.id,
        submitter_id=p1.user_id,
        payload=SubmissionDraft(repo_url="https://github.com/vanguard/one", description="Initial draft", claimed_at=utcnow()),
        expected_revision=0
    )
    assert rev1.revision_number == 1

    # Teammate 2 tries to save based on stale state (expected_revision=0 instead of 1) -> Must raise 409 Conflict!
    with pytest.raises(HTTPException) as exc_info:
        SubmissionService.save_draft_or_launch(
            db=db_session,
            event_id=test_event.id,
            team_id=team.id,
            submitter_id="teammate-2",
            payload=SubmissionDraft(repo_url="https://github.com/vanguard/two", description="Stale overwrite attempt", claimed_at=utcnow()),
            expected_revision=0
        )
    assert exc_info.value.status_code == 409
    assert "Concurrency Conflict" in exc_info.value.detail


def test_pii_masking_security(client, db_session, test_event, auth_headers):
    # Register crew member
    p, _ = DedupeService.register_participant(
        db_session, test_event.id,
        ParticipantRegister(name="Secret Agent", email="secret_agent_99@classified.io", phone="+1555123456", college="Space Academy")
    )

    # Fetch participant list as ordinary participant -> PII must be masked!
    res = client.get(
        f"/api/events/{test_event.id}/participants",
        headers=auth_headers["judge"]
    )
    assert res.status_code == 200
    data = res.json()
    target = next((item for item in data if item["id"] == p.id), None)
    assert target is not None
    assert target["email"] != "secret_agent_99@classified.io"
    assert "*" in target["email"]
    assert "*" in target["phone"]
