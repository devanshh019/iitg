"""Audit log integrity verification and activity feed API routes."""
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import select
from backend.app.db import get_db
from backend.app.models.entities import AuditLog, User
from backend.app.schemas.schemas import AuditVerifyReport
from backend.app.services.audit_service import AuditService
from backend.app.api.deps import require_event_role

router = APIRouter(prefix="/audit", tags=["Audit Ledger"])


@router.get("/verify", response_model=AuditVerifyReport)
def verify_audit_chain(
    event_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Recomputes SHA-256 hash chain from genesis to tip, verifying unbroken ledger integrity."""
    return AuditService.verify_chain(db, event_id=event_id)


@router.get("/feed")
def get_activity_feed(
    event_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Live activity feed for Mission Control dashboard."""
    query = select(AuditLog)
    if event_id:
        query = query.filter_by(event_id=event_id)
    query = query.order_by(AuditLog.timestamp.desc()).limit(limit)
    logs = db.execute(query).scalars().all()

    return [
        {
            "id": l.id,
            "action": l.action,
            "actor_id": l.actor_id,
            "entity_type": l.entity_type,
            "entity_id": l.entity_id,
            "timestamp": l.timestamp,
            "hash": l.hash[:12] + "..."
        } for l in logs
    ]
