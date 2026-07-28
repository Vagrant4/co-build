# Co-Build Deployment Guide

This guide prepares an invite-only pilot. It does not authorize public production launch.

## Required Services

- Vercel project connected to `Vagrant4/co-build`
- Clerk application for managed authentication
- Neon PostgreSQL with separate preview and production branches
- Vercel Blob store created with **Private** access
- Vercel Runtime Logs plus a persistent error-alerting service and external uptime monitor

## Environment Names

Configure values in Vercel, never in source control:

```text
APP_MODE
DATABASE_URL
DIRECT_URL
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY
NEXT_PUBLIC_CLERK_SIGN_IN_URL
NEXT_PUBLIC_CLERK_SIGN_UP_URL
NEXT_PUBLIC_APP_URL
BLOB_READ_WRITE_TOKEN
REAL_UPLOADS_ENABLED
MAX_UPLOAD_BYTES
ALLOW_UNSCANNED_UPLOADS
COMPANY_PAYMENT_NAME
COMPANY_PAYMENT_UEN
COMPANY_PAYMENT_BANK
COMPANY_PAYMENT_ACCOUNT
NEXT_PUBLIC_SENTRY_DSN
```

Use Neon's pooled endpoint for `DATABASE_URL`. Keep the direct endpoint in `DIRECT_URL` for controlled Prisma migration operations only.

## First PostgreSQL Baseline

The committed migration tree is `prisma/postgres/migrations`. A new empty database is initialized with:

```powershell
npm.cmd run prisma:generate:prod
npm.cmd run db:deploy:prod
```

If the target database was previously created with `prisma db push`, do not run the baseline blindly. Back it up, compare its schema to `prisma/postgres/schema.prisma`, and only then mark the reviewed baseline as applied in a maintenance window:

```powershell
npm.cmd exec prisma migrate resolve -- --schema prisma/postgres/schema.prisma --applied 20260728090000_baseline
```

That command is not automatic because an incorrect baseline decision can conceal schema drift. Complete a restore drill before pilot data is accepted.

## Private Blob

Follow [PRIVATE_STORAGE_SETUP.md](docs/PRIVATE_STORAGE_SETUP.md). Keep `REAL_UPLOADS_ENABLED=false` until the store, authorization tests, deletion check, and scan-risk decision are complete.

## Release Order

1. Confirm a current Neon backup and recorded rollback point.
2. Run `npm.cmd run db:deploy:prod` from a controlled environment using `DIRECT_URL`.
3. Run `npm.cmd run ops:report -- --json` and retain the sanitized report.
4. Deploy the application with `npm.cmd run vercel-build`.
5. Check `/api/health`, Vercel Runtime Logs, and the persistent error monitor.
6. Test signed-out denial, account sign-in, one private upload, authorized download, unauthorized denial, and deletion.
7. Keep the deployment invite-only.

The build command only generates the production Prisma client and compiles Next.js. It never runs `db push`, migrations, or demo seeds.

## Rollback

Roll back application code independently from database state. Do not reverse a migration by editing migration history. Use [ROLLBACK_RECOVERY.md](docs/ROLLBACK_RECOVERY.md), restore to a separate Neon branch, validate it, then promote through the provider's controlled process.

## Remaining Public-Launch Blockers

- Booking dates and overlap protection
- Company-account payment reconciliation and ledger
- Transactional email delivery and retries
- Rate limiting
- Privacy-appropriate malware scanning or documented owner risk acceptance
- Legal/privacy/retention policies
- Completed backup restore drill
- Persistent monitoring and incident ownership
