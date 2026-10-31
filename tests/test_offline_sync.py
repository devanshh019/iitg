"""Tests for Offline Sync Engine, Ed25519 Signatures, and Idempotency."""
import uuid
import datetime
from backend.app.schemas.schemas import ParticipantRegister, CheckinScan
from backend.app.services.dedupe_service import DedupeService
from backend.app.services.boarding_service import BoardingService
from backend.app.models.entities import Checkin, utcnow


def test_offline_sync_multi_device_and_idempotency(db_session, test_event):
    # Register participant
    part, _ = DedupeService.register_participant(
        db_session,
        test_event.id,
        ParticipantRegister(
            name="Ellen Ripley",
            email="ripley@weyland-yutani.com",
            phone="+1555777111",
            college="Nostromo Flight School"
        )
    )

    pass_data = BoardingService.generate_participant_qr_token(db_session, test_event.id, part.id)
    token = pass_data["token"]

    op1 = str(uuid.uuid4())
    op2 = str(uuid.uuid4())
    now = utcnow()

    # Simulate Device 1 scanning participant at 'entry'
    scan_dev1 = [
        CheckinScan(
            op_id=op1,
            participant_token_or_code=token,
            station="entry",
            device_id="scanner-gate-alpha",
            claimed_at=now
        )
    ]
    res_dev1 = BoardingService.process_sync_batch(db_session, test_event.id, "scanner-gate-alpha", scan_dev1, actor_id="actor-1")
    assert len(res_dev1) == 1
    assert res_dev1[0].status == "ACCEPTED"

    # Simulate Device 2 scanning same participant at 'entry' (conflicting / duplicate scan)
    scan_dev2 = [
        CheckinScan(
            op_id=op2,
            participant_token_or_code=token,
            station="entry",
            device_id="scanner-gate-beta",
            claimed_at=now + datetime.timedelta(seconds=5)
        )
    ]
    res_dev2 = BoardingService.process_sync_batch(db_session, test_event.id, "scanner-gate-beta", scan_dev2, actor_id="actor-2")
    assert len(res_dev2) == 1
    assert res_dev2[0].status == "DUPLICATE"

    # Simulate Device 3 replaying op1 (network retry / replayed op_id)
    res_replay = BoardingService.process_sync_batch(db_session, test_event.id, "scanner-gate-gamma", scan_dev1, actor_id="actor-3")
    assert len(res_replay) == 1
    assert res_replay[0].status == "ACCEPTED"
    assert "Idempotent response" in res_replay[0].message

    # Verify counts in database
    checkins = db_session.query(Checkin).filter_by(participant_id=part.id).all()
    assert len(checkins) == 2  # exactly one ACCEPTED and one DUPLICATE, no lost scans!
    statuses = {c.status for c in checkins}
    assert statuses == {"ACCEPTED", "DUPLICATE"}
