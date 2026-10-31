"""Squad Launch (Submissions) engine: append-only revisions, SHA-256 hashes, receipts, and deadline control."""
import json
import uuid
import datetime
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException
from backend.app.models.entities import Submission, SubmissionRevision, Team, Event, Participant, utcnow
from backend.app.schemas.schemas import SubmissionDraft, LaunchReceipt, SubmissionResponse
from backend.app.crypto import sha256_digest
from backend.app.services.audit_service import AuditService


class SubmissionService:
    @staticmethod
    def calculate_submission_hash(revision_data: Dict[str, Any]) -> str:
        """Compute SHA-256 hash over submission content."""
        canonical_json = json.dumps(revision_data, sort_keys=True, separators=(',', ':'))
        return sha256_digest(canonical_json)

    @classmethod
    def save_draft_or_launch(
        cls,
        db: Session,
        event_id: str,
        team_id: str,
        submitter_id: str,
        payload: SubmissionDraft,
        is_final_launch: bool = False,
        expected_revision: Optional[int] = None
    ) -> Tuple[SubmissionRevision, Optional[LaunchReceipt]]:
        """Save a new revision with optimistic concurrency check, deadline enforcement, and SHA-256 hash."""
        event = db.execute(select(Event).filter_by(id=event_id)).scalars().first()
        team = db.execute(select(Team).filter_by(id=team_id, event_id=event_id)).scalars().first()

        if not event or not team:
            raise HTTPException(status_code=404, detail="Mission or squad not found.")

        # Check deadline engine
        server_now = utcnow()
        effective_deadline = team.extension_deadline or event.submission_deadline
        is_late = False

        if effective_deadline:
            grace_delta = datetime.timedelta(minutes=event.grace_period_minutes)
            if server_now > (effective_deadline + grace_delta):
                if event.is_submissions_locked:
                    raise HTTPException(
                        status_code=403,
                        detail="Launches are frozen! Submission deadline and grace window have passed."
                    )
                is_late = True
            elif server_now > effective_deadline:
                is_late = True

        # Find or create submission record
        submission = db.execute(select(Submission).filter_by(team_id=team.id)).scalars().first()
        if not submission:
            submission = Submission(
                event_id=event_id,
                team_id=team.id,
                is_late=is_late
            )
            db.add(submission)
            db.flush()

        # Optimistic concurrency check
        latest_rev = db.execute(
            select(SubmissionRevision)
            .filter_by(submission_id=submission.id)
            .order_by(SubmissionRevision.revision_number.desc())
        ).scalars().first()

        current_rev_num = latest_rev.revision_number if latest_rev else 0
        if expected_revision is not None and expected_revision != current_rev_num:
            raise HTTPException(
                status_code=409,
                detail=f"Concurrency Conflict: Submission has been updated by another teammate (at revision {current_rev_num}). Please refresh."
            )

        new_rev_num = current_rev_num + 1

        # Calculate SHA-256 hash
        content_dict = {
            "submission_id": submission.id,
            "revision_number": new_rev_num,
            "repo_url": payload.repo_url or "",
            "demo_url": payload.demo_url or "",
            "video_url": payload.video_url or "",
            "deck_url": payload.deck_url or "",
            "description": payload.description or "",
            "custom_answers": payload.custom_answers
        }
        content_hash = cls.calculate_submission_hash(content_dict)

        revision = SubmissionRevision(
            submission_id=submission.id,
            revision_number=new_rev_num,
            repo_url=payload.repo_url,
            demo_url=payload.demo_url,
            video_url=payload.video_url,
            deck_url=payload.deck_url,
            description=payload.description,
            custom_answers=payload.custom_answers,
            content_hash=content_hash,
            submitter_id=submitter_id,
            claimed_at=payload.claimed_at,
            server_at=server_now
        )
        db.add(revision)

        receipt: Optional[LaunchReceipt] = None
        if is_final_launch:
            receipt_id = f"LNCH-{uuid.uuid4().hex[:10].upper()}"
            submission.final_receipt_id = receipt_id
            submission.is_late = is_late

            # Update all team members' status to 'launched'
            for member in team.members:
                member.status = "launched"

            receipt = LaunchReceipt(
                receipt_id=receipt_id,
                submission_id=submission.id,
                team_id=team.id,
                team_name=team.name,
                revision_number=new_rev_num,
                content_hash=content_hash,
                server_timestamp=server_now,
                is_late=is_late,
                verification_qr_payload=f"HACKOS-LAUNCH:{receipt_id}:{content_hash[:16]}"
            )

        AuditService.record_mutation(
            db=db,
            actor_id=submitter_id,
            action="submission_launched" if is_final_launch else "submission_draft_saved",
            entity_type="submission",
            entity_id=submission.id,
            payload={
                "revision_number": new_rev_num,
                "content_hash": content_hash,
                "is_late": is_late,
                "final_receipt_id": submission.final_receipt_id
            },
            event_id=event_id
        )
        db.commit()
        db.refresh(revision)
        return revision, receipt

    @classmethod
    def grant_extension(
        cls,
        db: Session,
        event_id: str,
        team_id: str,
        new_deadline: datetime.datetime,
        reason: str,
        actor_id: str
    ) -> Team:
        """Organizer override to grant a deadline extension to a specific squad."""
        team = db.execute(select(Team).filter_by(id=team_id, event_id=event_id)).scalars().first()
        if not team:
            raise HTTPException(status_code=404, detail="Squad not found.")

        team.extension_deadline = new_deadline
        team.extension_reason = reason

        AuditService.record_mutation(
            db=db,
            actor_id=actor_id,
            action="deadline_extension_granted",
            entity_type="team",
            entity_id=team.id,
            payload={"new_deadline": new_deadline.isoformat(), "reason": reason},
            event_id=event_id
        )
        db.commit()
        db.refresh(team)
        return team
