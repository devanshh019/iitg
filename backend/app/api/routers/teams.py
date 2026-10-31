"""Squads (Teams) API routes."""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from backend.app.db import get_db
from backend.app.models.entities import Team, Participant, User, TeamHistory
from backend.app.schemas.schemas import TeamCreate, TeamJoin, TeamTransferLead, TeamOverrideLock, TeamResponse
from backend.app.services.team_service import TeamService
from backend.app.api.deps import get_current_user, require_event_role

router = APIRouter(prefix="/events/{event_id}/teams", tags=["Squads / Teams"])


@router.get("/generate-name")
def generate_team_name():
    name, tagline = TeamService.generate_random_name_and_tagline()
    return {"name": name, "tagline": tagline}


@router.get("", response_model=List[Dict[str, Any]])
def list_teams(event_id: str, db: Session = Depends(get_db)):
    teams = db.execute(select(Team).filter_by(event_id=event_id)).scalars().all()
    results = []
    for t in teams:
        results.append({
            "id": t.id,
            "event_id": t.event_id,
            "name": t.name,
            "tagline": t.tagline,
            "join_code": t.join_code,
            "leader_id": t.leader_id,
            "track": t.track,
            "is_locked": t.is_locked,
            "lock_reason": t.lock_reason,
            "member_count": len(t.memberships),
            "members": [{"id": m.participant.id, "name": m.participant.name, "role": m.role} for m in t.memberships],
            "created_at": t.created_at
        })
    return results


@router.post("", response_model=Dict[str, Any])
def create_team(
    event_id: str,
    payload: TeamCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    part = db.execute(select(Participant).filter_by(user_id=current_user.id, event_id=event_id)).scalars().first()
    if not part:
        raise HTTPException(status_code=400, detail="Must be a registered participant in this mission to form a squad.")
    team = TeamService.create_team(db, event_id, part.id, payload, actor_id=current_user.id)
    return {"id": team.id, "name": team.name, "join_code": team.join_code}


@router.post("/join", response_model=Dict[str, Any])
def join_team(
    event_id: str,
    payload: TeamJoin,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    part = db.execute(select(Participant).filter_by(user_id=current_user.id, event_id=event_id)).scalars().first()
    if not part:
        raise HTTPException(status_code=400, detail="Must be a registered participant in this mission to join a squad.")
    team = TeamService.join_team_by_code(db, event_id, part.id, payload.join_code, actor_id=current_user.id)
    return {"id": team.id, "name": team.name, "member_count": len(team.memberships)}


@router.post("/leave")
def leave_team(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    part = db.execute(select(Participant).filter_by(user_id=current_user.id, event_id=event_id)).scalars().first()
    if not part:
        raise HTTPException(status_code=400, detail="Participant not found.")
    TeamService.leave_team(db, event_id, part.id, actor_id=current_user.id)
    return {"message": "Successfully disembarked from squad."}


@router.post("/{team_id}/transfer-lead")
def transfer_leadership(
    event_id: str,
    team_id: str,
    payload: TeamTransferLead,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    part = db.execute(select(Participant).filter_by(user_id=current_user.id, event_id=event_id)).scalars().first()
    if not part:
        raise HTTPException(status_code=400, detail="Participant record not found.")
    TeamService.transfer_lead(db, team_id, part.id, payload.new_leader_id, actor_id=current_user.id)
    return {"message": "Squad leadership transferred successfully."}


@router.post("/{team_id}/override-lock")
def override_team_lock(
    event_id: str,
    team_id: str,
    payload: TeamOverrideLock,
    current_user: User = Depends(require_event_role(["organizer", "super_admin"])),
    db: Session = Depends(get_db)
):
    team = TeamService.organizer_override_lock(db, team_id, payload, actor_id=current_user.id)
    return {"message": "Squad lock state overridden.", "is_locked": team.is_locked, "reason": team.lock_reason}


@router.get("/squad-finder")
def squad_finder(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    part = db.execute(select(Participant).filter_by(user_id=current_user.id, event_id=event_id)).scalars().first()
    if not part:
        return []
    return TeamService.suggest_squads_for_solo(db, event_id, part.id)


@router.get("/{team_id}/history")
def get_team_history(event_id: str, team_id: str, db: Session = Depends(get_db)):
    history = db.execute(
        select(TeamHistory).filter_by(team_id=team_id).order_by(TeamHistory.timestamp.asc())
    ).scalars().all()
    return [
        {"action": h.action, "actor_id": h.actor_id, "details": h.details, "timestamp": h.timestamp}
        for h in history
    ]
