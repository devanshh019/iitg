"""API Dependencies: Database sessions, JWT authentication, and Event-Scoped RBAC enforcement."""
from typing import Optional, List, Callable
from fastapi import Depends, HTTPException, status, Header, Path
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import select
from backend.app.db import get_db
from backend.app.models.entities import User, EventRole, Participant
from backend.app.services.auth_service import AuthService

security = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Extract and validate the currently authenticated user from Bearer JWT."""
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization bearer token"
        )
    payload = AuthService.decode_token(credentials.credentials)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject")

    user = db.execute(select(User).filter_by(id=user_id, is_active=True)).scalars().first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive")
    return user


def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    """Enforce super_admin platform privilege."""
    if not current_user.is_super_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin access required."
        )
    return current_user


def require_event_role(allowed_roles: List[str]):
    """Enforce event-scoped RBAC roles (super_admin, organizer, volunteer, mentor, judge, participant)."""
    def dependency(
        event_id: str = Path(...),
        current_user: User = Depends(get_current_user),
        db: Session = Depends(get_db)
    ) -> User:
        # Super admin always has access
        if current_user.is_super_admin:
            return current_user

        roles = db.execute(
            select(EventRole).filter_by(event_id=event_id, user_id=current_user.id)
        ).scalars().all()
        user_role_names = {r.role for r in roles}

        # Organizers can usually do volunteer tasks as well
        if "organizer" in user_role_names and any(r in ["volunteer", "organizer"] for r in allowed_roles):
            return current_user

        if not any(r in allowed_roles for r in user_role_names):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Action requires one of roles: {allowed_roles}. You have: {list(user_role_names)}"
            )
        return current_user

    return dependency
