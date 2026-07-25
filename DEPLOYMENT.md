# Co-Build Deployment Guide

This MVP is built for local demos with SQLite and for Vercel-hosted previews with Postgres.

## Production Gate

Do not treat the current application as public-production ready until the Critical and High items in [docs/PRODUCTION_READINESS_CHECKLIST.md](docs/PRODUCTION_READINESS_CHECKLIST.md) are closed.

The current deployment path is acceptable for:

- Founder demo
- Investor/customer walkthrough
- Internal operations testing
- Private staging behind access protection

The current deployment path is not acceptable for:

- Public user registration
- Real verification documents
- Real host/renter payment proof
- Real booking disputes or damage-deposit workflows
- Public admin CSV exports

## Recommended Live Stack

- Hosting: Vercel
- Database: hosted Postgres with connection pooling, such as Vercel Postgres, Neon, Supabase, or Railway
- Payments: company-account collection, with renter/host payment references approved by admin
- Uploads: move verification, listing, check-in, and check-out files to durable private object storage before public launch
- Authentication: Clerk-managed sessions and application-level role/ownership checks are implemented in Phase 1; complete [Clerk pilot setup](docs/CLERK_SETUP.md) externally
- Email: add transactional email for account creation, booking updates, chat alerts, and generated contracts
- Database changes: replace production `db push` with reviewed Prisma migrations before real data is collected

## Required Environment Variables

Create these in the Vercel project settings before deploying:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?sslmode=require"
APP_MODE="pilot"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_APP_URL="https://your-co-build-domain.com"
COMPANY_PAYMENT_NAME="Co-Build Pte Ltd"
COMPANY_PAYMENT_UEN="202600000A"
COMPANY_PAYMENT_BANK="Your Bank Name"
COMPANY_PAYMENT_ACCOUNT="000-000-000-0"
```

Show the company payment instructions inside account dashboards or operational onboarding material. Users and hosts submit the recurring S$5/month payment reference; admin activates the subscription after checking the company account.

## Current Build Command

Vercel uses:

```bash
npm run vercel-build
```

That command pushes the Prisma schema to the connected Postgres database, generates Prisma Client from `prisma/schema.postgres.prisma`, and builds Next.js. It does not seed demo users.

`prisma/seed-if-empty.ts` now refuses to seed outside demo mode. Do not run the demo seed against pilot or production data.

Before public launch, change the build sequence to:

```bash
npm run prisma:generate:prod
npm run build
```

Then run reviewed migrations and production-safe seed scripts separately through a controlled release process.

## First Database Setup

After adding `DATABASE_URL`, Vercel will push the MVP schema during `npm run vercel-build`.
You can also run it manually when needed:

```bash
npm run db:push:prod
```

To seed demo data into an empty live database after generating the production Prisma client:

```bash
npm run prisma:generate:prod
npm run db:seed:if-empty
```

For local development, switch Prisma Client back to SQLite:

```bash
npm run prisma:generate
```

## Private Preview Deployment

1. Confirm the Vercel project is connected to this GitHub repository.
2. Add the environment variables above to Production and Preview.
3. Enable Vercel Deployment Protection for private demos.
4. Deploy from the Git branch you want to review.
5. Run the verification commands in the next section.

## Public Production Deployment

Only do this after the readiness checklist is closed:

1. Merge the reviewed release branch.
2. Confirm the database has a current backup.
3. Run reviewed Prisma migrations, not `db push`.
4. Confirm the production build does not run any demo seed command.
5. Confirm auth protects `/dashboard/admin`, `/dashboard/admin/export/*`, server actions, dashboards, checkout, uploads, and chat writes.
6. Confirm object storage is private and upload access is signed or permission checked.
7. Run smoke tests for account creation, subscription proof, listing approval, search, booking, chat, high-risk approval, payment proof, check-in, and check-out.
8. Deploy to production.
9. Monitor logs, error rates, and database connection usage for the first hour.

## Publish With Vercel CLI

```bash
vercel login
vercel link
vercel env add DATABASE_URL production
vercel env add NEXT_PUBLIC_APP_URL production
vercel env add COMPANY_PAYMENT_NAME production
vercel env add COMPANY_PAYMENT_UEN production
vercel env add COMPANY_PAYMENT_BANK production
vercel env add COMPANY_PAYMENT_ACCOUNT production
vercel --prod
```

## Verification

Run locally before deploying:

```bash
npm.cmd test
npm.cmd exec prisma validate
npm.cmd run build
```

After deployment, smoke test:

- `/`
- `/search`
- `/create-account`
- `/dashboard/user`
- `/dashboard/host`
- `/dashboard/admin` only when protected
- A listing detail route
- A checkout route

## Rollback

Use [docs/ROLLBACK_RECOVERY.md](docs/ROLLBACK_RECOVERY.md) for code rollback, database recovery, upload recovery, and incident steps.

## Notes Before Public Launch

- Demo role switching exists only in demo mode. Pilot and production use Clerk and fail closed when Clerk configuration is missing.
- Booking, add-on, and subscription payments are proof/reference based.
- Local filesystem uploads are not durable on serverless hosting.
- Generated contracts are stored in the database, but real email delivery is not implemented.
- Protect any deployment that contains demo data or admin controls.
