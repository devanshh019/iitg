"""Squads (Teams) service with join codes, lock deadlines, roster history, and Squad Finder."""
import random
import string
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select, and_
from fastapi import HTTPException
from backend.app.models.entities import Team, TeamMembership, TeamHistory, Participant, Event, utcnow
from backend.app.schemas.schemas import TeamCreate, TeamOverrideLock
from backend.app.services.audit_service import AuditService

MISSION_PREFIXES = ["Apollo", "Cyber", "Vanguard", "Nebula", "Quantum", "Hyperion", "Pulsar", "Astra", "Orbit", "Titan"]
MISSION_SUFFIXES = ["Payload", "Syndicate", "Command", "Pioneers", "Collective", "Dynamics", "Systems", "Engineers", "Ops"]
MISSION_TAGLINES = [
    "Building mission-critical systems for tomorrow.",
    "Propelling software to orbital velocity.",
    "Zero latency, zero fear, pure innovation.",
    "Navigating deep space architectures.",
    "Telemetry active, mission parameters green."
]


class TeamService:
    @staticmethod
    def generate_join_code() -> str:
        return "SQ-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))

    @staticmethod
    def generate_random_name_and_tagline() -> tuple[str, str]:
        name = f"{random.choice(MISSION_PREFIXES)} {random.choice(MISSION_SUFFIXES)}"
        tagline = random.choice(MISSION_TAGLINES)
        return name, tagline

    @classmethod
    def create_team(cls, db: Session, event_id: str, participant_id: str, payload: TeamCreate, actor_id: str) -> Team:
        participant = db.execute(select(Participant).filter_by(id=participant_id, event_id=event_id)).scalars().first()
        if not participant:
            raise HTTPException(status_code=404, detail="Crew participant not found.")

        if participant.squad_id:
            raise HTTPException(status_code=400, detail="Crew member already belongs to a squad.")

        event = db.execute(select(Event).filter_by(id=event_id)).scalars().first()
        if event and event.is_teams_locked:
            raise HTTPException(status_code=400, detail="Squad formation is currently locked for this mission.")

        join_code = cls.generate_join_code()
        while db.execute(select(Team).filter_by(join_code=join_code)).scalars().first():
            join_code = cls.generate_join_code()

        team = Team(
            event_id=event_id,
            name=payload.name,
            tagline=payload.tagline or cls.generate_random_name_and_tagline()[1],
            join_code=join_code,
            leader_id=participant.id,
            track=payload.track
        )
        db.add(team)
        db.flush()

        # Add leader membership
        membership = TeamMembership(team_id=team.id, participant_id=participant.id, role="leader")
        db.add(membership)

        participant.squad_id = team.id
        participant.status = "squad_locked"

        # Record team history
        history = TeamHistory(
            team_id=team.id,
            action="created",
            actor_id=actor_id,
            details={"name": team.name, "leader_id": participant.id, "join_code": team.join_code}
        )
        db.add(history)

        AuditService.record_mutation(
            db=db,
            actor_id=actor_id,
            action="team_created",
            entity_type="team",
            entity_id=team.id,
            payload={"name": team.name, "join_code": team.join_code, "leader_id": participant.id},
            event_id=event_id
        )
        db.commit()
        db.refresh(team)
        return team

    @classmethod
    def join_team_by_code(cls, db: Session, event_id: str, participant_id: str, join_code: str, actor_id: str) -> Team:
        participant = db.execute(select(Participant).filter_by(id=participant_id, event_id=event_id)).scalars().first()
        if not participant:
            raise HTTPException(status_code=404, detail="Crew member not found.")

        if participant.squad_id:
            raise HTTPException(status_code=400, detail="Participant already in a squad.")

        team = db.execute(select(Team).filter_by(event_id=event_id, join_code=join_code.strip())).scalars().first()
        if not team:
            raise HTTPException(status_code=404, detail="Invalid squad join code.")

        if team.is_locked:
            raise HTTPException(status_code=400, detail="This squad has locked its roster.")

        event = db.execute(select(Event).filter_by(id=event_id)).scalars().first()
        max_size = event.format_config.get("max_team_size", 4) if event and event.format_config else 4
        current_members = len(team.memberships)
        if current_members >= max_size:
            raise HTTPException(status_code=400, detail=f"Squad is full (maximum capacity {max_size} crew).")

        membership = TeamMembership(team_id=team.id, participant_id=participant.id, role="member")
        db.add(membership)
        participant.squad_id = team.id
        participant.status = "squad_locked"

        history = TeamHistory(
            team_id=team.id,
            action="joined",
            actor_id=actor_id,
            details={"participant_id": participant.id, "name": participant.name}
        )
        db.add(history)

        AuditService.record_mutation(
            db=db,
            actor_id=actor_id,
            action="team_member_joined",
            entity_type="team",
            entity_id=team.id,
            payload={"participant_id": participant.id, "team_id": team.id},
            event_id=event_id
        )
        db.commit()
        db.refresh(team)
        return team

    @classmethod
    def leave_team(cls, db: Session, event_id: str, participant_id: str, actor_id: str) -> None:
        participant = db.execute(select(Participant).filter_by(id=participant_id, event_id=event_id)).scalars().first()
        if not participant or not participant.squad_id:
            raise HTTPException(status_code=400, detail="Participant is not in any squad.")

        team = db.execute(select(Team).filter_by(id=participant.squad_id)).scalars().first()
        if not team:
            raise HTTPException(status_code=404, detail="Squad not found.")

        if team.is_locked:
            raise HTTPException(status_code=400, detail="Squad is locked; organizer override required to leave.")

        membership = db.execute(
            select(TeamMembership).filter_by(team_id=team.id, participant_id=participant.id)
        ).scalars().first()
        if membership:
            db.delete(membership)

        participant.squad_id = None
        participant.status = "registered"

        # If leader left, transfer leadership to remaining member or disband
        remaining = db.execute(select(TeamMembership).filter_by(team_id=team.id)).scalars().all()
        if team.leader_id == participant.id:
            if remaining:
                team.leader_id = remaining[0].participant_id
                remaining[0].role = "leader"
            else:
                team.leader_id = None

        history = TeamHistory(
            team_id=team.id,
            action="left",
            actor_id=actor_id,
            details={"participant_id": participant.id, "name": participant.name}
        )
        db.add(history)

        AuditService.record_mutation(
            db=db,
            actor_id=actor_id,
            action="team_member_left",
            entity_type="team",
            entity_id=team.id,
            payload={"participant_id": participant.id},
            event_id=event_id
        )
        db.commit()

    @classmethod
    def transfer_lead(cls, db: Session, team_id: str, current_leader_id: str, new_leader_id: str, actor_id: str) -> Team:
        team = db.execute(select(Team).filter_by(id=team_id)).scalars().first()
        if not team:
            raise HTTPException(status_code=404, detail="Squad not found.")

        if team.leader_id != current_leader_id:
            raise HTTPException(status_code=403, detail="Only current squad leader can transfer leadership.")

        new_mem = db.execute(select(TeamMembership).filter_by(team_id=team.id, participant_id=new_leader_id)).scalars().first()
        old_mem = db.execute(select(TeamMembership).filter_by(team_id=team.id, participant_id=current_leader_id)).scalars().first()
        if not new_mem:
            raise HTTPException(status_code=400, detail="New leader must be a member of the squad.")

        team.leader_id = new_leader_id
        new_mem.role = "leader"
        if old_mem:
            old_mem.role = "member"

        history = TeamHistory(
            team_id=team.id,
            action="transfer_lead",
            actor_id=actor_id,
            details={"old_leader": current_leader_id, "new_leader": new_leader_id}
        )
        db.add(history)

        AuditService.record_mutation(
            db=db,
            actor_id=actor_id,
            action="team_lead_transferred",
            entity_type="team",
            entity_id=team.id,
            payload={"old_leader": current_leader_id, "new_leader": new_leader_id},
            event_id=team.event_id
        )
        db.commit()
        db.refresh(team)
        return team

    @classmethod
    def organizer_override_lock(cls, db: Session, team_id: str, payload: TeamOverrideLock, actor_id: str) -> Team:
        team = db.execute(select(Team).filter_by(id=team_id)).scalars().first()
        if not team:
            raise HTTPException(status_code=404, detail="Squad not found.")

        team.is_locked = payload.is_locked
        team.lock_reason = payload.reason

        history = TeamHistory(
            team_id=team.id,
            action="override_lock",
            actor_id=actor_id,
            details={"is_locked": payload.is_locked, "reason": payload.reason}
        )
        db.add(history)

        AuditService.record_mutation(
            db=db,
            actor_id=actor_id,
            action="team_lock_override",
            entity_type="team",
            entity_id=team.id,
            payload={"is_locked": payload.is_locked, "reason": payload.reason},
            event_id=team.event_id
        )
        db.commit()
        db.refresh(team)
        return team

    @classmethod
    def suggest_squads_for_solo(cls, db: Session, event_id: str, participant_id: str) -> List[Dict[str, Any]]:
        """Squad Finder: suggest squads looking for crew members."""
        participant = db.execute(select(Participant).filter_by(id=participant_id, event_id=event_id)).scalars().first()
        part_skills = set(participant.custom_fields.get("skills", ["Fullstack"])) if participant else {"Fullstack"}

        teams = db.execute(select(Team).filter_by(event_id=event_id, is_locked=False)).scalars().all()
        suggestions = []
        for t in teams:
            count = len(t.memberships)
            if count < 4:
                suggestions.append({
                    "team_id": t.id,
                    "name": t.name,
                    "tagline": t.tagline,
                    "track": t.track,
                    "current_members": count,
                    "join_code": t.join_code,
                    "match_reason": f"Open slots ({count}/4) looking for {', '.join(list(part_skills)[:2])}"
                })
        return suggestions[:5]
