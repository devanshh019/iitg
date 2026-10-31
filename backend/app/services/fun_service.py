"""Fun Layer service: Crew Passport, Big Screen ticker, Mentor Pit Stop, Crew Pulse, and Reveal Ceremony."""
import uuid
import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from fastapi import HTTPException
from backend.app.models.entities import (
    Badge, ParticipantBadge, Token, MoodPulse, HelpTicket, MentorSlot,
    Participant, Team, Event, Checkin, Submission, Announcement, ScheduleItem, utcnow
)
from backend.app.services.audit_service import AuditService
from backend.app.services.judging_service import JudgingService

STANDARD_BADGES = [
    {"key": "early_bird", "title": "Early Bird", "description": "Checked in among the first 10% of crew.", "icon": "Sunrise"},
    {"key": "squad_captain", "title": "Squad Captain", "description": "Founded and led a mission squad.", "icon": "Shield"},
    {"key": "mentor_magnet", "title": "Mentor Magnet", "description": "Booked pit stops and engaged with mission mentors.", "icon": "Sparkles"},
    {"key": "night_owl", "title": "Night Owl", "description": "Active in mission control during the midnight orbital burn.", "icon": "Moon"},
    {"key": "first_launch", "title": "First Launch", "description": "Successfully submitted a verified project revision.", "icon": "Rocket"}
]


class FunService:
    # Staged reveal state stored in memory: event_id -> stage (3=third, 2=second, 1=winner, 0=none)
    _ceremony_state: Dict[str, Dict[str, Any]] = {}

    @classmethod
    def get_or_award_badges(cls, db: Session, participant_id: str) -> List[Dict[str, Any]]:
        """Inspect participant activity and automatically award earned mission badges."""
        part = db.execute(select(Participant).filter_by(id=participant_id)).scalars().first()
        if not part:
            return []

        awarded_keys = {
            pb.badge_key for pb in db.execute(
                select(ParticipantBadge).filter_by(participant_id=participant_id)
            ).scalars().all()
        }

        # Check conditions
        # 1. Squad Captain
        if part.squad_id:
            team = db.execute(select(Team).filter_by(id=part.squad_id)).scalars().first()
            if team and team.leader_id == part.id and "squad_captain" not in awarded_keys:
                db.add(ParticipantBadge(participant_id=part.id, badge_key="squad_captain"))
                awarded_keys.add("squad_captain")

        # 2. First Launch
        if part.squad_id:
            sub = db.execute(select(Submission).filter_by(team_id=part.squad_id)).scalars().first()
            if sub and len(sub.revisions) > 0 and "first_launch" not in awarded_keys:
                db.add(ParticipantBadge(participant_id=part.id, badge_key="first_launch"))
                awarded_keys.add("first_launch")

        # 3. Early Bird (if boarded)
        checkin = db.execute(select(Checkin).filter_by(participant_id=part.id, station="entry")).scalars().first()
        if checkin and "early_bird" not in awarded_keys:
            db.add(ParticipantBadge(participant_id=part.id, badge_key="early_bird"))
            awarded_keys.add("early_bird")

        db.commit()

        # Build passport list
        passport = []
        for b in STANDARD_BADGES:
            is_unlocked = b["key"] in awarded_keys
            passport.append({
                "key": b["key"],
                "title": b["title"],
                "description": b["description"],
                "icon": b["icon"],
                "unlocked": is_unlocked
            })
        return passport

    @classmethod
    def record_mood_pulse(cls, db: Session, event_id: str, mood_score: int, energy_level: str, note: Optional[str] = None) -> MoodPulse:
        """Record anonymous Crew Pulse mood reading."""
        pulse = MoodPulse(
            event_id=event_id,
            mood_score=max(1, min(5, mood_score)),
            energy_level=energy_level,
            note=note
        )
        db.add(pulse)
        db.commit()
        return pulse

    @classmethod
    def get_mood_trend(cls, db: Session, event_id: str) -> Dict[str, Any]:
        """Get aggregate mood trends over time."""
        pulses = db.execute(
            select(MoodPulse).filter_by(event_id=event_id).order_by(MoodPulse.timestamp.desc()).limit(100)
        ).scalars().all()

        if not pulses:
            return {"average_mood": 4.5, "total_pulses": 0, "distribution": {}}

        avg_score = sum(p.mood_score for p in pulses) / len(pulses)
        dist = {}
        for p in pulses:
            dist[p.energy_level] = dist.get(p.energy_level, 0) + 1

        return {
            "average_mood": round(avg_score, 2),
            "total_pulses": len(pulses),
            "energy_distribution": dist,
            "recent_notes": [p.note for p in pulses if p.note][:5]
        }

    @classmethod
    def request_mentor_help(
        cls,
        db: Session,
        event_id: str,
        team_id: str,
        skill_tag: str,
        title: str,
        description: Optional[str],
        actor_id: str
    ) -> HelpTicket:
        """Raise a Need Help ticket routed to mentors by skill tag."""
        ticket = HelpTicket(
            event_id=event_id,
            team_id=team_id,
            skill_tag=skill_tag,
            title=title,
            description=description,
            status="open"
        )
        db.add(ticket)
        AuditService.record_mutation(
            db=db,
            actor_id=actor_id,
            action="help_ticket_created",
            entity_type="help_ticket",
            entity_id=ticket.id,
            payload={"team_id": team_id, "skill_tag": skill_tag, "title": title},
            event_id=event_id
        )
        db.commit()
        db.refresh(ticket)
        return ticket

    @classmethod
    def get_big_screen_data(cls, db: Session, event_id: str) -> Dict[str, Any]:
        """Aggregate live data for Big Screen Mode: countdown, boarding count, announcements, schedule."""
        event = db.execute(select(Event).filter_by(id=event_id)).scalars().first()
        boarded_count = db.execute(
            select(func.count(Checkin.id)).filter_by(event_id=event_id, station="entry", status="ACCEPTED")
        ).scalar() or 0
        total_crew = db.execute(select(func.count(Participant.id)).filter_by(event_id=event_id)).scalar() or 0

        latest_announcement = db.execute(
            select(Announcement).filter_by(event_id=event_id).order_by(Announcement.is_pinned.desc(), Announcement.created_at.desc()).limit(1)
        ).scalars().first()

        upcoming_schedule = db.execute(
            select(ScheduleItem).filter_by(event_id=event_id).order_by(ScheduleItem.start_time.asc()).limit(4)
        ).scalars().all()

        ceremony = cls._ceremony_state.get(event_id, {"active_stage": "none", "revealed_rank": None})

        return {
            "mission_title": event.title if event else "Mission",
            "submission_deadline": event.submission_deadline.isoformat() if event and event.submission_deadline else None,
            "boarded_crew": boarded_count,
            "total_registered_crew": total_crew,
            "boarding_percentage": round((boarded_count / total_crew * 100), 1) if total_crew else 0,
            "announcement": {
                "title": latest_announcement.title,
                "content": latest_announcement.content,
                "priority": latest_announcement.priority
            } if latest_announcement else None,
            "schedule": [
                {"title": s.title, "start": s.start_time.isoformat(), "location": s.location} for s in upcoming_schedule
            ],
            "ceremony": ceremony
        }

    @classmethod
    def trigger_reveal_stage(cls, db: Session, event_id: str, stage: str, actor_id: str) -> Dict[str, Any]:
        """Trigger staged results ceremony: stage='third', 'second', 'first' or 'concluded'."""
        leaderboard = JudgingService.calculate_leaderboard(db, event_id, blind=False)

        stage_mapping = {
            "third": 3,
            "second": 2,
            "first": 1
        }
        rank_to_reveal = stage_mapping.get(stage)
        revealed_team = None
        if rank_to_reveal and len(leaderboard) >= rank_to_reveal:
            revealed_team = leaderboard[rank_to_reveal - 1].model_dump()

        state = {
            "active_stage": stage,
            "revealed_rank": rank_to_reveal,
            "revealed_team": revealed_team,
            "updated_at": utcnow().isoformat()
        }
        cls._ceremony_state[event_id] = state

        AuditService.record_mutation(
            db=db,
            actor_id=actor_id,
            action="reveal_stage_triggered",
            entity_type="event",
            entity_id=event_id,
            payload=state,
            event_id=event_id
        )
        db.commit()
        return state
