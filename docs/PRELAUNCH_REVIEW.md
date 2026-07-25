# Co-Build Pre-Launch Review

> Baseline audit from commit `3ac0774`. Phase 1 identity, authorization, private conversation, and export controls are implemented on `codex/production-foundation-phase-1`; see [PHASE_1_IMPLEMENTATION_REPORT.md](PHASE_1_IMPLEMENTATION_REPORT.md) for current status.

Last reviewed: 2026-07-25

## Verdict

Co-Build is a useful showcase MVP. It is not ready for public production launch.

The app demonstrates the intended marketplace flow: renter search, listing detail, checkout, host approval, admin high-risk review, chat, subscription payment reference, additional requirement pricing, generated contract text, and check-in/check-out uploads. The core issue is that the application still trusts demo form inputs instead of authenticated users and protected roles.

## Read This First

1. [Security audit](SECURITY_AUDIT.md)
2. [Production readiness checklist](PRODUCTION_READINESS_CHECKLIST.md)
3. [Deployment guide](../DEPLOYMENT.md)
4. [Rollback and recovery guide](ROLLBACK_RECOVERY.md)
5. [Architecture overview](ARCHITECTURE.md)
6. [Database schema review](DATABASE_SCHEMA_REVIEW.md)
7. [Performance and scalability notes](PERFORMANCE_SCALABILITY.md)
8. [Maintenance guide](MAINTENANCE.md)

## Scope Reviewed

- Next.js App Router pages under `app/`
- Server actions in `app/actions.ts`
- Prisma schemas under `prisma/`
- Repository/domain logic under `src/lib/`
- Upload handling in `src/lib/uploads.ts`
- Admin CSV export routes
- Demo seed scripts
- Vercel deployment config
- Existing automated tests

## Severity Summary

| Severity | Count | Launch meaning |
| --- | ---: | --- |
| Critical | 5 | Blocks public launch |
| High | 8 | Blocks real users or real money workflows |
| Medium | 8 | Must be scheduled before wider rollout |
| Low | 6 | Cleanup, clarity, and polish |

## Top Launch Blockers

1. No real authentication or authorization.
2. Admin dashboards, admin actions, and CSV exports are reachable as demo UI/routes.
3. File uploads are written to local disk and are not private, durable production storage.
4. Booking/payment/deal state changes trust submitted form fields.
5. Production build path runs `db push` and demo seed upserts.

## Recommended Release Path

1. Keep the current Vercel deployment private for demos.
2. Implement auth and role-based authorization.
3. Remove or protect demo role switching, admin dashboards, and CSV exports.
4. Move uploads to private object storage.
5. Replace production `db push` with Prisma migrations.
6. Disable showcase seeding in production.
7. Add email delivery for account, chat, booking, subscription, and contract events.
8. Run a controlled pilot with manually approved hosts and renters.

## Current Safe Use

Safe:

- Private founder demo
- Internal workflow testing
- UI walkthrough
- Investor showcase with demo data
- Operations planning

Unsafe:

- Public registration
- Real user identity documents
- Real dispute evidence uploads
- Real admin exports
- Unprotected production admin dashboard
- Automated payment or legal reliance on generated contract text
