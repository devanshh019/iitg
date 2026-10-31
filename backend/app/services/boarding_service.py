"""Boarding (Check-in) service with Ed25519 offline QR verification, idempotent batch sync, and station metrics."""
import datetime
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_
from fastapi import HTTPException
from backend.app.models.entities import Event, Participant, Checkin, SyncOp, utcnow
from backend.app.schemas.schemas import CheckinScan, CheckinResult, StationThroughput
from backend.app.crypto import sign_boarding_token, verify_boarding_token, decrypt_field
from backend.app.services.audit_service import AuditService


class BoardingService:
    @classmethod
    def generate_participant_qr_token(cls, db: Session, event_id: str, participant_id: str) -> Dict[str, Any]:
        """Generate an Ed25519 signed QR token and short fallback code for a participant."""
        event = db.execute(select(Event).filter_by(id=event_id)).scalars().first()
        participant = db.execute(select(Participant).filter_by(id=participant_id, event_id=event_id)).scalars().first()

        if not event or not participant:
            raise HTTPException(status_code=404, detail="Mission or crew member not found.")

        priv_b64 = decrypt_field(event.ed25519_private_key_enc)
        expiry = (event.ends_at or (utcnow() + datetime.timedelta(days=3))).isoformat()

        token_payload = {
            "p_id": participant.id,
            "e_id": event.id,
            "name": participant.name,
            "exp": expiry,
            "code": participant.short_fallback_code
        }
        signed_token = sign_boarding_token(priv_b64, token_payload)

        return {
            "token": signed_token,
            "short_fallback_code": participant.short_fallback_code,
            "public_key": event.ed25519_public_key,
            "expires_at": expiry,
            "participant_name": participant.name,
            "status": participant.status
        }

    @classmethod
    def resolve_token_or_code(cls, db: Session, event: Event, token_or_code: str) -> Tuple[Optional[Participant], str]:
        """Verify token offline/online or fallback code."""
        # Try Ed25519 verification first
        is_valid, data = verify_boarding_token(event.ed25519_public_key, token_or_code)
        if is_valid and data and data.get("p_id"):
            part = db.execute(select(Participant).filter_by(id=data["p_id"], event_id=event.id)).scalars().first()
            if part:
                return part, "qr"

        # Fallback to 6-char short fallback code or participant ID
        part = db.execute(select(Participant).filter(
            Participant.event_id == event.id,
            (Participant.short_fallback_code == token_or_code.strip().upper()) | (Participant.id == token_or_code.strip())
        )).scalars().first()
        if part:
            return part, "fallback_code"

        return None, "invalid"

    @classmethod
    def process_sync_batch(
        cls,
        db: Session,
        event_id: str,
        device_id: str,
        scans: List[CheckinScan],
        actor_id: str
    ) -> List[CheckinResult]:
        """Idempotent batch processing of scans queued offline on scanner PWAs."""
        event = db.execute(select(Event).filter_by(id=event_id)).scalars().first()
        if not event:
            raise HTTPException(status_code=404, detail="Mission not found.")

        results: List[CheckinResult] = []

        for scan in scans:
            # Check Idempotency by op_id
            existing_sync = db.execute(select(SyncOp).filter_by(op_id=scan.op_id)).scalars().first()
            if existing_sync:
                res = existing_sync.result_payload
                results.append(CheckinResult(
                    op_id=scan.op_id,
                    participant_id=res.get("participant_id"),
                    participant_name=res.get("participant_name"),
                    status=res.get("status", "ACCEPTED"),
                    station=res.get("station", scan.station),
                    claimed_at=scan.claimed_at,
                    server_at=existing_sync.processed_at,
                    message=f"Idempotent response for previously processed scan: {res.get('message', '')}"
                ))
                continue

            # Resolve participant
            part, method = cls.resolve_token_or_code(db, event, scan.participant_token_or_code)
            server_now = utcnow()

            if not part:
                sync_op = SyncOp(
                    op_id=scan.op_id,
                    device_id=device_id,
                    station=scan.station,
                    status="INVALID",
                    result_payload={"status": "INVALID", "message": "Invalid boarding pass or QR code signature."}
                )
                db.add(sync_op)
                db.commit()
                results.append(CheckinResult(
                    op_id=scan.op_id,
                    participant_id=None,
                    participant_name=None,
                    status="INVALID",
                    station=scan.station,
                    claimed_at=scan.claimed_at,
                    server_at=server_now,
                    message="Invalid boarding pass or QR code signature."
                ))
                continue

            # Station rules: meals can have multi-scans; others are once per participant
            is_multi = scan.station in ["meals", "ration"]
            existing_checkin = db.execute(
                select(Checkin).filter(
                    Checkin.event_id == event_id,
                    Checkin.participant_id == part.id,
                    Checkin.station == scan.station,
                    Checkin.status == "ACCEPTED"
                )
            ).scalars().first()

            if existing_checkin and not is_multi:
                # First accepted scan wins; later scans flagged DUPLICATE, never deleted.
                dup_checkin = Checkin(
                    event_id=event_id,
                    participant_id=part.id,
                    station=scan.station,
                    method=scan.method or method,
                    device_id=device_id,
                    op_id=scan.op_id,
                    claimed_at=scan.claimed_at,
                    server_at=server_now,
                    synced_from_offline=True,
                    status="DUPLICATE"
                )
                db.add(dup_checkin)
                msg = f"Duplicate boarding scan at {scan.station}. Original boarding logged at {existing_checkin.server_at.isoformat()}."
                status_res = "DUPLICATE"
            else:
                accepted_checkin = Checkin(
                    event_id=event_id,
                    participant_id=part.id,
                    station=scan.station,
                    method=scan.method or method,
                    device_id=device_id,
                    op_id=scan.op_id,
                    claimed_at=scan.claimed_at,
                    server_at=server_now,
                    synced_from_offline=True,
                    status="ACCEPTED"
                )
                db.add(accepted_checkin)
                if scan.station == "entry":
                    part.status = "boarded"
                msg = f"Boarding approved at {scan.station}. Welcome aboard, {part.name}!"
                status_res = "ACCEPTED"

            # Record sync operation for idempotency
            res_dict = {
                "participant_id": part.id,
                "participant_name": part.name,
                "status": status_res,
                "station": scan.station,
                "message": msg
            }
            sync_op = SyncOp(
                op_id=scan.op_id,
                device_id=device_id,
                station=scan.station,
                status=status_res,
                result_payload=res_dict
            )
            db.add(sync_op)

            # Write Audit record
            AuditService.record_mutation(
                db=db,
                actor_id=actor_id,
                action=f"boarding_{status_res.lower()}",
                entity_type="checkin",
                entity_id=scan.op_id,
                payload={
                    "participant_id": part.id,
                    "station": scan.station,
                    "status": status_res,
                    "device_id": device_id,
                    "claimed_at": scan.claimed_at.isoformat(),
                    "server_at": server_now.isoformat()
                },
                event_id=event_id
            )
            db.commit()

            results.append(CheckinResult(
                op_id=scan.op_id,
                participant_id=part.id,
                participant_name=part.name,
                status=status_res,
                station=scan.station,
                claimed_at=scan.claimed_at,
                server_at=server_now,
                message=msg
            ))

        return results

    @classmethod
    def get_station_throughput(cls, db: Session, event_id: str) -> List[StationThroughput]:
        """Aggregate throughput and statistics per station."""
        stations = ["entry", "meals", "swag", "workshop", "final_presentation"]
        throughput_list = []

        for st in stations:
            total = db.execute(select(func.count(Checkin.id)).filter_by(event_id=event_id, station=st)).scalar() or 0
            accepted = db.execute(select(func.count(Checkin.id)).filter_by(event_id=event_id, station=st, status="ACCEPTED")).scalar() or 0
            duplicate = total - accepted
            last_scan = db.execute(
                select(Checkin.server_at).filter_by(event_id=event_id, station=st).order_by(Checkin.server_at.desc()).limit(1)
            ).scalar()

            throughput_list.append(StationThroughput(
                station=st,
                total_scans=total,
                accepted_scans=accepted,
                duplicate_scans=duplicate,
                last_scan_time=last_scan
            ))
        return throughput_list
