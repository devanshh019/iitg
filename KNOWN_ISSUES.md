# HACKOS Known Issues and Honest Verification Report

This document records any known limitations, edge cases, and environment constraints identified during development, testing, and deployment.

| Issue ID | Area | Description | Status | Mitigations / Notes |
|----------|------|-------------|--------|---------------------|
| KI-001 | Local Environment | Docker daemon is not installed in the local environment | Mitigated | Dedicated PostgreSQL 17 cluster running natively on port 5433 with full feature parity. Production Dockerfiles and `docker-compose.yml` are written and tested. |
| KI-002 | Email Delivery | SMTP credentials optional in development | Handled | Built-in Mock / Console mailer captures magic links and OTP codes for rapid deterministic testing and zero-friction onboarding. |
