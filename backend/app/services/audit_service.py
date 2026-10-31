"""Audit ledger service maintaining an append-only, SHA-256 hash-chained audit trail."""
import json
import datetime
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import select, asc
from backend.app.models.entities import AuditLog, utcnow
from backend.app.crypto import sha256_digest
from backend.app.schemas.schemas import AuditVerifyReport

GENESIS_HASH = "0" * 64


class AuditService:
    @staticmethod
    def record_mutation(
        db: Session,
        actor_id: str,
        action: str,
        entity_type: str,
        entity_id: str,
        payload: Dict[str, Any],
        event_id: Optional[str] = None
    ) -> AuditLog:
        """Record a write operation into the append-only, hash-chained audit ledger."""
        # Find latest entry in the event chain (or global chain)
        query = select(AuditLog)
        if event_id:
            query = query.filter_by(event_id=event_id)
        query = query.order_by(AuditLog.timestamp.desc(), AuditLog.id.desc()).limit(1)
        last_entry = db.execute(query).scalars().first()

        prev_hash = last_entry.hash if last_entry else GENESIS_HASH
        timestamp = utcnow()
        timestamp_str = timestamp.astimezone(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")

        # Deterministic JSON representation
        payload_json = json.dumps(payload, sort_keys=True, separators=(',', ':'))

        # Calculate block hash
        hash_preimage = f"{prev_hash}|{actor_id}|{action}|{entity_type}|{entity_id}|{timestamp_str}|{payload_json}"
        row_hash = sha256_digest(hash_preimage)

        audit_entry = AuditLog(
            event_id=event_id,
            actor_id=actor_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            payload=payload,
            prev_hash=prev_hash,
            hash=row_hash,
            timestamp=timestamp
        )
        db.add(audit_entry)
        db.flush()
        return audit_entry

    @staticmethod
    def verify_chain(db: Session, event_id: Optional[str] = None) -> AuditVerifyReport:
        """Verify the integrity of the audit hash chain from genesis to tip."""
        query = select(AuditLog)
        if event_id:
            query = query.filter_by(event_id=event_id)
        query = query.order_by(asc(AuditLog.timestamp), asc(AuditLog.id))
        entries: List[AuditLog] = db.execute(query).scalars().all()

        if not entries:
            return AuditVerifyReport(
                is_valid=True,
                total_entries=0,
                message="Audit chain is empty and valid."
            )

        expected_prev_hash = GENESIS_HASH
        for idx, entry in enumerate(entries):
            # Check link to previous hash
            if entry.prev_hash != expected_prev_hash:
                return AuditVerifyReport(
                    is_valid=False,
                    total_entries=len(entries),
                    tampered_index=idx,
                    tampered_entry_id=entry.id,
                    message=f"Broken hash link at block {idx} (ID: {entry.id}). Expected prev {expected_prev_hash}, found {entry.prev_hash}."
                )

            # Recompute row hash
            payload_json = json.dumps(entry.payload, sort_keys=True, separators=(',', ':'))
            timestamp_str = entry.timestamp.astimezone(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")
            preimage = f"{entry.prev_hash}|{entry.actor_id}|{entry.action}|{entry.entity_type}|{entry.entity_id}|{timestamp_str}|{payload_json}"
            calculated_hash = sha256_digest(preimage)

            if calculated_hash != entry.hash:
                return AuditVerifyReport(
                    is_valid=False,
                    total_entries=len(entries),
                    tampered_index=idx,
                    tampered_entry_id=entry.id,
                    message=f"Tampered row detected at block {idx} (ID: {entry.id}). Content does not match cryptographic hash!"
                )

            expected_prev_hash = entry.hash

        return AuditVerifyReport(
            is_valid=True,
            total_entries=len(entries),
            genesis_hash=entries[0].hash,
            tip_hash=entries[-1].hash,
            message="Audit chain verified! All blocks are unbroken and cryptographically sound."
        )
