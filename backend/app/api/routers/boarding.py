"""Boarding (Check-in) and offline queue sync API routes."""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from backend.app.db import get_db
from backend.app.models.entities import Event, Participant, User
from backend.app.schemas.schemas import SyncCheckinBatch, CheckinResult, StationThroughput
from backend.app.services.boarding_service import BoardingService
from backend.app.api.deps import get_current_user, require_event_role

router = APIRouter(prefix="/events/{event_id}/boarding", tags=["Boarding / Check-in"])


@router.get("/pass")
def get_my_boarding_pass(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve personal signed Ed25519 boarding token and fallback code."""
    part = db.execute(select(Participant).filter_by(user_id=current_user.id, event_id=event_id)).scalars().first()
    if not part:
        raise HTTPException(status_code=404, detail="No crew registration found for this mission.")
    return BoardingService.generate_participant_qr_token(db, event_id, part.id)


@router.get("/pass/{participant_id}")
def get_participant_boarding_pass(
    event_id: str,
    participant_id: str,
    current_user: User = Depends(require_event_role(["organizer", "volunteer", "super_admin"])),
    db: Session = Depends(get_db)
):
    return BoardingService.generate_participant_qr_token(db, event_id, participant_id)


@router.post("/sync", response_model=List[CheckinResult])
def sync_offline_scans(
    event_id: str,
    payload: SyncCheckinBatch,
    current_user: User = Depends(require_event_role(["organizer", "volunteer", "super_admin"])),
    db: Session = Depends(get_db)
):
    """Idempotent sync endpoint for scanner PWAs (handles batch scans queued offline)."""
    return BoardingService.process_sync_batch(
        db=db,
        event_id=event_id,
        device_id=payload.device_id,
        scans=payload.scans,
        actor_id=current_user.id
    )


@router.get("/throughput", response_model=List[StationThroughput])
def get_throughput(
    event_id: str,
    current_user: User = Depends(require_event_role(["organizer", "volunteer", "super_admin"])),
    db: Session = Depends(get_db)
):
    """Live organizer metrics per boarding station."""
    return BoardingService.get_station_throughput(db, event_id)


@router.post("/scan")
def scan_and_mark_attendance(
    event_id: str,
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Direct live scan or manual 6-character code attendance marking."""
    from backend.app.models.entities import Checkin, utcnow
    from backend.app.services.audit_service import AuditService

    event = db.execute(select(Event).filter_by(id=event_id)).scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found.")

    token_or_code = payload.get("token_or_code", "").strip()
    if not token_or_code:
        raise HTTPException(status_code=400, detail="Token or code required.")

    station = payload.get("station", "Main Gate")

    part, method = BoardingService.resolve_token_or_code(db, event, token_or_code)
    if not part:
        raise HTTPException(status_code=404, detail=f"No participant found matching '{token_or_code}'.")

    already_checked_in = (part.status == "boarded")
    if not already_checked_in:
        part.status = "boarded"
        part.updated_at = utcnow()
        checkin = Checkin(
            event_id=event.id,
            participant_id=part.id,
            verified_offline=(method == "fallback_code"),
            station=station,
            actor_id=current_user.id
        )
        db.add(checkin)
        AuditService.record_mutation(
            db=db,
            actor_id=current_user.id,
            action="attendance_marked",
            entity_type="participant",
            entity_id=part.id,
            payload={"station": station, "method": method, "name": part.name},
            event_id=event.id
        )
        db.commit()

    return {
        "success": True,
        "already_checked_in": already_checked_in,
        "participant_id": part.id,
        "name": part.name,
        "status": part.status,
        "squad_name": part.team.name if part.team else "No Squad",
        "fallback_code": part.short_fallback_code,
        "station": station,
        "method": method
    }
