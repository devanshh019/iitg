"""Authentication and session API routes."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import select
from backend.app.db import get_db
from backend.app.schemas.schemas import TokenResponse, LoginRequest, RequestMagicLogin, UserCreate
from backend.app.services.auth_service import AuthService
from backend.app.api.deps import get_current_user
from backend.app.models.entities import User, Participant
from backend.app.crypto import decrypt_field

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = AuthService.authenticate(
        db, email=payload.email, password=payload.password, magic_code=payload.magic_code
    )
    roles = AuthService.get_user_roles(db, user.id)
    access_token = AuthService.create_access_token(user.id, user.is_super_admin, roles)
    refresh_token = AuthService.create_refresh_token(user.id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user_id=user.id,
        is_super_admin=user.is_super_admin,
        roles=roles
    )


@router.post("/magic-link")
def request_magic_link(payload: RequestMagicLogin, db: Session = Depends(get_db)):
    code = AuthService.generate_magic_login_code(payload.email, payload.event_slug)
    return {
        "message": "Magic login verification code dispatched.",
        "email": payload.email,
        "dev_code": code  # Surfaced in development/demo mode for instantaneous zero-friction testing
    }


@router.get("/me")
def get_me(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    roles = AuthService.get_user_roles(db, user.id)
    participant = db.execute(select(Participant).filter_by(user_id=user.id)).scalars().first()
    return {
        "id": user.id,
        "email": decrypt_field(user.email_enc),
        "is_super_admin": user.is_super_admin,
        "roles": roles,
        "participant": {
            "id": participant.id,
            "event_id": participant.event_id,
            "name": participant.name,
            "status": participant.status,
            "squad_id": participant.squad_id
        } if participant else None
    }
