"""Additional comprehensive tests for Event lifecycle, Teams, and Privacy GDPR exports."""
import datetime
from backend.app.schemas.schemas import EventCreate, EventUpdate, TeamCreate, TeamJoin, TeamTransferLead, TeamOverrideLock, ParticipantRegister
from backend.app.services.event_service import EventService
from backend.app.services.team_service import TeamService
from backend.app.services.dedupe_service import DedupeService
from backend.app.services.security_service import SecurityService
from backend.app.models.entities import utcnow


def test_event_lifecycle_and_cloning(db_session):
    # Test templates
    templates = EventService.get_templates()
    assert "offline_24h" in templates
    assert "online_48h" in templates
    assert "hybrid_rounds" in templates

    # Create event
    ev = EventService.create_event(
        db_session,
        EventCreate(slug="test-event-cycle", title="Cycle Mission", format_type="hybrid_rounds"),
        actor_id="admin-sys"
    )
    assert ev.slug == "test-event-cycle"
    assert ev.ed25519_public_key is not None

    # Clone event
    cloned = EventService.clone_event(db_session, ev.id, "test-event-cloned", "Cloned Mission", "admin-sys")
    assert cloned.slug == "test-event-cloned"
    assert cloned.format_type == "hybrid_rounds"

    # Update event
    updated = EventService.update_event(
        db_session, ev.id, EventUpdate(title="Updated Cycle Mission", is_teams_locked=True), "admin-sys"
    )
    assert updated.title == "Updated Cycle Mission"
    assert updated.is_teams_locked is True


def test_team_roster_transfer_and_override(db_session, test_event):
    p1, _ = DedupeService.register_participant(db_session, test_event.id, ParticipantRegister(name="L1", email="l1@squad.io"))
    p2, _ = DedupeService.register_participant(db_session, test_event.id, ParticipantRegister(name="M2", email="m2@squad.io"))

    team = TeamService.create_team(db_session, test_event.id, p1.id, TeamCreate(name="Squad Dynamic"), p1.user_id)
    assert team.leader_id == p1.id

    # Join
    TeamService.join_team_by_code(db_session, test_event.id, p2.id, team.join_code, p2.user_id)
    assert len(team.memberships) == 2

    # Transfer Lead
    TeamService.transfer_lead(db_session, team.id, p1.id, p2.id, p1.user_id)
    assert team.leader_id == p2.id

    # Override Lock
    TeamService.organizer_override_lock(db_session, team.id, TeamOverrideLock(is_locked=True, reason="Deadline cutoff"), "org-1")
    assert team.is_locked is True
    assert team.lock_reason == "Deadline cutoff"


def test_privacy_gdpr_export_and_retention_purge(db_session, test_event):
    p, _ = DedupeService.register_participant(
        db_session, test_event.id,
        ParticipantRegister(name="GDPR Subject", email="gdpr@privacy.eu", phone="+4412345678", college="Oxford")
    )
    # Export personal data
    gdpr_data = SecurityService.export_participant_personal_data(db_session, p.id, p.user_id)
    assert gdpr_data["email"] == "gdpr@privacy.eu"
    assert gdpr_data["college"] == "Oxford"

    # Purge / Anonymize
    purge_res = SecurityService.purge_and_anonymize_event_data(db_session, test_event.id, "admin-1")
    assert purge_res["anonymized_participants"] >= 1
