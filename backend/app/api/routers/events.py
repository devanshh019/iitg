"""Missions / Events API routes."""
import random
import string
import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from backend.app.db import get_db
from backend.app.schemas.schemas import EventCreate, EventUpdate, EventResponse, ProblemStatementResponse
from backend.app.models.entities import Event, User, Participant, Team, Checkin, Submission, ProblemStatement, EventRole, utcnow
from backend.app.services.event_service import EventService
from backend.app.services.auth_service import AuthService
from backend.app.crypto import encrypt_field, decrypt_field, deterministic_hash, normalize_email
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


@router.post("/{event_id}/participate")
def participate_in_event(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Enrolls current user as a participant in the specified event with one click."""
    event = db.execute(select(Event).filter_by(id=event_id)).scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail="Hackathon event not found.")

    # Assign participant role if not assigned
    existing_role = db.execute(
        select(EventRole).filter_by(event_id=event.id, user_id=current_user.id, role="participant")
    ).scalars().first()
    if not existing_role:
        AuthService.assign_role(db, event.id, current_user.id, "participant", actor_id=current_user.id)

    # Check participant record
    part = db.execute(
        select(Participant).filter_by(event_id=event.id, user_id=current_user.id)
    ).scalars().first()

    if not part:
        raw_email = decrypt_field(current_user.email_enc)
        norm_email = normalize_email(raw_email)
        em_hash = deterministic_hash(norm_email)
        part_name = norm_email.split("@")[0].replace(".", " ").capitalize()
        fallback_code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        part = Participant(
            event_id=event.id,
            user_id=current_user.id,
            name=part_name,
            email_enc=encrypt_field(norm_email),
            normalized_email_hash=em_hash,
            dedupe_key=em_hash,
            consent=True,
            short_fallback_code=fallback_code,
            status="registered"
        )
        db.add(part)
        db.commit()

    return {
        "message": f"Successfully enrolled in {event.title}!",
        "event_id": event.id,
        "event_slug": event.slug,
        "participant_id": part.id,
        "name": part.name,
        "status": part.status,
        "squad_id": part.squad_id
    }


@router.get("/{event_id}/problem-statements")
def get_event_problem_statements(event_id: str, db: Session = Depends(get_db)):
    """Fetch problem statements for an event. Masks details if kickoff has not started."""
    event = db.execute(select(Event).filter_by(id=event_id)).scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail="Hackathon event not found.")

    statements = db.execute(
        select(ProblemStatement).filter_by(event_id=event.id)
    ).scalars().all()

    now = utcnow()
    is_live = bool(event.starts_at and now >= event.starts_at)

    results = []
    for ps in statements:
        # Determine if revealed
        is_revealed = ps.is_revealed or is_live or (ps.reveal_at and now >= ps.reveal_at)
        results.append({
            "id": ps.id,
            "event_id": ps.event_id,
            "title": ps.title,
            "track": ps.track,
            "description": ps.description if is_revealed else "🔒 Problem Statement details are sealed until event kickoff.",
            "requirements": ps.requirements if is_revealed else ["Sealed until kickoff"],
            "rules": ps.rules if is_revealed else "Standard hackathon rules apply upon reveal.",
            "reveal_at": ps.reveal_at,
            "is_revealed": is_revealed
        })

    return {
        "event_id": event.id,
        "event_title": event.title,
        "is_event_live": is_live,
        "starts_at": event.starts_at,
        "ends_at": event.ends_at,
        "problem_statements": results
    }
