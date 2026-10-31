"""Flight Review (Judging) Service: Rubrics, balanced assignments, conflict blocking, z-score normalization, and append-only scores."""
import math
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, func
from fastapi import HTTPException
from backend.app.models.entities import (
    Event, Team, User, Rubric, RubricCriterion, JudgeAssignment,
    ScoreRevision, Participant, EventRole, utcnow
)
from backend.app.schemas.schemas import ScoreInput, LeaderboardEntry
from backend.app.services.audit_service import AuditService


class JudgingService:
    @classmethod
    def assign_judges_balanced(cls, db: Session, event_id: str, actor_id: str) -> List[JudgeAssignment]:
        """Balanced judge-to-squad assignment with conflict-of-interest blocking and minimum N judges."""
        event = db.execute(select(Event).filter_by(id=event_id)).scalars().first()
        if not event:
            raise HTTPException(status_code=404, detail="Mission not found.")

        # Find all judges
        judge_roles = db.execute(
            select(EventRole).filter_by(event_id=event_id, role="judge")
        ).scalars().all()
        judge_ids = [r.user_id for r in judge_roles]

        if not judge_ids:
            return []

        teams = db.execute(select(Team).filter_by(event_id=event_id)).scalars().all()
        min_judges = event.format_config.get("min_judges_per_team", 2) if event.format_config else 2

        assignments = []
        # Round-robin balanced distribution
        judge_idx = 0
        for team in teams:
            # Count existing non-conflict assignments
            assigned_judges = {
                a.judge_id for a in db.execute(
                    select(JudgeAssignment).filter_by(team_id=team.id)
                ).scalars().all()
            }

            needed = max(0, min_judges - len(assigned_judges))
            attempts = 0
            while needed > 0 and attempts < len(judge_ids):
                j_id = judge_ids[judge_idx % len(judge_ids)]
                judge_idx += 1
                attempts += 1

                if j_id in assigned_judges:
                    continue

                # Conflict of interest check (e.g. judge is in the team or college match)
                is_conflict = False
                conflict_reason = None

                # Check if judge has participant account in the same team
                judge_part = db.execute(select(Participant).filter_by(user_id=j_id, squad_id=team.id)).scalars().first()
                if judge_part:
                    is_conflict = True
                    conflict_reason = "Judge is an active member of this squad."

                new_assignment = JudgeAssignment(
                    event_id=event_id,
                    judge_id=j_id,
                    team_id=team.id,
                    is_conflict=is_conflict,
                    conflict_reason=conflict_reason
                )
                db.add(new_assignment)
                assignments.append(new_assignment)
                assigned_judges.add(j_id)
                if not is_conflict:
                    needed -= 1

        db.commit()
        return assignments

    @classmethod
    def submit_scores(
        cls,
        db: Session,
        assignment_id: str,
        scores: List[ScoreInput],
        judge_user_id: str,
        actor_id: str
    ) -> List[ScoreRevision]:
        """Submit or revise rubric criteria scores with append-only revisions and comments."""
        assignment = db.execute(select(JudgeAssignment).filter_by(id=assignment_id)).scalars().first()
        if not assignment:
            raise HTTPException(status_code=404, detail="Judge assignment not found.")

        if assignment.judge_id != judge_user_id:
            raise HTTPException(status_code=403, detail="Unauthorized judge for this flight review assignment.")

        if assignment.is_conflict:
            raise HTTPException(status_code=403, detail="Scoring blocked due to recorded conflict of interest.")

        saved_revisions: List[ScoreRevision] = []

        for s in scores:
            # Check highest revision number for this criterion on this assignment
            latest = db.execute(
                select(ScoreRevision)
                .filter_by(assignment_id=assignment.id, criterion_id=s.criterion_id)
                .order_by(ScoreRevision.revision_number.desc())
            ).scalars().first()

            rev_num = (latest.revision_number + 1) if latest else 1
            if latest and not s.comment:
                raise HTTPException(
                    status_code=400,
                    detail=f"Score edits after initial submission require an explanatory comment."
                )

            score_rev = ScoreRevision(
                assignment_id=assignment.id,
                criterion_id=s.criterion_id,
                score=s.score,
                comment=s.comment,
                revision_number=rev_num
            )
            db.add(score_rev)
            saved_revisions.append(score_rev)

        AuditService.record_mutation(
            db=db,
            actor_id=actor_id,
            action="scores_submitted",
            entity_type="judge_assignment",
            entity_id=assignment.id,
            payload={
                "team_id": assignment.team_id,
                "scores_count": len(scores),
                "criteria": [{"id": s.criterion_id, "score": s.score} for s in scores]
            },
            event_id=assignment.event_id
        )
        db.commit()
        return saved_revisions

    @classmethod
    def calculate_leaderboard(cls, db: Session, event_id: str, blind: bool = False) -> List[LeaderboardEntry]:
        """Calculate weighted raw means and z-score normalized scores side by side."""
        event = db.execute(select(Event).filter_by(id=event_id)).scalars().first()
        if not event:
            raise HTTPException(status_code=404, detail="Mission not found.")

        # Get all criteria weights
        rubric = db.execute(select(Rubric).filter_by(event_id=event_id)).scalars().first()
        criteria_map = {c.id: c.weight for c in rubric.criteria} if rubric else {}
        total_weight = sum(criteria_map.values()) or 1.0

        # Step 1: Gather latest score per assignment & criterion
        assignments = db.execute(
            select(JudgeAssignment).filter_by(event_id=event_id, is_conflict=False)
        ).scalars().all()

        # Compute per-judge scores for normalization
        judge_scores: Dict[str, List[float]] = {}
        team_weighted_scores: Dict[str, List[float]] = {}
        team_judge_pairs: Dict[str, List[tuple[str, float]]] = {}

        for a in assignments:
            # Get latest scores for each criterion
            assignment_score_weighted = 0.0
            has_scores = False

            for crit_id, weight in criteria_map.items():
                latest_score = db.execute(
                    select(ScoreRevision)
                    .filter_by(assignment_id=a.id, criterion_id=crit_id)
                    .order_by(ScoreRevision.revision_number.desc())
                ).scalars().first()

                if latest_score:
                    has_scores = True
                    assignment_score_weighted += (latest_score.score * weight)

            if has_scores:
                final_assignment_score = assignment_score_weighted / total_weight
                judge_scores.setdefault(a.judge_id, []).append(final_assignment_score)
                team_weighted_scores.setdefault(a.team_id, []).append(final_assignment_score)
                team_judge_pairs.setdefault(a.team_id, []).append((a.judge_id, final_assignment_score))

        # Step 2: Calculate per-judge mean and standard deviation
        judge_stats: Dict[str, tuple[float, float]] = {}
        for j_id, scores_list in judge_scores.items():
            mean = sum(scores_list) / len(scores_list)
            variance = sum((x - mean) ** 2 for x in scores_list) / len(scores_list) if len(scores_list) > 1 else 1.0
            std_dev = math.sqrt(variance) or 1.0
            judge_stats[j_id] = (mean, std_dev)

        # Step 3: Compute team aggregates
        teams = db.execute(select(Team).filter_by(event_id=event_id)).scalars().all()
        entries: List[LeaderboardEntry] = []

        for team in teams:
            raw_scores = team_weighted_scores.get(team.id, [])
            review_count = len(raw_scores)

            if not raw_scores:
                raw_avg = 0.0
                norm_avg = 0.0
                outlier = False
            else:
                raw_avg = sum(raw_scores) / len(raw_scores)
                # Compute normalized score z-score mapping to a 0-100 index
                z_scores = []
                for j_id, s_val in team_judge_pairs[team.id]:
                    j_mean, j_std = judge_stats.get(j_id, (s_val, 1.0))
                    z = (s_val - j_mean) / j_std
                    z_scores.append(z)
                avg_z = sum(z_scores) / len(z_scores)
                # Map z [-2.5, +2.5] to [50 + 20*z] capped at [0, 100]
                norm_avg = max(0.0, min(100.0, round(50.0 + (avg_z * 20.0), 2)))

                # Detect outlier: if any judge gave a score > 2.5 standard deviations away from team mean
                outlier = any(abs(s - raw_avg) > 3.0 for s in raw_scores) if len(raw_scores) >= 2 else False

            team_display_name = f"Squad #{team.join_code[-4:]}" if blind else team.name

            entries.append(LeaderboardEntry(
                team_id=team.id,
                team_name=team_display_name,
                track=team.track,
                raw_average=round(raw_avg, 2),
                normalized_score=round(norm_avg, 2),
                review_count=review_count,
                outlier_flag=outlier
            ))

        # Sort by normalized score desc, then raw_average desc
        entries.sort(key=lambda x: (x.normalized_score, x.raw_average), reverse=True)
        for idx, entry in enumerate(entries, start=1):
            entry.rank = idx

        return entries
