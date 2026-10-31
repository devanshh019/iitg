"""Test configuration and shared fixtures."""
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.app.config import settings
from backend.app.db import Base, get_db
from backend.app.main import app
from backend.app.models.entities import User, Event, EventRole, Participant
from backend.app.services.auth_service import AuthService
from backend.app.services.event_service import EventService
from backend.app.schemas.schemas import EventCreate

# Test Database engine
test_engine = create_engine(settings.TEST_DATABASE_URL, pool_pre_ping=True)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)
    yield
    # cleanup after session if needed


@pytest.fixture
def db_session():
    session = TestingSessionLocal()
    yield session
    session.rollback()
    session.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def test_event(db_session):
    admin = AuthService.register_or_get_user(db_session, "admin@test.io", "Pass123!", is_super_admin=True)
    payload = EventCreate(
        slug=f"test-mission-{os.urandom(4).hex()}",
        title="Test Mission Apollo",
        description="Automated test mission",
        format_type="offline_24h"
    )
    event = EventService.create_event(db_session, payload, actor_id=admin.id)
    return event


@pytest.fixture
def auth_headers(db_session, test_event):
    admin = AuthService.register_or_get_user(db_session, "admin_user@test.io", "Pass123!", is_super_admin=True)
    org = AuthService.register_or_get_user(db_session, "org_user@test.io", "Pass123!")
    judge = AuthService.register_or_get_user(db_session, "judge_user@test.io", "Pass123!")
    crew = AuthService.register_or_get_user(db_session, "crew_user@test.io", "Pass123!")

    AuthService.assign_role(db_session, test_event.id, org.id, "organizer", admin.id)
    AuthService.assign_role(db_session, test_event.id, judge.id, "judge", admin.id)
    AuthService.assign_role(db_session, test_event.id, crew.id, "participant", admin.id)

    def _headers(user_id, is_admin=False, role="participant"):
        token = AuthService.create_access_token(user_id, is_super_admin=is_admin, roles=[{"event_id": test_event.id, "role": role}])
        return {"Authorization": f"Bearer {token}"}

    return {
        "admin": _headers(admin.id, is_admin=True, role="super_admin"),
        "organizer": _headers(org.id, role="organizer"),
        "judge": _headers(judge.id, role="judge"),
        "crew": _headers(crew.id, role="participant"),
        "admin_user": admin,
        "org_user": org,
        "judge_user": judge,
        "crew_user": crew
    }
