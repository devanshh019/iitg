# HACKOS Environment Configuration Reference

All secrets, credentials, and parameters must be passed strictly via environment variables.

| Variable Name | Required | Default | Description |
|---------------|----------|---------|-------------|
| `ENVIRONMENT` | Yes | `production` | Environment mode (`development`, `production`, `test`). |
| `DEBUG` | No | `false` | Enable verbose FastAPI debug logs. Must be `false` in production. |
| `PORT` | No | `8000` | Port for the backend uvicorn service. |
| `DATABASE_URL` | Yes | `postgresql://...` | Connection URI for the primary PostgreSQL database. Supabase pooled URL supported. |
| `TEST_DATABASE_URL` | For tests | `postgresql://...` | Dedicated database for automated test suite. |
| `SECRET_KEY` | Yes | - | Secret HMAC key (min 32 bytes) used for signing JWT access and refresh tokens. |
| `JWT_ALGORITHM` | No | `HS256` | JWT signing algorithm. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `120` | Lifetime of JWT bearer access token. |
| `REFRESH_TOKEN_EXPIRE_DAYS` | No | `7` | Lifetime of JWT refresh token. |
| `PII_ENCRYPTION_KEY` | Yes | - | 32-byte url-safe base64 key for Fernet field-level encryption at rest of participant email, phone, and college ID. |
| `ALLOWED_ORIGINS` | Yes | `http://localhost:5173,...` | Comma-delimited list of permitted CORS frontend domains. |
| `SENTRY_DSN` | No | `""` | Optional Sentry monitoring telemetry DSN. |
| `SMTP_HOST` | No | `""` | SMTP mail server hostname. Falls back to console logger if empty. |
| `SMTP_PORT` | No | `587` | SMTP port. |
| `SMTP_USER` | No | `""` | SMTP username. |
| `SMTP_PASSWORD` | No | `""` | SMTP password. |
| `SMTP_FROM_EMAIL` | No | `mission-control@hackos.local` | From email address for announcements and receipts. |

### Generating Cryptographic Keys
```bash
# Generate Fernet PII Encryption Key
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Generate 32-byte JWT Secret Key
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```
