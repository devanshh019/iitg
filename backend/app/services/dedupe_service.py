"""Participant registration, fuzzy deduplication with rapidfuzz, and Dedupe Inbox management."""
import csv
import io
import random
import string
from typing import Optional, List, Dict, Any, Tuple
from rapidfuzz import fuzz
from sqlalchemy.orm import Session
from sqlalchemy import select, or_
from fastapi import HTTPException
from backend.app.models.entities import Participant, User, TeamMembership, Event, utcnow
from backend.app.schemas.schemas import ParticipantRegister, DedupeMatch, DedupeResolveRequest
from backend.app.crypto import (
    encrypt_field, decrypt_field, normalize_email, normalize_phone,
    deterministic_hash, mask_email, mask_phone
)
from backend.app.services.audit_service import AuditService
from backend.app.services.auth_service import AuthService


class DedupeService:
    @staticmethod
    def generate_fallback_code() -> str:
        return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))

    @classmethod
    def register_participant(
        cls,
        db: Session,
        event_id: str,
        payload: ParticipantRegister,
        actor_id: Optional[str] = None
    ) -> Tuple[Participant, Optional[DedupeMatch]]:
        """Register a new crew participant, computing deterministic hashes and dedupe keys."""
        event = db.execute(select(Event).filter_by(id=event_id)).scalars().first()
        if not event:
            raise HTTPException(status_code=404, detail="Mission not found.")

        norm_email = normalize_email(payload.email)
        norm_phone = normalize_phone(payload.phone or "")
        email_h = deterministic_hash(norm_email)
        phone_h = deterministic_hash(norm_phone) if norm_phone else None
        dedupe_k = deterministic_hash(f"{norm_email}|{norm_phone}")

        # Check exact matches first
        existing_exact = db.execute(
            select(Participant).filter(
                Participant.event_id == event_id,
                or_(
                    Participant.normalized_email_hash == email_h,
                    (Participant.normalized_phone_hash == phone_h) if phone_h else False
                )
            )
        ).scalars().first()

        dedupe_alert: Optional[DedupeMatch] = None
        if existing_exact:
            ex_email = decrypt_field(existing_exact.email_enc) or ""
            dedupe_alert = DedupeMatch(
                existing_participant_id=existing_exact.id,
                existing_name=existing_exact.name,
                existing_email=ex_email,
                incoming_participant_id="",  # will populate after creation
                incoming_name=payload.name,
                incoming_email=norm_email,
                match_type="exact_email" if existing_exact.normalized_email_hash == email_h else "exact_phone",
                confidence=1.0
            )

        # Create or link user account
        user = AuthService.register_or_get_user(db, email=norm_email, actor_id=actor_id)
        # Assign participant role in event
        AuthService.assign_role(db, event_id=event_id, user_id=user.id, role="participant", actor_id=actor_id or user.id)

        participant = Participant(
            event_id=event_id,
            user_id=user.id,
            name=payload.name.strip(),
            email_enc=encrypt_field(norm_email),
            phone_enc=encrypt_field(norm_phone) if norm_phone else None,
            college_enc=encrypt_field(payload.college) if payload.college else None,
            normalized_email_hash=email_h,
            normalized_phone_hash=phone_h,
            dedupe_key=dedupe_k,
            consent=payload.consent,
            custom_fields=payload.custom_fields,
            short_fallback_code=cls.generate_fallback_code(),
            status="flagged_duplicate" if dedupe_alert else "registered"
        )
        db.add(participant)
        db.flush()

        if dedupe_alert:
            dedupe_alert.incoming_participant_id = participant.id

        # If no exact match, check fuzzy dedupe across existing participants
        if not dedupe_alert:
            candidates = db.execute(select(Participant).filter(
                Participant.event_id == event_id,
                Participant.id != participant.id
            )).scalars().all()

            for cand in candidates:
                cand_college = decrypt_field(cand.college_enc) or ""
                # Fuzzy ratio on Name and College
                name_ratio = fuzz.token_sort_ratio(cand.name.lower(), payload.name.lower())
                college_ratio = fuzz.token_sort_ratio(cand_college.lower(), (payload.college or "").lower()) if payload.college and cand_college else 50.0

                combined_score = (name_ratio * 0.7) + (college_ratio * 0.3)
                if combined_score >= 82.0:
                    cand_email = decrypt_field(cand.email_enc) or ""
                    dedupe_alert = DedupeMatch(
                        existing_participant_id=cand.id,
                        existing_name=cand.name,
                        existing_email=cand_email,
                        incoming_participant_id=participant.id,
                        incoming_name=participant.name,
                        incoming_email=norm_email,
                        match_type="fuzzy_name_college",
                        confidence=round(combined_score / 100.0, 2)
                    )
                    participant.status = "flagged_duplicate"
                    break

        AuditService.record_mutation(
            db=db,
            actor_id=actor_id or user.id,
            action="participant_registered",
            entity_type="participant",
            entity_id=participant.id,
            payload={
                "name": participant.name,
                "email_hash": email_h,
                "status": participant.status,
                "dedupe_alert": dedupe_alert.model_dump() if dedupe_alert else None
            },
            event_id=event_id
        )
        db.commit()
        db.refresh(participant)
        return participant, dedupe_alert

    @classmethod
    def resolve_dedupe(cls, db: Session, event_id: str, payload: DedupeResolveRequest, actor_id: str) -> Dict[str, Any]:
        """Dedupe Inbox resolution: merge, keep_both, or reject."""
        primary = db.execute(select(Participant).filter_by(id=payload.primary_id, event_id=event_id)).scalars().first()
        secondary = db.execute(select(Participant).filter_by(id=payload.secondary_id, event_id=event_id)).scalars().first()

        if not primary or not secondary:
            raise HTTPException(status_code=404, detail="One or both participants not found.")

        result = {}
        if payload.action == "merge":
            # Remap squad memberships from secondary to primary if primary has none
            if secondary.squad_id and not primary.squad_id:
                primary.squad_id = secondary.squad_id
                # Update memberships
                mems = db.execute(select(TeamMembership).filter_by(participant_id=secondary.id)).scalars().all()
                for m in mems:
                    m.participant_id = primary.id

            secondary.status = "merged_archived"
            primary.status = "registered"
            result = {"action": "merge", "primary_id": primary.id, "archived_id": secondary.id}

        elif payload.action == "keep_both":
            primary.status = "registered"
            secondary.status = "registered"
            result = {"action": "keep_both", "primary_id": primary.id, "secondary_id": secondary.id}

        elif payload.action == "reject":
            secondary.status = "rejected_duplicate"
            result = {"action": "reject", "rejected_id": secondary.id}
        else:
            raise HTTPException(status_code=400, detail=f"Invalid action: {payload.action}")

        AuditService.record_mutation(
            db=db,
            actor_id=actor_id,
            action=f"dedupe_resolved_{payload.action}",
            entity_type="participant",
            entity_id=primary.id,
            payload={"action": payload.action, "primary_id": primary.id, "secondary_id": secondary.id},
            event_id=event_id
        )
        db.commit()
        return result

    @classmethod
    def preview_csv_import(cls, csv_text: str) -> Dict[str, Any]:
        """Dry-run preview of participant CSV import with error report."""
        f = io.StringIO(csv_text.strip())
        reader = csv.DictReader(f)
        valid_rows = []
        errors = []

        seen_emails = set()
        for idx, row in enumerate(reader, start=1):
            name = row.get("name", "").strip()
            email = row.get("email", "").strip()
            phone = row.get("phone", "").strip()
            college = row.get("college", "").strip()

            if not name:
                errors.append({"row": idx, "error": "Missing name"})
                continue
            if not email or "@" not in email:
                errors.append({"row": idx, "error": f"Invalid email: {email}"})
                continue

            norm_em = normalize_email(email)
            if norm_em in seen_emails:
                errors.append({"row": idx, "error": f"Duplicate email in CSV: {norm_em}"})
                continue
            seen_emails.add(norm_em)

            valid_rows.append({
                "row": idx,
                "name": name,
                "email": norm_em,
                "phone": phone,
                "college": college
            })

        return {
            "total_rows_scanned": len(valid_rows) + len(errors),
            "valid_count": len(valid_rows),
            "error_count": len(errors),
            "valid_preview": valid_rows[:5],
            "errors": errors
        }
