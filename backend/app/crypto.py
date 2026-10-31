"""Cryptographic utilities: PII encryption at rest, deterministic dedupe hashing, Ed25519 token signatures, and SHA-256 ledgers."""
import base64
import hashlib
import json
import re
from typing import Optional, Tuple
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives import serialization
from backend.app.config import settings


_fernet: Optional[Fernet] = None


def get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        key = settings.PII_ENCRYPTION_KEY.encode()
        _fernet = Fernet(key)
    return _fernet


def encrypt_field(value: Optional[str]) -> Optional[str]:
    """Encrypt a string at field level using Fernet."""
    if value is None:
        return None
    f = get_fernet()
    return f.encrypt(value.encode("utf-8")).decode("utf-8")


def decrypt_field(value: Optional[str]) -> Optional[str]:
    """Decrypt a field encrypted with Fernet."""
    if value is None:
        return None
    f = get_fernet()
    try:
        return f.decrypt(value.encode("utf-8")).decode("utf-8")
    except Exception:
        return "[ENCRYPTION_ERROR]"


def normalize_email(email: str) -> str:
    """Normalize email: strip, lowercase, handle standard aliases."""
    if not email:
        return ""
    email = email.strip().lower()
    parts = email.split("@")
    if len(parts) == 2:
        user, domain = parts
        # normalize googlemail to gmail
        if domain == "googlemail.com":
            domain = "gmail.com"
        # For gmail, ignore dots in local part and strip + suffixes
        if domain == "gmail.com":
            user = user.split("+")[0].replace(".", "")
        return f"{user}@{domain}"
    return email


def normalize_phone(phone: str) -> str:
    """Normalize phone number by keeping only trailing digits or E.164."""
    if not phone:
        return ""
    digits = re.sub(r"\D", "", phone)
    # Take last 10 digits for national comparison if applicable
    if len(digits) > 10:
        return digits[-10:]
    return digits


def deterministic_hash(value: str) -> str:
    """Compute deterministic SHA-256 hash for database lookups and indexes."""
    if not value:
        return ""
    return hashlib.sha256(value.strip().lower().encode("utf-8")).hexdigest()


def mask_email(email: Optional[str]) -> str:
    """Mask email for non-privileged responses (e.g. j***e@example.com)."""
    if not email or "@" not in email:
        return "***"
    user, domain = email.split("@", 1)
    if len(user) <= 2:
        masked_user = user[0] + "*"
    else:
        masked_user = user[0] + ("*" * (len(user) - 2)) + user[-1]
    return f"{masked_user}@{domain}"


def mask_phone(phone: Optional[str]) -> str:
    """Mask phone number (e.g. +91 98****3210)."""
    if not phone:
        return "***"
    digits = re.sub(r"\D", "", phone)
    if len(digits) < 6:
        return "***"
    return digits[:2] + ("*" * (len(digits) - 4)) + digits[-2:]


def sha256_digest(data: str) -> str:
    """Compute SHA-256 digest of arbitrary UTF-8 string."""
    return hashlib.sha256(data.encode("utf-8")).hexdigest()


# Ed25519 Asymmetric Token Signatures for Boarding
def generate_ed25519_keypair() -> Tuple[str, str]:
    """Generate Ed25519 private and public keys in base64 format."""
    private_key = ed25519.Ed25519PrivateKey.generate()
    public_key = private_key.public_key()

    priv_bytes = private_key.private_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PrivateFormat.Raw,
        encryption_algorithm=serialization.NoEncryption()
    )
    pub_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw
    )
    return base64.urlsafe_b64encode(priv_bytes).decode("utf-8"), base64.urlsafe_b64encode(pub_bytes).decode("utf-8")


def sign_boarding_token(private_key_b64: str, payload: dict) -> str:
    """Sign a boarding token payload with Ed25519 private key."""
    priv_bytes = base64.urlsafe_b64decode(private_key_b64.encode("utf-8"))
    private_key = ed25519.Ed25519PrivateKey.from_private_bytes(priv_bytes)

    payload_json = json.dumps(payload, sort_keys=True, separators=(',', ':')).encode("utf-8")
    signature = private_key.sign(payload_json)

    token_obj = {
        "p": base64.urlsafe_b64encode(payload_json).decode("utf-8"),
        "s": base64.urlsafe_b64encode(signature).decode("utf-8")
    }
    return base64.urlsafe_b64encode(json.dumps(token_obj, separators=(',', ':')).encode("utf-8")).decode("utf-8")


def verify_boarding_token(public_key_b64: str, token_str: str) -> Tuple[bool, Optional[dict]]:
    """Verify an Ed25519-signed boarding token and return payload."""
    try:
        pub_bytes = base64.urlsafe_b64decode(public_key_b64.encode("utf-8"))
        public_key = ed25519.Ed25519PublicKey.from_public_bytes(pub_bytes)

        token_raw = base64.urlsafe_b64decode(token_str.encode("utf-8")).decode("utf-8")
        token_obj = json.loads(token_raw)

        payload_bytes = base64.urlsafe_b64decode(token_obj["p"].encode("utf-8"))
        signature_bytes = base64.urlsafe_b64decode(token_obj["s"].encode("utf-8"))

        public_key.verify(signature_bytes, payload_bytes)
        payload = json.loads(payload_bytes.decode("utf-8"))
        return True, payload
    except Exception:
        return False, None
