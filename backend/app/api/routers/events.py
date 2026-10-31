"""Missions / Events API routes."""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from backend.app.db import get_db
from backend.app.schemas.schemas import EventCreate, EventUpdate, EventResponse
from backend.app.models.entities import Event, User, Participant, Team, Checkin, Submission
from backend.app.services.event_service import EventService
from backend.app.api.deps import get_current_user, require_super_admin, require_event_role

router = APIRouter(prefix="/events", tags=["Events"])


@router.get("/templates")
def get_templates():
    return EventService.get_templates()


@router.get("", response_model=List[EventResponse])
def list_events(db: Session = Depends(get_db)):
    events = db.execute(select(Event).order_by(Event.created_at.desc())).scalars().all()
    return events


@router.post("", response_model=EventResponse)
def create_event(
    payload: EventCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    event = EventService.create_event(db, payload, actor_id=current_user.id)
    return event


@router.get("/by-slug/{slug}", response_model=EventResponse)
def get_event_by_slug(slug: str, db: Session = Depends(get_db)):
    event = db.execute(select(Event).filter_by(slug=slug)).scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail="Mission not found.")
    return event


@router.get("/{event_id}", response_model=EventResponse)
def get_event(event_id: str, db: Session = Depends(get_db)):
    event = db.execute(select(Event).filter_by(id=event_id)).scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail="Mission not found.")
    return event


@router.patch("/{event_id}", response_model=EventResponse)
def update_event(
    event_id: str,
    payload: EventUpdate,
    current_user: User = Depends(require_event_role(["organizer", "super_admin"])),
    db: Session = Depends(get_db)
):
    return EventService.update_event(db, event_id, payload, actor_id=current_user.id)


@router.post("/{event_id}/clone", response_model=EventResponse)
def clone_event(
    event_id: str,
    new_slug: str = Query(...),
    new_title: str = Query(...),
    current_user: User = Depends(require_event_role(["organizer", "super_admin"])),
    db: Session = Depends(get_db)
):
    return EventService.clone_event(db, event_id, new_slug, new_title, actor_id=current_user.id)


@router.get("/{event_id}/funnel")
def get_mission_funnel(event_id: str, db: Session = Depends(get_db)):
    """Mission Control funnel metrics: registered, squads, boarded, launched, reviewed."""
    registered = db.execute(select(func.count(Participant.id)).filter_by(event_id=event_id)).scalar() or 0
    squads = db.execute(select(func.count(Team.id)).filter_by(event_id=event_id)).scalar() or 0
    boarded = db.execute(
        select(func.count(Checkin.id)).filter_by(event_id=event_id, station="entry", status="ACCEPTED")
    ).scalar() or 0
    launched = db.execute(select(func.count(Submission.id)).filter_by(event_id=event_id)).scalar() or 0

    return {
        "event_id": event_id,
        "funnel": {
            "registered_crew": registered,
            "formed_squads": squads,
            "boarded_crew": boarded,
            "launched_projects": launched
        }
    }
