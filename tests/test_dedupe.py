"""Tests for RapidFuzz Deduplication, Exact Matching, and Dedupe Inbox."""
from backend.app.schemas.schemas import ParticipantRegister, DedupeResolveRequest
from backend.app.services.dedupe_service import DedupeService


def test_planted_duplicates_detection(db_session, test_event):
    # Register primary crew
    p1, alert1 = DedupeService.register_participant(
        db_session,
        test_event.id,
        ParticipantRegister(
            name="Johnathan Archer",
            email="jarcher@starfleet.org",
            phone="+1555019283",
            college="Starfleet Engineering Campus"
        )
    )
    assert alert1 is None
    assert p1.status == "registered"

    # Exact email match duplicate
    p2, alert2 = DedupeService.register_participant(
        db_session,
        test_event.id,
        ParticipantRegister(
            name="J. Archer",
            email="jarcher@starfleet.org",
            phone="+1555999999",
            college="Other School"
        )
    )
    assert alert2 is not None
    assert alert2.match_type == "exact_email"
    assert p2.status == "flagged_duplicate"

    # Fuzzy match duplicate on Name & College
    p3, alert3 = DedupeService.register_participant(
        db_session,
        test_event.id,
        ParticipantRegister(
            name="Jonathan Archer",  # slight typo
            email="different_email@gmail.com",
            phone="+1555888888",
            college="Starfleet Engineering Campus"
        )
    )
    assert alert3 is not None
    assert alert3.match_type == "fuzzy_name_college"
    assert alert3.confidence > 0.80
    assert p3.status == "flagged_duplicate"

    # Resolve via Merge
    resolve_res = DedupeService.resolve_dedupe(
        db_session,
        test_event.id,
        DedupeResolveRequest(action="merge", primary_id=p1.id, secondary_id=p3.id),
        actor_id="admin-id"
    )
    assert resolve_res["action"] == "merge"
    assert p1.status == "registered"
    assert p3.status == "merged_archived"
