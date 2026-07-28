# Phase 2A Implementation Report

## Scope

This phase replaces runtime filesystem uploads and adds the minimum private-storage, migration, and operational foundation for continued invite-only pilot preparation. It does not make Co-Build production-ready.

## Implemented

- Vercel Private Blob adapter and direct client upload flow.
- Server-derived identity, role, listing ownership, booking participation, and booking-state checks.
- Immutable server-generated object keys and five-minute upload authorization.
- Upload metadata for provider, key, MIME, bytes, SHA-256, owner, uploader, lifecycle, scan, booking, and listing.
- Magic-byte, extension, declared MIME, size, non-empty, filename, and image-dimension validation.
- Private download/delete routes with authorization, safe headers, audit records, and retry-safe metadata state.
- Legacy local upload rows retained only as non-servable `LEGACY_DEMO` metadata.
- Stale/orphan cleanup command and sanitized `ops:report` command.
- Separate PostgreSQL migration tree and `prisma migrate deploy`; ordinary builds no longer mutate the database.
- Disposable PostgreSQL CI service plus optional protected Private Blob smoke job.
- Generic health endpoint, correlation IDs, structured redacted logs, and upload consistency logs.

## Migration Summary

- SQLite migration recreates `Upload`, maps old local paths to `legacyLocalPath`, and marks rows `LEGACY_LOCAL` plus `LEGACY_DEMO`.
- PostgreSQL baseline creates the complete accepted Phase 1 schema plus Phase 2A upload enums, relations, metadata, and indexes.
- Existing databases created by `db push` require a backup, schema comparison, and controlled `migrate resolve`; this branch does not guess or mutate them automatically.

## Verified Locally

- `npm test`: 69 tests passed at implementation checkpoint.
- `npm run build`: passed in demo mode.
- `npm run ops:report -- --json`: produced an aggregate report without PII or credentials.

## Still Blocked

- Real uploads remain disabled until a Private Blob store is connected and the scanning decision is recorded.
- Neon backup settings and restore drill are not verifiable from source code.
- Persistent error alerts and uptime monitoring require owner-managed services.
- Booking dates/overlap protection, payment reconciliation, transactional email, rate limiting, legal/privacy/retention policy, and public launch remain later phases.
