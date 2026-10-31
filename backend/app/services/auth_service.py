"""Authentication and RBAC service supporting Argon2, JWT tokens, OTP/Magic Links, and Event Roles."""
import datetime
import random
import string
from typing import Optional, Dict, Any, List
import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import HTTPException, status
from backend.app.config import settings
from backend.app.models.entities import User, EventRole, Participant, utcnow
from backend.app.crypto import encrypt_field, decrypt_field, deterministic_hash, normalize_email
from backend.app.services.audit_service import AuditService

ph = PasswordHasher()


class AuthService:
    # In-memory OTP storage for magic logins: email_hash -> (code, expiry, event_slug)
    _otp_store: Dict[str, tuple[str, datetime.datetime, Optional[str]]] = {}

    @classmethod
    def hash_password(cls, password: str) -> str:
        return ph.hash(password)

    @classmethod
    def verify_password(cls, password: str, password_hash: str) -> bool:
        try:
            return ph.verify(password_hash, password)
        except (VerifyMismatchError, Exception):
            return False

    @classmethod
    def create_access_token(cls, user_id: str, is_super_admin: bool = False, roles: List[Dict[str, str]] = None) -> str:
        exp = utcnow() + datetime.timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        payload = {
            "sub": user_id,
            "is_super_admin": is_super_admin,
            "roles": roles or [],
            "exp": exp,
            "type": "access"
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    @classmethod
    def create_refresh_token(cls, user_id: str) -> str:
        exp = utcnow() + datetime.timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        payload = {
            "sub": user_id,
            "exp": exp,
            "type": "refresh"
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    @classmethod
    def decode_token(cls, token: str) -> Dict[str, Any]:
        try:
            return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    @classmethod
    def get_user_roles(cls, db: Session, user_id: str) -> List[Dict[str, str]]:
        query = select(EventRole).filter_by(user_id=user_id)
        roles = db.execute(query).scalars().all()
        return [{"event_id": r.event_id, "role": r.role} for r in roles]

    @classmethod
    def register_or_get_user(
        cls,
        db: Session,
        email: str,
        password: Optional[str] = None,
        is_super_admin: bool = False,
        actor_id: Optional[str] = None
    ) -> User:
        norm_email = normalize_email(email)
        em_hash = deterministic_hash(norm_email)
        user = db.execute(select(User).filter_by(email_hash=em_hash)).scalars().first()

        if user:
            if password and not user.password_hash:
                user.password_hash = cls.hash_password(password)
                db.commit()
            return user

        new_user = User(
            email_enc=encrypt_field(norm_email),
            email_hash=em_hash,
            password_hash=cls.hash_password(password) if password else None,
            is_super_admin=is_super_admin
        )
        db.add(new_user)
        db.flush()

        # Audit mutation
        AuditService.record_mutation(
            db=db,
            actor_id=actor_id or new_user.id,
            action="user_created",
            entity_type="user",
            entity_id=new_user.id,
            payload={"email_hash": em_hash, "is_super_admin": is_super_admin}
        )
        db.commit()
        return new_user

    @classmethod
    def authenticate(cls, db: Session, email: str, password: Optional[str] = None, magic_code: Optional[str] = None) -> User:
        norm_email = normalize_email(email)
        em_hash = deterministic_hash(norm_email)
        user = db.execute(select(User).filter_by(email_hash=em_hash)).scalars().first()

        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

        if magic_code:
            stored = cls._otp_store.get(em_hash)
            if not stored:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No active login code found or expired")
            code, exp, _ = stored
            if utcnow() > exp or code != magic_code:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired magic code")
            # Consume OTP
            del cls._otp_store[em_hash]
            return user

        if not password or not user.password_hash or not cls.verify_password(password, user.password_hash):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

        return user

    @classmethod
    def generate_magic_login_code(cls, email: str, event_slug: Optional[str] = None) -> str:
        norm_email = normalize_email(email)
        em_hash = deterministic_hash(norm_email)
        code = "".join(random.choices(string.digits, k=6))
        expiry = utcnow() + datetime.timedelta(minutes=15)
        cls._otp_store[em_hash] = (code, expiry, event_slug)
        # Log for dev/local testing
        print(f"[AUTH OTP] Magic login code for {email}: {code} (expires in 15m)")
        return code

    @classmethod
    def assign_role(cls, db: Session, event_id: str, user_id: str, role: str, actor_id: str) -> EventRole:
        allowed = {"super_admin", "organizer", "volunteer", "mentor", "judge", "participant"}
        if role not in allowed:
            raise HTTPException(status_code=400, detail=f"Invalid role: {role}")

        existing = db.execute(
            select(EventRole).filter_by(event_id=event_id, user_id=user_id, role=role)
        ).scalars().first()
        if existing:
            return existing

        event_role = EventRole(event_id=event_id, user_id=user_id, role=role)
        db.add(event_role)
        db.flush()

        AuditService.record_mutation(
            db=db,
            actor_id=actor_id,
            action="role_assigned",
            entity_type="event_role",
            entity_id=event_role.id,
            payload={"event_id": event_id, "user_id": user_id, "role": role},
            event_id=event_id
        )
        db.commit()
        return event_role
