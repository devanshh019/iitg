"""Fun layer API routes: Crew Passport, Big Screen Mode, Mentor Pit Stop, Crew Pulse, and Reveal Ceremony."""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from backend.app.db import get_db
from backend.app.models.entities import (
    Participant, User, MentorSlot, HelpTicket, Token, utcnow
)
from backend.app.services.fun_service import FunService
from backend.app.api.deps import get_current_user, require_event_role

router = APIRouter(prefix="/events/{event_id}/fun", tags=["Fun Layer"])


@router.get("/passport")
def get_crew_passport(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    part = db.execute(select(Participant).filter_by(user_id=current_user.id, event_id=event_id)).scalars().first()
    if not part:
        return []
    return FunService.get_or_award_badges(db, part.id)


@router.post("/mood-pulse")
def record_crew_pulse(
    event_id: str,
    mood_score: int = Query(..., ge=1, le=5),
    energy_level: str = Query("high"),
    note: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    pulse = FunService.record_mood_pulse(db, event_id, mood_score, energy_level, note)
    return {"message": "Pulse logged! Telemetry updated.", "id": pulse.id}


@router.get("/mood-trend")
def get_crew_pulse_trend(event_id: str, db: Session = Depends(get_db)):
    return FunService.get_mood_trend(db, event_id)


@router.post("/help-tickets")
def request_mentor_help(
    event_id: str,
    skill_tag: str = Query(...),
    title: str = Query(...),
    description: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    part = db.execute(select(Participant).filter_by(user_id=current_user.id, event_id=event_id)).scalars().first()
    if not part or not part.squad_id:
        raise HTTPException(status_code=400, detail="Must belong to a squad to request mentor pit stops.")
    ticket = FunService.request_mentor_help(
        db=db,
        event_id=event_id,
        team_id=part.squad_id,
        skill_tag=skill_tag,
        title=title,
        description=description,
        actor_id=current_user.id
    )
    return {"message": "Help ticket routed to available mentors.", "ticket_id": ticket.id}


@router.get("/help-tickets")
def list_help_tickets(
    event_id: str,
    status_filter: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = select(HelpTicket).filter_by(event_id=event_id)
    if status_filter:
        query = query.filter_by(status=status_filter)
    tickets = db.execute(query.order_by(HelpTicket.created_at.desc())).scalars().all()
    return [
        {
            "id": t.id,
            "team_id": t.team_id,
            "skill_tag": t.skill_tag,
            "title": t.title,
            "description": t.description,
            "status": t.status,
            "created_at": t.created_at
        } for t in tickets
    ]


@router.get("/big-screen")
def get_big_screen_projection(event_id: str, db: Session = Depends(get_db)):
    """Data feed for Big Screen mode: countdown, boarding ticker, announcements."""
    return FunService.get_big_screen_data(db, event_id)


@router.post("/reveal-ceremony")
def trigger_reveal(
    event_id: str,
    stage: str = Query(..., description="third, second, first, or reset"),
    current_user: User = Depends(require_event_role(["organizer", "super_admin"])),
    db: Session = Depends(get_db)
):
    return FunService.trigger_reveal_stage(db, event_id, stage, actor_id=current_user.id)


@router.get("/tokens")
def get_my_tokens(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    part = db.execute(select(Participant).filter_by(user_id=current_user.id, event_id=event_id)).scalars().first()
    if not part:
        return []
    tokens = db.execute(select(Token).filter_by(event_id=event_id, participant_id=part.id)).scalars().all()
    return [
        {"id": t.id, "type": t.token_type, "code": t.code, "is_used": t.is_used, "used_at": t.used_at}
        for t in tokens
    ]


@router.post("/tokens/{code}/redeem")
def redeem_token(
    event_id: str,
    code: str,
    current_user: User = Depends(require_event_role(["volunteer", "organizer", "super_admin"])),
    db: Session = Depends(get_db)
):
    token = db.execute(select(Token).filter_by(event_id=event_id, code=code.strip())).scalars().first()
    if not token:
        raise HTTPException(status_code=404, detail="Token not found.")
    if token.is_used:
        raise HTTPException(status_code=400, detail=f"Token already redeemed at {token.used_at.isoformat()}.")
    token.is_used = True
    token.used_at = utcnow()
    db.commit()
    return {"message": f"Successfully redeemed {token.token_type} token!"}
