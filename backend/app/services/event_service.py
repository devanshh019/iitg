"""Event / Mission management service with templates, cloning, and config validation."""
import copy
import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException
from backend.app.models.entities import Event, Rubric, RubricCriterion, utcnow
from backend.app.schemas.event_config import EventFormatConfig, RubricConfig, StationConfig, CriterionConfig
from backend.app.schemas.schemas import EventCreate, EventUpdate
from backend.app.crypto import generate_ed25519_keypair, encrypt_field
from backend.app.services.audit_service import AuditService

TEMPLATES: Dict[str, Dict[str, Any]] = {
    "offline_24h": {
        "title": "24h Offline Sprint Template",
        "description": "High-intensity 24-hour on-site hackathon with physical boarding gates, meal token tracking, and live judging.",
        "format_config": EventFormatConfig(
            format_type="offline_24h",
            min_team_size=2,
            max_team_size=4,
            tracks=["Systems & AI", "Open Innovation", "Hardware / IoT"],
            blind_judging=True,
            min_judges_per_team=2,
            stations=[
                StationConfig(id="entry", name="Main Boarding Gate"),
                StationConfig(id="meals", name="Ration Station / Meals", is_multi_scan_allowed=True),
                StationConfig(id="swag", name="Swag Hangar"),
                StationConfig(id="final_presentation", name="Flight Review Launch Deck")
            ],
            rubric=RubricConfig(
                title="Sprint Rubric",
                criteria=[
                    CriterionConfig(name="Technical Architecture", weight=0.40),
                    CriterionConfig(name="Innovation", weight=0.30),
                    CriterionConfig(name="Execution & Polish", weight=0.30)
                ]
            ),
            grace_window_minutes=15
        ).model_dump()
    },
    "online_48h": {
        "title": "Online 48h Multi-Track Template",
        "description": "Global distributed hackathon across multiple tracks, remote mentor slots, and asynchronous flight review.",
        "format_config": EventFormatConfig(
            format_type="online_48h",
            min_team_size=1,
            max_team_size=5,
            tracks=["AI Agents", "Web3 Infrastructure", "Developer Tooling", "Health & Biotech"],
            blind_judging=False,
            min_judges_per_team=3,
            stations=[
                StationConfig(id="entry", name="Virtual Check-in"),
                StationConfig(id="final_presentation", name="Live Demo Room")
            ],
            rubric=RubricConfig(
                title="Global Online Rubric",
                criteria=[
                    CriterionConfig(name="Impact & Practicality", weight=0.35),
                    CriterionConfig(name="Technical Depth", weight=0.35),
                    CriterionConfig(name="Demo & Documentation", weight=0.30)
                ]
            ),
            grace_window_minutes=30
        ).model_dump()
    },
    "hybrid_rounds": {
        "title": "Hybrid with Rounds Template",
        "description": "Multi-phase hackathon with initial online qualifiers, shortlist cutoff, and final live on-stage pitch review.",
        "format_config": EventFormatConfig(
            format_type="hybrid_rounds",
            min_team_size=2,
            max_team_size=4,
            tracks=["Fintech", "GovTech & Public Goods", "Generative Media"],
            rounds=["Qualifying Round", "Top 10 Final Review"],
            blind_judging=True,
            min_judges_per_team=3,
            stations=[
                StationConfig(id="entry", name="Physical Hangar Entry"),
                StationConfig(id="meals", name="Catering / Meals", is_multi_scan_allowed=True),
                StationConfig(id="swag", name="Kit Distribution"),
                StationConfig(id="workshop", name="Deep-Dive Workshop"),
                StationConfig(id="final_presentation", name="Main Stage Final Pitch")
            ],
            grace_window_minutes=20
        ).model_dump()
    }
}


class EventService:
    @classmethod
    def get_templates(cls) -> Dict[str, Any]:
        return TEMPLATES

    @classmethod
    def create_event(cls, db: Session, payload: EventCreate, actor_id: str) -> Event:
        # Check slug uniqueness
        existing = db.execute(select(Event).filter_by(slug=payload.slug)).scalars().first()
        if existing:
            raise HTTPException(status_code=400, detail=f"Mission with slug '{payload.slug}' already exists.")

        # Determine config
        if payload.format_config:
            config_dict = payload.format_config.model_dump()
        elif payload.format_type in TEMPLATES:
            config_dict = TEMPLATES[payload.format_type]["format_config"]
        else:
            config_dict = EventFormatConfig().model_dump()

        # Validate with Pydantic
        EventFormatConfig(**config_dict)

        # Generate Ed25519 keypair for offline boarding
        priv_b64, pub_b64 = generate_ed25519_keypair()
        priv_enc = encrypt_field(priv_b64)

        event = Event(
            slug=payload.slug,
            title=payload.title,
            description=payload.description,
            format_type=payload.format_type,
            format_config=config_dict,
            ed25519_public_key=pub_b64,
            ed25519_private_key_enc=priv_enc,
            starts_at=payload.starts_at or utcnow(),
            ends_at=payload.ends_at or (utcnow() + datetime.timedelta(days=2)),
            submission_deadline=payload.submission_deadline or (utcnow() + datetime.timedelta(days=1, hours=6)),
            grace_period_minutes=payload.grace_period_minutes
        )
        db.add(event)
        db.flush()

        # Create Default Rubric in database
        rubric_config = config_dict.get("rubric", {})
        rubric = Rubric(event_id=event.id, title=rubric_config.get("title", "Standard Rubric"))
        db.add(rubric)
        db.flush()

        for crit in rubric_config.get("criteria", []):
            criterion = RubricCriterion(
                rubric_id=rubric.id,
                name=crit.get("name"),
                weight=crit.get("weight", 1.0),
                scale_min=crit.get("scale_min", 1.0),
                scale_max=crit.get("scale_max", 10.0),
                band_anchors=crit.get("band_anchors", {})
            )
            db.add(criterion)

        AuditService.record_mutation(
            db=db,
            actor_id=actor_id,
            action="event_created",
            entity_type="event",
            entity_id=event.id,
            payload={"slug": event.slug, "title": event.title, "format_type": event.format_type},
            event_id=event.id
        )
        db.commit()
        db.refresh(event)
        return event

    @classmethod
    def clone_event(cls, db: Session, source_event_id: str, new_slug: str, new_title: str, actor_id: str) -> Event:
        source = db.execute(select(Event).filter_by(id=source_event_id)).scalars().first()
        if not source:
            raise HTTPException(status_code=404, detail="Source mission not found.")

        payload = EventCreate(
            slug=new_slug,
            title=new_title,
            description=f"Cloned from {source.title}: {source.description or ''}",
            format_type=source.format_type,
            format_config=EventFormatConfig(**source.format_config),
            starts_at=utcnow() + datetime.timedelta(days=7),
            ends_at=utcnow() + datetime.timedelta(days=9),
            submission_deadline=utcnow() + datetime.timedelta(days=8, hours=12),
            grace_period_minutes=source.grace_period_minutes
        )
        return cls.create_event(db, payload, actor_id)

    @classmethod
    def update_event(cls, db: Session, event_id: str, payload: EventUpdate, actor_id: str) -> Event:
        event = db.execute(select(Event).filter_by(id=event_id)).scalars().first()
        if not event:
            raise HTTPException(status_code=404, detail="Mission not found.")

        changes = {}
        if payload.title is not None:
            event.title = payload.title
            changes["title"] = payload.title
        if payload.description is not None:
            event.description = payload.description
            changes["description"] = payload.description
        if payload.status is not None:
            event.status = payload.status
            changes["status"] = payload.status
        if payload.format_config is not None:
            event.format_config = payload.format_config.model_dump()
            changes["format_config"] = event.format_config
        if payload.starts_at is not None:
            event.starts_at = payload.starts_at
            changes["starts_at"] = payload.starts_at.isoformat()
        if payload.ends_at is not None:
            event.ends_at = payload.ends_at
            changes["ends_at"] = payload.ends_at.isoformat()
        if payload.submission_deadline is not None:
            event.submission_deadline = payload.submission_deadline
            changes["submission_deadline"] = payload.submission_deadline.isoformat()
        if payload.is_submissions_locked is not None:
            event.is_submissions_locked = payload.is_submissions_locked
            changes["is_submissions_locked"] = payload.is_submissions_locked
        if payload.is_teams_locked is not None:
            event.is_teams_locked = payload.is_teams_locked
            changes["is_teams_locked"] = payload.is_teams_locked

        AuditService.record_mutation(
            db=db,
            actor_id=actor_id,
            action="event_updated",
            entity_type="event",
            entity_id=event.id,
            payload=changes,
            event_id=event.id
        )
        db.commit()
        db.refresh(event)
        return event
