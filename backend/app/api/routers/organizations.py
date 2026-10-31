"""Organizations API Router.
Handles organization registration, hackathon hosting, and arena management.
"""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from backend.app.db import get_db
from backend.app.models.entities import Organization, Event, User, EventRole, Participant, Team, Submission, ProblemStatement, utcnow
from backend.app.schemas.schemas import OrganizationCreate, OrganizationUpdate, OrganizationResponse, EventCreate, EventResponse
from backend.app.services.event_service import EventService
from backend.app.services.auth_service import AuthService
from backend.app.services.audit_service import AuditService
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/organizations", tags=["Organizations"])


@router.get("", response_model=List[OrganizationResponse])
def list_organizations(db: Session = Depends(get_db)):
    """List all registered organizations with their hosted event counts."""
    orgs = db.execute(select(Organization).order_by(Organization.created_at.desc())).scalars().all()
    results = []
    for org in orgs:
        count = db.execute(select(func.count(Event.id)).filter_by(organization_id=org.id)).scalar() or len(org.events)
        results.append(
            OrganizationResponse(
                id=org.id,
                name=org.name,
                slug=org.slug,
                description=org.description,
                website=org.website,
                contact_email=org.contact_email,
                logo_url=org.logo_url,
                category=org.category or "university",
                is_verified=org.is_verified,
                owner_id=org.owner_id,
                events_count=count,
                created_at=org.created_at
            )
        )
    return results


@router.get("/my-orgs", response_model=List[OrganizationResponse])
def get_my_organizations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List organizations owned by the currently authenticated user."""
    orgs = db.execute(
        select(Organization).filter_by(owner_id=current_user.id).order_by(Organization.created_at.desc())
    ).scalars().all()
    results = []
    for org in orgs:
        count = db.execute(select(func.count(Event.id)).filter_by(organization_id=org.id)).scalar() or len(org.events)
        results.append(
            OrganizationResponse(
                id=org.id,
                name=org.name,
                slug=org.slug,
                description=org.description,
                website=org.website,
                contact_email=org.contact_email,
                logo_url=org.logo_url,
                category=org.category or "university",
                is_verified=org.is_verified,
                owner_id=org.owner_id,
                events_count=count,
                created_at=org.created_at
            )
        )
    return results


@router.post("", response_model=OrganizationResponse)
def register_organization(
    payload: OrganizationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Register a new host organization."""
    existing = db.execute(select(Organization).filter_by(slug=payload.slug)).scalars().first()
    if existing:
        raise HTTPException(status_code=400, detail="An organization with this slug already exists.")

    org = Organization(
        name=payload.name,
        slug=payload.slug,
        description=payload.description,
        website=payload.website,
        contact_email=payload.contact_email,
        logo_url=payload.logo_url,
        category=payload.category,
        is_verified=True,
        owner_id=current_user.id
    )
    db.add(org)
    db.commit()
    db.refresh(org)

    AuditService.record_mutation(
        db=db,
        actor_id=current_user.id,
        action="organization_registered",
        entity_type="organization",
        entity_id=org.id,
        payload={"name": org.name, "slug": org.slug}
    )
    db.commit()

    return OrganizationResponse(
        id=org.id,
        name=org.name,
        slug=org.slug,
        description=org.description,
        website=org.website,
        contact_email=org.contact_email,
        logo_url=org.logo_url,
        category=org.category or "university",
        is_verified=org.is_verified,
        owner_id=org.owner_id,
        events_count=0,
        created_at=org.created_at
    )


@router.get("/{org_id}")
def get_organization_detail(org_id: str, db: Session = Depends(get_db)):
    """Fetch organization details along with summary of its arenas."""
    org = db.execute(select(Organization).filter_by(id=org_id)).scalars().first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")

    events = db.execute(select(Event).filter_by(organization_id=org.id).order_by(Event.created_at.desc())).scalars().all()
    events_data = []
    for ev in events:
        part_count = db.execute(select(func.count(Participant.id)).filter_by(event_id=ev.id)).scalar() or 0
        squad_count = db.execute(select(func.count(Team.id)).filter_by(event_id=ev.id)).scalar() or 0
        sub_count = db.execute(select(func.count(Submission.id)).filter_by(event_id=ev.id)).scalar() or 0
        events_data.append({
            "id": ev.id,
            "slug": ev.slug,
            "title": ev.title,
            "status": ev.status,
            "starts_at": ev.starts_at,
            "ends_at": ev.ends_at,
            "submission_deadline": ev.submission_deadline,
            "participants_count": part_count,
            "squads_count": squad_count,
            "submissions_count": sub_count,
            "format_config": ev.format_config
        })

    return {
        "id": org.id,
        "name": org.name,
        "slug": org.slug,
        "description": org.description,
        "website": org.website,
        "contact_email": org.contact_email,
        "logo_url": org.logo_url,
        "category": org.category,
        "is_verified": org.is_verified,
        "owner_id": org.owner_id,
        "events": events_data,
        "created_at": org.created_at
    }


@router.post("/{org_id}/events")
def create_event_for_org(
    org_id: str,
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Host a new hackathon arena under an organization."""
    org = db.execute(select(Organization).filter_by(id=org_id)).scalars().first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found.")

    slug = payload.get("slug")
    title = payload.get("title")
    if not slug or not title:
        raise HTTPException(status_code=400, detail="Slug and title are required.")

    # Create event
    event_payload = EventCreate(
        slug=slug,
        title=title,
        description=payload.get("description", ""),
        format_type=payload.get("format_type", "offline_24h"),
        starts_at=payload.get("starts_at"),
        ends_at=payload.get("ends_at"),
        submission_deadline=payload.get("submission_deadline"),
        grace_period_minutes=payload.get("grace_period_minutes", 20)
    )
    event = EventService.create_event(db, event_payload, actor_id=current_user.id)
    event.organization_id = org.id
    event.status = payload.get("status", "published")

    # Format config
    format_config = payload.get("format_config") or {}
    format_config["organization"] = org.name
    format_config["organization_badge"] = org.category.capitalize()
    event.format_config = format_config

    # Assign current user as organizer
    AuthService.assign_role(db, event.id, current_user.id, "organizer", actor_id=current_user.id)

    # Optional initial problem statements
    ps_list = payload.get("problem_statements") or []
    for item in ps_list:
        ps = ProblemStatement(
            event_id=event.id,
            title=item.get("title", "Open Track Challenge"),
            track=item.get("track", "General Track"),
            description=item.get("description", "Solve this challenge"),
            requirements=item.get("requirements", []),
            rules=item.get("rules", "Standard rules apply"),
            reveal_at=event.starts_at or utcnow(),
            is_revealed=bool(payload.get("status") == "ongoing")
        )
        db.add(ps)

    db.commit()
    db.refresh(event)

    AuditService.record_mutation(
        db=db,
        actor_id=current_user.id,
        action="event_hosted_by_organization",
        entity_type="event",
        entity_id=event.id,
        payload={"organization_id": org.id, "title": event.title},
        event_id=event.id
    )
    db.commit()

    return {
        "message": f"Arena '{event.title}' successfully hosted by {org.name}!",
        "event_id": event.id,
        "slug": event.slug,
        "status": event.status
    }


@router.patch("/{org_id}/events/{event_id}")
def update_org_event_controls(
    org_id: str,
    event_id: str,
    payload: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manage hackathon live controls: status, lock submissions, unseal problem statements."""
    event = db.execute(select(Event).filter_by(id=event_id, organization_id=org_id)).scalars().first()
    if not event:
        raise HTTPException(status_code=404, detail="Hackathon arena not found under this organization.")

    if "status" in payload:
        event.status = payload["status"]
    if "is_submissions_locked" in payload:
        event.is_submissions_locked = bool(payload["is_submissions_locked"])
    if "is_teams_locked" in payload:
        event.is_teams_locked = bool(payload["is_teams_locked"])
    if "unseal_all_ps" in payload and payload["unseal_all_ps"]:
        statements = db.execute(select(ProblemStatement).filter_by(event_id=event.id)).scalars().all()
        for ps in statements:
            ps.is_revealed = True

    AuditService.record_mutation(
        db=db,
        actor_id=current_user.id,
        action="org_event_controls_updated",
        entity_type="event",
        entity_id=event.id,
        payload=payload,
        event_id=event.id
    )
    db.commit()

    return {
        "message": "Hackathon live controls updated successfully.",
        "event_id": event.id,
        "status": event.status,
        "is_submissions_locked": event.is_submissions_locked
    }
