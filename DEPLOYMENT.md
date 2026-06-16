# Co-Build Live Deployment

This MVP is built for local demos with SQLite and for live hosting with Postgres.

## Recommended Live Stack

- Hosting: Vercel
- Database: hosted Postgres with connection pooling, such as Vercel Postgres, Neon, Supabase, or Railway
- Payments: Stripe, owned by the platform admin
- Uploads: local uploads work for the demo, but production should move verification, listing, check-in, and check-out files to durable object storage

## Required Environment Variables

Create these in the Vercel project settings before deploying:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME?sslmode=require"
NEXT_PUBLIC_APP_URL="https://your-co-build-domain.com"
STRIPE_SECRET_KEY="sk_live_replace_me"
STRIPE_PLATFORM_SUBSCRIPTION_PRICE_ID="price_replace_me"
```

`STRIPE_PLATFORM_SUBSCRIPTION_PRICE_ID` should be a recurring monthly Stripe Price for S$5/month.

## Build Command

Vercel uses:

```bash
npm run vercel-build
```

That command generates Prisma Client from `prisma/schema.postgres.prisma` and then builds Next.js.

## First Database Setup

After adding `DATABASE_URL`, push the MVP schema to the live Postgres database:

```bash
npm run db:push:prod
```

To seed demo data into the live database after generating the production Prisma client:

```bash
npm run prisma:generate:prod
npm run db:seed
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
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_PLATFORM_SUBSCRIPTION_PRICE_ID production
vercel --prod
```

## Notes Before Public Launch

- The current app uses demo role switching instead of real authentication.
- Booking and add-on rental payments are still demo-confirmed; the recurring platform subscription can create a real Stripe Checkout Session when the Stripe env vars are set.
- Local filesystem uploads are not durable on serverless hosting. Use S3, R2, UploadThing, or Vercel Blob before relying on uploaded documents/photos in production.
- Protect the first live deployment if it contains demo data or admin controls.
