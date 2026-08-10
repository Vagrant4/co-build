# Pilot Readiness Automation Report

Date: 2026-08-08

This implementation does not make Co-Build production-ready. It establishes a fail-closed invite-only pilot foundation and turns owner-operated launch requirements into an executable release gate.

## Implemented

- Real Singapore-local booking start/end dates and overlap rejection inside a serializable transaction.
- Approved, active, unsuspended renter and host eligibility checks in server actions and public listing queries.
- Payment records for booking totals, subscriptions, and additional requirements.
- Booking payment state now moves from `APPROVED_FOR_PAYMENT` to `PAYMENT_SUBMITTED`; only an administrator may set `PAID_CONFIRMED` after company-account reconciliation.
- Both renter and host must confirm the deal and accept the exact current agreement hash before booking payment proof is accepted.
- Deposit held, released, retained, partially retained, and disputed states with validated totals and atomic audit records.
- Versioned agreement acceptance, privacy access/correction/deletion requests, and administrator resolution records.
- Persistent account-scoped rate limiting for booking, chat, payment, agreement, privacy, and upload operations.
- Pre-render HTTP authorization gates return real 401/403/404 responses for protected dashboards, private booking records, checkout, and ineligible listings.
- Participant notifications, a transactional email outbox with bounded retries, administrator alerts, and user-visible notification centres.
- Participant-scoped message reporting, administrator moderation review, and privacy-safe contact-sharing violation records.
- Private listing-photo delivery, image metadata validation with `sharp`, and a fail-closed malware-scanner adapter.
- Guarded retention execution, cryptographic audit checkpoints, masked bank-statement reconciliation, first-admin bootstrap, production health checks, and a PostgreSQL restore-drill command.
- PWA manifest, service-worker registration, responsive loading state, and desktop/mobile Playwright coverage.
- SQLite and PostgreSQL forward migrations, expanded CI, and an executable pilot preflight.

## External Owner Steps Still Required

1. Configure Clerk production keys and allowed Co-Build URLs.
2. Apply PostgreSQL migrations to a separate Neon branch, confirm pooled and direct URLs, enable backups, and complete a restore drill.
3. Connect a Private Vercel Blob store. For an invite-only pilot, explicitly record temporary unscanned-file risk acceptance; production remains blocked until malware scanning is implemented and tested.
4. For an invite-only pilot, explicitly acknowledge that `pilot-2026-08-07-r2` remains an unreviewed draft by setting `LEGAL_PILOT_OWNER_ACKNOWLEDGED=true`. Public production still requires Singapore legal review and the exact `LEGAL_REVIEW_APPROVED_VERSION`.
5. Configure a real error-monitoring project connected to Vercel logs (Sentry or equivalent), uptime monitor, incident runbook URL, and named privacy/security/operations/backup owners.
6. Rehearse company-account payment matching, rejected proof, duplicate reference, refund, deposit dispute, and monthly subscription renewal procedures.
7. Connect and verify the configured transactional email sender and operations-alert webhook before relying on external notifications. In-app notices remain authoritative when delivery is unavailable.

## Phase 2 External Acceptance Blockers

- Connect the implemented malware-scanner adapter and test clean/malicious fixtures.
- Connect Resend and verify sender DNS, delivery, rejection, and retry operations.
- Connect Private Blob and pass the storage smoke test.
- Configure Vercel Firewall/WAF rules and the implemented aggregate alert webhook.
- Perform the guarded Neon restore drill and retain evidence.
- Complete lawyer, bank-owner, DNS-owner, and named-operator attestations.

## Phase 3 Blockers

- Public production load testing and capacity limits.
- Full disaster-recovery drill and evidence retention.
- Automated payout/refund integration if Co-Build later handles money.
- Native mobile application only after repeat web usage proves the need.

## Clerk Configuration

1. Create separate Clerk development and production instances.
2. Enable email-based sign-up/sign-in and verified primary email addresses.
3. Add the production domain and exact sign-in/sign-up redirect URLs.
4. Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, and `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up` in Vercel Production and Preview as appropriate.
5. Create renter/host accounts through the app; create the first administrator through a controlled database operation after matching the Clerk user id to `authProviderId=clerk:<id>`.
6. Test signed-out, wrong-role, suspended, and unrelated-participant access before inviting users.
