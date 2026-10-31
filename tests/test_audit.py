"""Tests for Hash-Chained Audit Ledger and Tamper Detection."""
from sqlalchemy import select
from backend.app.models.entities import AuditLog
from backend.app.services.audit_service import AuditService


def test_audit_chain_verification_and_tamper_detection(db_session, test_event):
    # 1. Add valid mutations
    entry1 = AuditService.record_mutation(
        db=db_session,
        actor_id="user-1",
        action="test_action_1",
        entity_type="test",
        entity_id="entity-1",
        payload={"data": "hello"},
        event_id=test_event.id
    )
    entry2 = AuditService.record_mutation(
        db=db_session,
        actor_id="user-2",
        action="test_action_2",
        entity_type="test",
        entity_id="entity-2",
        payload={"data": "world"},
        event_id=test_event.id
    )

    # Verify unbroken chain
    report = AuditService.verify_chain(db_session, test_event.id)
    assert report.is_valid is True
    assert report.total_entries >= 2
    assert report.tampered_index is None

    # 2. Tamper row payload directly
    entry2.payload = {"data": "malicious_tamper"}
    db_session.flush()

    # Re-verify: must fail!
    tampered_report = AuditService.verify_chain(db_session, test_event.id)
    assert tampered_report.is_valid is False
    assert tampered_report.tampered_entry_id == entry2.id
    assert "Tampered row detected" in tampered_report.message
