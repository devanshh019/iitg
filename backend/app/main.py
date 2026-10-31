"""HACKOS FastAPI Application Entrypoint."""
import time
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from backend.app.config import settings
from backend.app.db import engine, Base
from backend.app.api.routers import (
    auth, events, participants, teams, boarding, submissions, judging, audit, exports, announcements, fun
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Auto-create tables on startup if not existing
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="HACKOS Mission Control API",
    description="Production-grade Hackathon Operating System API with offline-first boarding, cryptographic hash audit, and flight review.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Security Headers & Structured Request ID Middleware
@app.middleware("http")
async def security_and_tracing_middleware(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    request.state.request_id = request_id
    start_time = time.time()

    response: Response = await call_next(request)

    duration = round((time.time() - start_time) * 1000, 2)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time-Ms"] = str(duration)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    # Log structured access (exclude health check spam)
    if not request.url.path.startswith("/health"):
        print(f'{{"time": "{time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}", "request_id": "{request_id}", "method": "{request.method}", "path": "{request.url.path}", "status": {response.status_code}, "duration_ms": {duration}}}')

    return response


# Health & Readiness checks
@app.get("/health")
def health_check():
    """Liveness probe for Render, Vercel, and GitHub Action keep-warm cron."""
    return {
        "status": "healthy",
        "service": "HACKOS Mission Control API",
        "environment": settings.ENVIRONMENT,
        "version": "1.0.0"
    }


@app.get("/ready")
def readiness_check():
    """Readiness probe checking database connectivity."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ready", "database": "connected"}
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={"status": "not_ready", "error": str(e)}
        )


# Register API Routers
app.include_router(auth.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(participants.router, prefix="/api")
app.include_router(teams.router, prefix="/api")
app.include_router(boarding.router, prefix="/api")
app.include_router(submissions.router, prefix="/api")
app.include_router(judging.router, prefix="/api")
app.include_router(audit.router, prefix="/api")
app.include_router(exports.router, prefix="/api")
app.include_router(announcements.router, prefix="/api")
app.include_router(fun.router, prefix="/api")
