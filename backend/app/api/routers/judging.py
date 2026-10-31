"""Flight Review (Judging) API routes."""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from backend.app.db import get_db
from backend.app.models.entities import Rubric, RubricCriterion, JudgeAssignment, User, Team
from backend.app.schemas.schemas import FlightReviewSubmit, LeaderboardEntry
from backend.app.services.judging_service import JudgingService
from backend.app.services.auth_service import AuthService
from backend.app.api.deps import get_current_user, require_event_role

router = APIRouter(prefix="/events/{event_id}/judging", tags=["Flight Review / Judging"])


@router.get("/rubric")
def get_mission_rubric(event_id: str, db: Session = Depends(get_db)):
    rubric = db.execute(select(Rubric).filter_by(event_id=event_id)).scalars().first()
    if not rubric:
        return {"title": "Standard Rubric", "criteria": []}
    return {
        "id": rubric.id,
        "title": rubric.title,
        "criteria": [
            {
                "id": c.id,
                "name": c.name,
                "weight": c.weight,
                "scale_min": c.scale_min,
                "scale_max": c.scale_max,
                "band_anchors": c.band_anchors
            } for c in rubric.criteria
        ]
    }


@router.post("/auto-assign")
def auto_assign_judges(
    event_id: str,
    current_user: User = Depends(require_event_role(["organizer", "super_admin"])),
    db: Session = Depends(get_db)
):
    assignments = JudgingService.assign_judges_balanced(db, event_id, actor_id=current_user.id)
    return {"message": f"Successfully created {len(assignments)} balanced judging assignments."}


@router.get("/assignments")
def get_judge_assignments(
    event_id: str,
    current_user: User = Depends(require_event_role(["judge", "organizer", "super_admin"])),
    db: Session = Depends(get_db)
):
    from backend.app.crypto import decrypt_field
    roles = AuthService.get_user_roles(db, current_user.id)
    is_admin_or_org = current_user.is_super_admin or any(
        r.get("event_id") == event_id and r.get("role") in ["organizer", "super_admin"] for r in roles
    )
    query = select(JudgeAssignment).filter_by(event_id=event_id)
    if not is_admin_or_org:
        query = query.filter_by(judge_id=current_user.id)
    assignments = db.execute(query).scalars().all()

    results = []
    for a in assignments:
        team = db.execute(select(Team).filter_by(id=a.team_id)).scalars().first()
        judge_user = db.execute(select(User).filter_by(id=a.judge_id)).scalars().first()
        judge_email = decrypt_field(judge_user.email_enc) if judge_user else "Unknown Judge"
        results.append({
            "assignment_id": a.id,
            "judge_id": a.judge_id,
            "judge_email": judge_email,
            "team_id": a.team_id,
            "team_name": team.name if team else "Unknown",
            "track": team.track if team else "General",
            "is_conflict": a.is_conflict,
            "conflict_reason": a.conflict_reason,
            "scores_submitted": len(a.scores) > 0,
            "assigned_at": a.created_at
        })
    return results


@router.post("/declare-conflict")
def declare_judge_conflict(
    event_id: str,
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Flag a conflict of interest on an assignment."""
    assignment_id = payload.get("assignment_id")
    reason = payload.get("reason", "Affiliation with squad members")

    assignment = db.execute(select(JudgeAssignment).filter_by(id=assignment_id, event_id=event_id)).scalars().first()
    if not assignment:
        raise HTTPException(status_code=404, detail="Assignment not found.")

    assignment.is_conflict = True
    assignment.conflict_reason = reason
    db.commit()

    return {"message": "Conflict of interest declared.", "assignment_id": assignment.id, "reason": reason}


@router.post("/assignments/{assignment_id}/scores")
def submit_flight_review(
    event_id: str,
    assignment_id: str,
    payload: FlightReviewSubmit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    revisions = JudgingService.submit_scores(
        db=db,
        assignment_id=assignment_id,
        scores=payload.scores,
        judge_user_id=current_user.id,
        actor_id=current_user.id
    )
    return {"message": "Flight review scores submitted.", "count": len(revisions)}


@router.get("/leaderboard", response_model=List[LeaderboardEntry])
def get_leaderboard(
    event_id: str,
    blind: bool = Query(False),
    db: Session = Depends(get_db)
):
    """Raw vs. z-score normalized flight review standings."""
    return JudgingService.calculate_leaderboard(db, event_id, blind=blind)
