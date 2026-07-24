# Co-Build MVP

Full-stack MVP for short-term fabrication workspace rental in Singapore.

## Current Status

This repository is ready for controlled demos and structured pre-launch review. It is not ready for public production traffic yet.

Primary public-launch blockers:

- Real authentication and authorization are not implemented.
- Admin dashboards and CSV exports are currently demo-accessible.
- Uploads are stored on the local filesystem, which is not durable on Vercel serverless hosting.
- Production deployment currently uses `prisma db push` and demo seeding, not reviewed migrations and controlled production seed data.

Start the readiness review here: [docs/PRELAUNCH_REVIEW.md](docs/PRELAUNCH_REVIEW.md).

## Run Locally

```bash
npm.cmd install --ignore-scripts
npm.cmd run prisma:generate
npm.cmd exec prisma db execute -- --schema prisma\schema.prisma --file prisma\migrations\20260614150000_init\migration.sql
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
