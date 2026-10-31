"""Squad Launch (Submissions) API routes."""
import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from backend.app.db import get_db
from backend.app.models.entities import Submission, SubmissionRevision, Team, Participant, User
from backend.app.schemas.schemas import SubmissionDraft, LaunchReceipt, SubmissionResponse
from backend.app.services.submission_service import SubmissionService
from backend.app.api.deps import get_current_user, require_event_role

router = APIRouter(prefix="/events/{event_id}/submissions", tags=["Squad Launch / Submissions"])


@router.get("/my-squad")
def get_my_squad_submission(
    event_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    part = db.execute(select(Participant).filter_by(user_id=current_user.id, event_id=event_id)).scalars().first()
    if not part or not part.squad_id:
        return None

    sub = db.execute(select(Submission).filter_by(team_id=part.squad_id)).scalars().first()
    if not sub:
        return None

    latest_rev = db.execute(
        select(SubmissionRevision).filter_by(submission_id=sub.id).order_by(SubmissionRevision.revision_number.desc())
    ).scalars().first()

    return {
        "submission_id": sub.id,
        "team_id": sub.team_id,
        "final_receipt_id": sub.final_receipt_id,
        "is_late": sub.is_late,
        "latest_revision": {
            "revision_number": latest_rev.revision_number,
            "repo_url": latest_rev.repo_url,
            "demo_url": latest_rev.demo_url,
            "video_url": latest_rev.video_url,
            "deck_url": latest_rev.deck_url,
            "description": latest_rev.description,
            "content_hash": latest_rev.content_hash,
            "server_at": latest_rev.server_at
        } if latest_rev else None
    }


@router.post("/draft")
def save_submission_draft(
    event_id: str,
    payload: SubmissionDraft,
    expected_revision: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    part = db.execute(select(Participant).filter_by(user_id=current_user.id, event_id=event_id)).scalars().first()
    if not part or not part.squad_id:
        raise HTTPException(status_code=400, detail="Must belong to a squad to submit project materials.")

    rev, _ = SubmissionService.save_draft_or_launch(
        db=db,
        event_id=event_id,
        team_id=part.squad_id,
        submitter_id=current_user.id,
        payload=payload,
        is_final_launch=False,
        expected_revision=expected_revision
    )
    return {
        "message": "Draft revision saved successfully.",
        "revision_number": rev.revision_number,
        "content_hash": rev.content_hash,
        "server_at": rev.server_at
    }


@router.post("/launch", response_model=LaunchReceipt)
def final_launch_submission(
    event_id: str,
    payload: SubmissionDraft,
    expected_revision: Optional[int] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    part = db.execute(select(Participant).filter_by(user_id=current_user.id, event_id=event_id)).scalars().first()
    if not part or not part.squad_id:
        raise HTTPException(status_code=400, detail="Must belong to a squad to execute final launch.")

    _, receipt = SubmissionService.save_draft_or_launch(
        db=db,
        event_id=event_id,
        team_id=part.squad_id,
        submitter_id=current_user.id,
        payload=payload,
        is_final_launch=True,
        expected_revision=expected_revision
    )
    return receipt


@router.post("/grant-extension")
def grant_deadline_extension(
    event_id: str,
    team_id: str = Query(...),
    new_deadline: datetime.datetime = Query(...),
    reason: str = Query(...),
    current_user: User = Depends(require_event_role(["organizer", "super_admin"])),
    db: Session = Depends(get_db)
):
    team = SubmissionService.grant_extension(db, event_id, team_id, new_deadline, reason, actor_id=current_user.id)
    return {
        "message": f"Extension granted to {team.name}.",
        "new_deadline": team.extension_deadline,
        "reason": team.extension_reason
    }
