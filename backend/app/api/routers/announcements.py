"""Announcements and crew read receipts API routes."""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from backend.app.db import get_db
from backend.app.models.entities import Announcement, AnnouncementAcknowledgement, User
from backend.app.schemas.schemas import AnnouncementCreate
from backend.app.services.audit_service import AuditService
from backend.app.api.deps import get_current_user, require_event_role

router = APIRouter(prefix="/events/{event_id}/announcements", tags=["Announcements"])


@router.get("")
def list_announcements(event_id: str, db: Session = Depends(get_db)):
    announcements = db.execute(
        select(Announcement).filter_by(event_id=event_id).order_by(Announcement.is_pinned.desc(), Announcement.created_at.desc())
    ).scalars().all()

    return [
        {
            "id": a.id,
            "title": a.title,
            "content": a.content,
            "audience_filter": a.audience_filter,
            "priority": a.priority,
            "is_pinned": a.is_pinned,
            "created_at": a.created_at,
            "acknowledgements_count": len(a.acknowledgements)
        } for a in announcements
    ]


@router.post("")
def broadcast_announcement(
    event_id: str,
    payload: AnnouncementCreate,
    current_user: User = Depends(require_event_role(["organizer", "super_admin"])),
    db: Session = Depends(get_db)
):
    announcement = Announcement(
        event_id=event_id,
        title=payload.title,
        content=payload.content,
        audience_filter=payload.audience_filter,
        priority=payload.priority,
        is_pinned=payload.is_pinned
    )
    db.add(announcement)
    db.flush()
    AuditService.record_mutation(
        db=db,
        actor_id=current_user.id,
        action="announcement_broadcast",
        entity_type="announcement",
        entity_id=announcement.id,
        payload={"title": payload.title, "priority": payload.priority},
        event_id=event_id
    )
    db.commit()
    db.refresh(announcement)
    return announcement


@router.post("/{announcement_id}/acknowledge")
def acknowledge_announcement(
    event_id: str,
    announcement_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    existing = db.execute(
        select(AnnouncementAcknowledgement).filter_by(announcement_id=announcement_id, user_id=current_user.id)
    ).scalars().first()

    if not existing:
        ack = AnnouncementAcknowledgement(announcement_id=announcement_id, user_id=current_user.id)
        db.add(ack)
        db.commit()

    return {"message": "Announcement acknowledged."}
