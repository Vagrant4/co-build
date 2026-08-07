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
- SQLite and PostgreSQL forward migrations, expanded CI, and an executable pilot preflight.

## External Owner Steps Still Required

1. Configure Clerk production keys and allowed Co-Build URLs.
2. Apply PostgreSQL migrations to a separate Neon branch, confirm pooled and direct URLs, enable backups, and complete a restore drill.
3. Connect a Private Vercel Blob store. For an invite-only pilot, explicitly record temporary unscanned-file risk acceptance; production remains blocked until malware scanning is implemented and tested.
4. Obtain Singapore legal review of `pilot-2026-08-07-r2`, then set `LEGAL_REVIEW_APPROVED_VERSION` to that exact value only if approved.
5. Configure a real error-monitoring project connected to Vercel logs (Sentry or equivalent), uptime monitor, incident runbook URL, and named privacy/security/operations/backup owners.
6. Rehearse company-account payment matching, rejected proof, duplicate reference, refund, deposit dispute, and monthly subscription renewal procedures.
7. Add transactional email delivery before relying on email notifications. The platform currently keeps operational communication in authenticated dashboards and chat.

## Phase 2 Blockers

- Malware scanning and quarantine workflow.
- Transactional notification delivery with retries and delivery audit.
- Automated bank reconciliation or an imported bank-statement matching workflow.
- Retention execution jobs after legal approval of retention periods and deletion exceptions.
- Edge/WAF rate limiting and persistent alert delivery.

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
