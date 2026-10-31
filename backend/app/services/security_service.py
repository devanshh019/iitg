"""Privacy and security service: PII export on request, data retention purge & anonymization."""
import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, and_
from fastapi import HTTPException
from backend.app.models.entities import Event, Participant, Submission, Checkin, utcnow
from backend.app.crypto import decrypt_field
from backend.app.services.audit_service import AuditService


class SecurityService:
    @classmethod
    def export_participant_personal_data(cls, db: Session, participant_id: str, actor_id: str) -> Dict[str, Any]:
        """GDPR/Privacy export: Participant data export on request."""
        participant = db.execute(select(Participant).filter_by(id=participant_id)).scalars().first()
        if not participant:
            raise HTTPException(status_code=404, detail="Crew participant not found.")

        data = {
            "participant_id": participant.id,
            "name": participant.name,
            "email": decrypt_field(participant.email_enc),
            "phone": decrypt_field(participant.phone_enc),
            "college": decrypt_field(participant.college_enc),
            "consent": participant.consent,
            "status": participant.status,
            "registered_at": participant.created_at.isoformat(),
            "checkins": [
                {"station": c.station, "time": c.server_at.isoformat(), "status": c.status}
                for c in participant.checkins
            ]
        }

        AuditService.record_mutation(
            db=db,
            actor_id=actor_id,
            action="pii_data_exported_on_request",
            entity_type="participant",
            entity_id=participant.id,
            payload={"participant_id": participant.id},
            event_id=participant.event_id
        )
        db.commit()
        return data

    @classmethod
    def purge_and_anonymize_event_data(cls, db: Session, event_id: str, actor_id: str) -> Dict[str, Any]:
        """Purge and anonymize participants for an event exceeding retention period."""
        event = db.execute(select(Event).filter_by(id=event_id)).scalars().first()
        if not event:
            raise HTTPException(status_code=404, detail="Mission not found.")

        participants = db.execute(select(Participant).filter_by(event_id=event_id)).scalars().all()
        anonymized_count = 0

        for p in participants:
            p.name = f"Anonymized Crew {p.id[:6]}"
            p.phone_enc = None
            p.college_enc = None
            p.custom_fields = {}
            anonymized_count += 1

        AuditService.record_mutation(
            db=db,
            actor_id=actor_id,
            action="retention_purge_and_anonymize",
            entity_type="event",
            entity_id=event_id,
            payload={"anonymized_count": anonymized_count},
            event_id=event_id
        )
        db.commit()
        return {"event_id": event_id, "anonymized_participants": anonymized_count}
