"""Export service generating CSV, XLSX, and PDF reports with PII masking and audit logging."""
import io
import csv
import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import select
from openpyxl import Workbook
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from backend.app.models.entities import (
    Event, Participant, Team, Checkin, Submission, AuditLog, ExportJob, utcnow
)
from backend.app.crypto import decrypt_field, mask_email, mask_phone
from backend.app.services.audit_service import AuditService
from backend.app.services.judging_service import JudgingService


class ExportService:
    @classmethod
    def export_csv(
        cls,
        db: Session,
        event_id: str,
        export_type: str,
        actor_id: str,
        allow_unmasked_pii: bool = False
    ) -> str:
        """Generate CSV export stream while strictly enforcing PII masking rules and auditing."""
        output = io.StringIO()
        writer = csv.writer(output)

        if export_type == "participants":
            writer.writerow(["ID", "Name", "Email", "Phone", "College", "Status", "Squad ID", "Fallback Code"])
            parts = db.execute(select(Participant).filter_by(event_id=event_id)).scalars().all()
            for p in parts:
                em = decrypt_field(p.email_enc)
                ph = decrypt_field(p.phone_enc)
                col = decrypt_field(p.college_enc) or ""
                writer.writerow([
                    p.id,
                    p.name,
                    em if allow_unmasked_pii else mask_email(em),
                    ph if allow_unmasked_pii else mask_phone(ph),
                    col,
                    p.status,
                    p.squad_id or "",
                    p.short_fallback_code
                ])

        elif export_type == "squads":
            writer.writerow(["Squad ID", "Name", "Tagline", "Join Code", "Track", "Locked", "Members Count"])
            teams = db.execute(select(Team).filter_by(event_id=event_id)).scalars().all()
            for t in teams:
                writer.writerow([
                    t.id, t.name, t.tagline or "", t.join_code, t.track or "", t.is_locked, len(t.memberships)
                ])

        elif export_type == "attendance":
            writer.writerow(["Checkin ID", "Participant ID", "Station", "Method", "Device", "Status", "Server Time"])
            checkins = db.execute(select(Checkin).filter_by(event_id=event_id)).scalars().all()
            for c in checkins:
                writer.writerow([
                    c.id, c.participant_id, c.station, c.method, c.device_id, c.status, c.server_at.isoformat()
                ])

        elif export_type == "scores":
            writer.writerow(["Rank", "Squad ID", "Squad Name", "Track", "Raw Score", "Normalized Score", "Review Count", "Outlier"])
            leaderboard = JudgingService.calculate_leaderboard(db, event_id, blind=False)
            for entry in leaderboard:
                writer.writerow([
                    entry.rank, entry.team_id, entry.team_name, entry.track or "",
                    entry.raw_average, entry.normalized_score, entry.review_count, entry.outlier_flag
                ])

        elif export_type == "audit":
            writer.writerow(["Block ID", "Timestamp", "Actor ID", "Action", "Entity Type", "Entity ID", "Prev Hash", "Block Hash"])
            logs = db.execute(select(AuditLog).filter_by(event_id=event_id).order_by(AuditLog.timestamp.asc())).scalars().all()
            for l in logs:
                writer.writerow([
                    l.id, l.timestamp.isoformat(), l.actor_id, l.action, l.entity_type, l.entity_id, l.prev_hash, l.hash
                ])

        # Record export mutation in audit log
        AuditService.record_mutation(
            db=db,
            actor_id=actor_id,
            action=f"export_generated_{export_type}",
            entity_type="export",
            entity_id=event_id,
            payload={"export_type": export_type, "format": "csv", "allow_unmasked_pii": allow_unmasked_pii},
            event_id=event_id
        )
        db.commit()
        return output.getvalue()

    @classmethod
    def export_xlsx(
        cls,
        db: Session,
        event_id: str,
        actor_id: str,
        allow_unmasked_pii: bool = False
    ) -> bytes:
        """Generate comprehensive multi-tab XLSX workbook."""
        wb = Workbook()

        # Tab 1: Crew
        ws_crew = wb.active
        ws_crew.title = "Crew"
        ws_crew.append(["ID", "Name", "Email", "Phone", "College", "Status", "Squad ID"])
        parts = db.execute(select(Participant).filter_by(event_id=event_id)).scalars().all()
        for p in parts:
            em = decrypt_field(p.email_enc)
            ph = decrypt_field(p.phone_enc)
            ws_crew.append([
                p.id, p.name,
                em if allow_unmasked_pii else mask_email(em),
                ph if allow_unmasked_pii else mask_phone(ph),
                decrypt_field(p.college_enc) or "",
                p.status, p.squad_id or ""
            ])

        # Tab 2: Squads
        ws_squads = wb.create_sheet(title="Squads")
        ws_squads.append(["Squad ID", "Name", "Tagline", "Join Code", "Track", "Members"])
        teams = db.execute(select(Team).filter_by(event_id=event_id)).scalars().all()
        for t in teams:
            ws_squads.append([t.id, t.name, t.tagline or "", t.join_code, t.track or "", len(t.memberships)])

        # Tab 3: Flight Review Scores
        ws_scores = wb.create_sheet(title="Flight Review Leaderboard")
        ws_scores.append(["Rank", "Squad Name", "Track", "Raw Score", "Normalized Score", "Reviews", "Outlier"])
        leaderboard = JudgingService.calculate_leaderboard(db, event_id, blind=False)
        for entry in leaderboard:
            ws_scores.append([
                entry.rank, entry.team_name, entry.track or "",
                entry.raw_average, entry.normalized_score, entry.review_count, "YES" if entry.outlier_flag else "NO"
            ])

        stream = io.BytesIO()
        wb.save(stream)

        AuditService.record_mutation(
            db=db,
            actor_id=actor_id,
            action="export_generated_xlsx",
            entity_type="export",
            entity_id=event_id,
            payload={"format": "xlsx", "allow_unmasked_pii": allow_unmasked_pii},
            event_id=event_id
        )
        db.commit()
        return stream.getvalue()

    @classmethod
    def export_pdf_debrief(
        cls,
        db: Session,
        event_id: str,
        actor_id: str
    ) -> bytes:
        """Generate printable PDF Mission Debrief report with executive summary and top winners."""
        event = db.execute(select(Event).filter_by(id=event_id)).scalars().first()
        leaderboard = JudgingService.calculate_leaderboard(db, event_id, blind=False)

        stream = io.BytesIO()
        doc = SimpleDocTemplate(stream, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            name="TitleStyle",
            parent=styles["Heading1"],
            fontSize=22,
            leading=26,
            textColor=colors.HexColor("#06B6D4")
        )
        subtitle_style = ParagraphStyle(
            name="SubtitleStyle",
            parent=styles["Normal"],
            fontSize=11,
            leading=14,
            textColor=colors.HexColor("#64748B")
        )

        elements = []
        elements.append(Paragraph(f"HACKOS MISSION DEBRIEF: {event.title if event else 'Hackathon'}", title_style))
        elements.append(Paragraph(f"Generated: {utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')} | Mission Status: Completed", subtitle_style))
        elements.append(Spacer(1, 15))

        # Top Squads Table
        table_data = [["Rank", "Squad Name", "Track", "Raw Score", "Normalized Score", "Status"]]
        for entry in leaderboard[:10]:
            table_data.append([
                str(entry.rank),
                entry.team_name,
                entry.track or "General",
                f"{entry.raw_average:.2f}",
                f"{entry.normalized_score:.2f}",
                "Podium Finish" if entry.rank <= 3 else "Finalist"
            ])

        t = Table(table_data, colWidths=[40, 160, 110, 70, 90, 70])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0F172A")),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")])
        ]))
        elements.append(t)

        doc.build(elements)

        AuditService.record_mutation(
            db=db,
            actor_id=actor_id,
            action="export_generated_pdf_debrief",
            entity_type="export",
            entity_id=event_id,
            payload={"format": "pdf"},
            event_id=event_id
        )
        db.commit()
        return stream.getvalue()
