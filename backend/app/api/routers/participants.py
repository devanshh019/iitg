"""Crew / Participant registration, deduplication inbox, and privacy endpoints."""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import select
from backend.app.db import get_db
from backend.app.models.entities import Participant, User, EventRole
from backend.app.schemas.schemas import (
    ParticipantRegister, ParticipantResponse, DedupeMatch, DedupeResolveRequest
)
from backend.app.services.dedupe_service import DedupeService
from backend.app.services.security_service import SecurityService
from backend.app.api.deps import get_current_user, require_event_role
from backend.app.crypto import decrypt_field, mask_email, mask_phone

router = APIRouter(prefix="/events/{event_id}/participants", tags=["Crew / Participants"])


@router.post("/register")
def register_participant(
    event_id: str,
    payload: ParticipantRegister,
    db: Session = Depends(get_db)
):
    part, dedupe_alert = DedupeService.register_participant(db, event_id, payload)
    return {
        "participant": {
            "id": part.id,
            "name": part.name,
            "status": part.status,
            "fallback_code": part.short_fallback_code
        },
        "dedupe_alert": dedupe_alert.model_dump() if dedupe_alert else None
    }


@router.get("", response_model=List[ParticipantResponse])
def list_participants(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check roles for unmasked PII
    roles = db.execute(
        select(EventRole).filter_by(event_id=event_id, user_id=current_user.id)
    ).scalars().all()
    user_roles = {r.role for r in roles}
    can_view_pii = current_user.is_super_admin or ("organizer" in user_roles)

    participants = db.execute(select(Participant).filter_by(event_id=event_id)).scalars().all()
    results = []
    for p in participants:
        raw_em = decrypt_field(p.email_enc) or ""
        raw_ph = decrypt_field(p.phone_enc)
        raw_col = decrypt_field(p.college_enc)

        # Allow user to see their own unmasked record
        is_self = p.user_id == current_user.id
        allow_unmasked = can_view_pii or is_self

        results.append(ParticipantResponse(
            id=p.id,
            event_id=p.event_id,
            user_id=p.user_id,
            name=p.name,
            email=raw_em if allow_unmasked else mask_email(raw_em),
            phone=raw_ph if allow_unmasked else mask_phone(raw_ph),
            college=raw_col,
            status=p.status,
            short_fallback_code=p.short_fallback_code,
            squad_id=p.squad_id,
            created_at=p.created_at
        ))
    return results


@router.post("/dedupe/resolve")
def resolve_dedupe(
    event_id: str,
    payload: DedupeResolveRequest,
    current_user: User = Depends(require_event_role(["organizer", "super_admin"])),
    db: Session = Depends(get_db)
):
    return DedupeService.resolve_dedupe(db, event_id, payload, actor_id=current_user.id)


@router.post("/csv-preview")
async def preview_csv(file: UploadFile = File(...)):
    content = await file.read()
    return DedupeService.preview_csv_import(content.decode("utf-8", errors="ignore"))


@router.get("/{participant_id}/export-personal-data")
def export_personal_data(
    event_id: str,
    participant_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    part = db.execute(select(Participant).filter_by(id=participant_id, event_id=event_id)).scalars().first()
    if not part:
        raise HTTPException(status_code=404, detail="Participant not found.")
    if not current_user.is_super_admin and part.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized: can only export your own personal data.")
    return SecurityService.export_participant_personal_data(db, participant_id, actor_id=current_user.id)
