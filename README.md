# Co-Build MVP

Full-stack MVP for short-term fabrication workspace rental in Singapore.

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

## Verification

```bash
npm.cmd test
npm.cmd exec prisma validate
npm.cmd run build
node scripts\verify-webapp.cjs
```

## Publish Live

See [DEPLOYMENT.md](DEPLOYMENT.md) for the Vercel + Postgres + Stripe deployment path.

The local demo uses SQLite at `prisma/dev.db`. Live hosting should use `prisma/schema.postgres.prisma` with a hosted Postgres `DATABASE_URL`.
