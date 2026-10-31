"""Flight Review (Judging) API routes."""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from backend.app.db import get_db
from backend.app.models.entities import Rubric, RubricCriterion, JudgeAssignment, User, Team
from backend.app.schemas.schemas import FlightReviewSubmit, LeaderboardEntry
from backend.app.services.judging_service import JudgingService
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
    query = select(JudgeAssignment).filter_by(event_id=event_id)
    if not current_user.is_super_admin:
        query = query.filter_by(judge_id=current_user.id)
    assignments = db.execute(query).scalars().all()

    results = []
    for a in assignments:
        team = db.execute(select(Team).filter_by(id=a.team_id)).scalars().first()
        results.append({
            "assignment_id": a.id,
            "team_id": a.team_id,
            "team_name": team.name if team else "Unknown",
            "is_conflict": a.is_conflict,
            "conflict_reason": a.conflict_reason,
            "scores_submitted": len(a.scores) > 0
        })
    return results


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
