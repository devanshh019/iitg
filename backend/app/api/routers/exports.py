"""Export endpoints for CSV, XLSX, and PDF reports."""
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import select
from backend.app.db import get_db
from backend.app.models.entities import User, EventRole
from backend.app.services.export_service import ExportService
from backend.app.api.deps import get_current_user, require_event_role

router = APIRouter(prefix="/events/{event_id}/exports", tags=["Reports & Exports"])


@router.get("/csv")
def export_csv(
    event_id: str,
    export_type: str = Query(..., description="participants, squads, attendance, scores, audit"),
    current_user: User = Depends(require_event_role(["organizer", "super_admin"])),
    db: Session = Depends(get_db)
):
    csv_data = ExportService.export_csv(
        db=db,
        event_id=event_id,
        export_type=export_type,
        actor_id=current_user.id,
        allow_unmasked_pii=True
    )
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=hackos_{event_id}_{export_type}.csv"}
    )


@router.get("/xlsx")
def export_xlsx(
    event_id: str,
    current_user: User = Depends(require_event_role(["organizer", "super_admin"])),
    db: Session = Depends(get_db)
):
    xlsx_bytes = ExportService.export_xlsx(
        db=db,
        event_id=event_id,
        actor_id=current_user.id,
        allow_unmasked_pii=True
    )
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=hackos_{event_id}_master.xlsx"}
    )


@router.get("/pdf/debrief")
def export_pdf_debrief(
    event_id: str,
    current_user: User = Depends(require_event_role(["organizer", "super_admin"])),
    db: Session = Depends(get_db)
):
    pdf_bytes = ExportService.export_pdf_debrief(
        db=db,
        event_id=event_id,
        actor_id=current_user.id
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=hackos_{event_id}_mission_debrief.pdf"}
    )
