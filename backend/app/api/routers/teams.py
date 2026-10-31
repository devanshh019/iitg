"""Squads (Teams) API routes."""
import random
import string
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from backend.app.db import get_db
from backend.app.models.entities import Team, Participant, User, TeamHistory, ProblemStatement, utcnow
from backend.app.schemas.schemas import TeamCreate, TeamJoin, TeamTransferLead, TeamOverrideLock, TeamResponse, TeamLockPSRequest
from backend.app.services.team_service import TeamService
from backend.app.services.audit_service import AuditService
from backend.app.api.deps import get_current_user, require_event_role

router = APIRouter(prefix="/events/{event_id}/teams", tags=["Squads / Teams"])


@router.get("/my-squad")
def get_my_squad(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    part = db.execute(select(Participant).filter_by(user_id=current_user.id, event_id=event_id)).scalars().first()
    if not part or not part.squad_id:
        return None
    team = db.execute(select(Team).filter_by(id=part.squad_id)).scalars().first()
    if not team:
        return None
    
    ps = None
    if team.problem_statement_id:
        ps_obj = db.execute(select(ProblemStatement).filter_by(id=team.problem_statement_id)).scalars().first()
        if ps_obj:
            ps = {
                "id": ps_obj.id,
                "title": ps_obj.title,
                "track": ps_obj.track,
                "description": ps_obj.description
            }

    return {
        "id": team.id,
        "event_id": team.event_id,
        "name": team.name,
        "tagline": team.tagline,
        "join_code": team.join_code,
        "leader_id": team.leader_id,
        "track": team.track,
        "is_locked": team.is_locked,
        "problem_statement_id": team.problem_statement_id,
        "is_ps_locked": team.is_ps_locked or False,
        "ps_locked_at": team.ps_locked_at,
        "problem_statement": ps,
        "member_count": len(team.memberships),
        "members": [{"id": m.participant.id, "name": m.participant.name, "role": m.role} for m in team.memberships],
        "created_at": team.created_at
    }


@router.post("/lock-ps")
def lock_problem_statement(
    event_id: str,
    payload: TeamLockPSRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    part = db.execute(select(Participant).filter_by(user_id=current_user.id, event_id=event_id)).scalars().first()
    if not part:
        # Auto-enroll user as participant if not already
        from backend.app.crypto import decrypt_field, deterministic_hash, normalize_email, encrypt_field
        raw_email = decrypt_field(current_user.email_enc)
        norm_email = normalize_email(raw_email)
        em_hash = deterministic_hash(norm_email)
        part_name = norm_email.split("@")[0].replace(".", " ").capitalize()
        fallback_code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        part = Participant(
            event_id=event_id,
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
        db.flush()

    if not part.squad_id:
        # Auto-create squad for the participant
        team_name = f"Squad {part.name}"
        join_code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        team = Team(
            event_id=event_id,
            name=team_name,
            tagline="Hacker Collective",
            leader_id=part.id,
            join_code=join_code
        )
        db.add(team)
        db.flush()
        part.squad_id = team.id
        from backend.app.models.entities import TeamMembership
        membership = TeamMembership(team_id=team.id, participant_id=part.id, role="leader")
        db.add(membership)
        db.flush()
    else:
        team = db.execute(select(Team).filter_by(id=part.squad_id)).scalars().first()
        if not team:
            raise HTTPException(status_code=404, detail="Squad not found.")

    ps = db.execute(select(ProblemStatement).filter_by(id=payload.problem_statement_id, event_id=event_id)).scalars().first()
    if not ps:
        raise HTTPException(status_code=404, detail="Problem Statement not found in this hackathon.")

    team.problem_statement_id = ps.id
    team.is_ps_locked = True
    team.ps_locked_at = utcnow()
    team.track = ps.track

    AuditService.record_mutation(
        db=db,
        actor_id=current_user.id,
        action="team_ps_locked",
        entity_type="team",
        entity_id=team.id,
        payload={"problem_statement_id": ps.id, "title": ps.title, "track": ps.track},
        event_id=event_id
    )
    db.commit()

    return {
        "message": "Problem statement locked successfully for your squad.",
        "is_ps_locked": True,
        "problem_statement_id": ps.id,
        "title": ps.title,
        "track": ps.track
    }


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
