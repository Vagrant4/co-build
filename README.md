# Co-Build MVP

Full-stack MVP for short-term fabrication workspace rental in Singapore.

## Current Status

Phase 1 now provides managed identity, centralized authorization, private conversations, protected admin exports, and fail-closed pilot/production modes. The repository is suitable for controlled demos and continued invite-only pilot preparation. It is not ready for public production traffic.

Primary public-launch blockers:

- Uploads are stored on the local filesystem, which is not durable on Vercel serverless hosting.
- Booking dates and availability conflict protection are not implemented.
- Payment confirmation is still simulated and not reconciled against the company account.
- The existing hosted database still needs a reviewed Prisma Migrate baseline before public launch.

Start with the [Phase 1 implementation report](docs/PHASE_1_IMPLEMENTATION_REPORT.md). The earlier [pre-launch review](docs/PRELAUNCH_REVIEW.md) remains the baseline audit that led to this phase.

## Run Locally

```bash
npm.cmd install
npm.cmd run prisma:generate
npx.cmd prisma db push
$env:APP_MODE="demo"
npm.cmd run db:seed
npm.cmd run dev -- --hostname 127.0.0.1 --port 3000
```

The current local SQLite database is `prisma/dev.db` and is ignored by git. Uploaded verification/check-in/check-out files go to `uploads/` and are also ignored.

## What Is Included

- Homepage, search results, listing detail, checkout, renter dashboard, host dashboard, host listing form, admin dashboard, pricing, safety, FAQ, and contact pages.
- Demo renter, host, and admin role flows.
- Seeded listings with exact sqft requirements and smaller/bigger-than-1,000-sqft search behavior.
- Pricing, deposit, cleaning fee, equipment add-on, zoning/risk, and booking workflow logic.
- Local file uploads for verification and check-in/check-out photos.
- Admin approval controls for listings, users, high-risk work, pricing, equipment, and unsafe-user suspension.

## Documentation

- [Pre-launch review index](docs/PRELAUNCH_REVIEW.md)
- [Phase 1 implementation report](docs/PHASE_1_IMPLEMENTATION_REPORT.md)
- [Clerk pilot setup](docs/CLERK_SETUP.md)
- [Architecture overview](docs/ARCHITECTURE.md)
- [Database schema review](docs/DATABASE_SCHEMA_REVIEW.md)
- [Security audit](docs/SECURITY_AUDIT.md)
- [Performance and scalability notes](docs/PERFORMANCE_SCALABILITY.md)
- [Production readiness checklist](docs/PRODUCTION_READINESS_CHECKLIST.md)
- [Deployment guide](DEPLOYMENT.md)
- [Rollback and recovery guide](docs/ROLLBACK_RECOVERY.md)
- [Maintenance guide](docs/MAINTENANCE.md)

## Verification

```bash
npm.cmd test
npm.cmd exec prisma validate
npm.cmd run build
node scripts\verify-webapp.cjs
```

## Publish Live

See [DEPLOYMENT.md](DEPLOYMENT.md) for the Vercel + Postgres + company-account payment-reference deployment path.

The local demo uses SQLite at `prisma/dev.db`. Live hosting should use `prisma/schema.postgres.prisma` with a hosted Postgres `DATABASE_URL`.
