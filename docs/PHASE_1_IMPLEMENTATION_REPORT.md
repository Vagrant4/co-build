# Production Foundation Phase 1

## Status

Phase 1 establishes an identity, authorization, and conversation privacy boundary for a future invite-only pilot. It does not make Co-Build production-ready.

## Implemented

- Explicit `APP_MODE=demo|pilot|production` with fail-closed Clerk configuration checks in pilot and production.
- Clerk-managed authentication for pilot and production. Demo switching is isolated to an HTTP-only cookie and returns 404 outside demo mode.
- Durable `User.authProviderId` mapping and create-only account registration. Existing accounts cannot be overwritten or unsuspended by registration.
- Centralized `requireUser`, `requireRole`, `requireAdmin`, `requireListingOwner`, `requireBookingParticipant`, and `requireConversationParticipant` helpers.
- Session-derived actors across booking, chat, upload, subscription, listing, pricing, verification, suspension, and deal actions.
- Participant-scoped `Conversation` and `ConversationMessage` records for pre-booking chat.
- Public listing and checkout eligibility requiring an approved listing and an approved, active HOST owner.
- ADMIN-only dashboards and CSV routes, export audit records, reduced personal data, and CSV formula neutralization.
- Transactional mutation and audit writes for sensitive state changes.
- Empty dashboard and demo-login states that do not assume fixed account IDs.
- GitHub Actions release gate, Playwright protected-route tests, and security regression tests.

## Verification

- Unit and authorization tests: 18 files, 50 tests passed.
- Playwright: 4 protected-route scenarios passed.
- TypeScript: passed.
- SQLite and PostgreSQL Prisma validation: passed with the appropriate datasource environment.
- Next.js production build: passed.
- Clean SQLite database creation: passed with zero users, listings, or conversations.

## Phase 2 Blockers

- Replace local filesystem uploads with private object storage, signed access, MIME/size validation, malware scanning, and retention rules.
- Add booking dates, availability conflict protection, timezone rules, and cancellation windows.
- Replace simulated payment confirmation with company-account reconciliation, proof review states, idempotency, and finance audit controls.
- Add real transactional email for invitations, booking events, chat notifications, and contracts.
- Baseline the existing hosted PostgreSQL database and move deployment from `prisma db push` to reviewed `prisma migrate deploy` releases.
- Add rate limits and abuse controls for registration, chat, uploads, exports, and booking submissions.
- Resolve all production dependency audit findings. The repository is pinned to Next.js `16.2.11`, but `npm audit --omit=dev` still reports high-severity advisories in the current Next.js dependency range.

## Phase 3 Blockers

- Durable background jobs, retries, dead-letter handling, and notification delivery tracking.
- Centralized logs, error monitoring, security alerts, audit retention, and export monitoring.
- Backup automation plus tested restore and rollback drills.
- Privacy policy, terms, PDPA retention/deletion workflows, host/renter agreements, and incident response ownership.
- Load testing, database index review from real pilot traffic, connection-pool monitoring, and capacity alerts.
- Full payment dispute, deposit release, refund, and evidence-review workflows.

## Deliberately Deferred

This branch does not implement booking dates, object storage, or payment reconciliation.

Managed authentication setup is documented in [CLERK_SETUP.md](CLERK_SETUP.md).
