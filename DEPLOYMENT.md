# Co-Build Live Deployment

This MVP is built for local demos with SQLite and for live hosting with Postgres.

## Recommended Live Stack

- Hosting: Vercel
- Database: hosted Postgres with connection pooling, such as Vercel Postgres, Neon, Supabase, or Railway
- Payments: company-account collection, with renter/host payment references approved by admin
- Uploads: local uploads work for the demo, but production should move verification, listing, check-in, and check-out files to durable object storage

## Required Environment Variables

Create these in the Vercel project settings before deploying:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?sslmode=require"
NEXT_PUBLIC_APP_URL="https://your-co-build-domain.com"
COMPANY_PAYMENT_NAME="Co-Build Pte Ltd"
COMPANY_PAYMENT_UEN="202600000A"
COMPANY_PAYMENT_BANK="Your Bank Name"
COMPANY_PAYMENT_ACCOUNT="000-000-000-0"
```

Show the company payment instructions inside account dashboards or operational onboarding material. Users and hosts submit the recurring S$5/month payment reference; admin activates the subscription after checking the company account.

## Build Command

Vercel uses:

```bash
npm run vercel-build
```

That command pushes the Prisma schema to the connected Postgres database, generates Prisma Client from
`prisma/schema.postgres.prisma`, seeds demo data only when the database is empty, and then builds Next.js.

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

## Notes Before Public Launch

- The current app uses demo role switching instead of real authentication.
- Booking, add-on, and subscription payments are proof/reference based. Add real bank reconciliation or admin proof upload review before relying on this publicly.
- Local filesystem uploads are not durable on serverless hosting. Use S3, R2, UploadThing, or Vercel Blob before relying on uploaded documents/photos in production.
- Add real authentication, email notifications, contract delivery, and mobile-first PWA polish before replacing the demo flow.
- Protect the first live deployment if it contains demo data or admin controls.
