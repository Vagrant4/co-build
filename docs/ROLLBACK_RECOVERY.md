# Rollback And Recovery Guide

Last reviewed: 2026-07-25

## Purpose

This guide explains how to recover Co-Build after a bad deploy, database issue, upload issue, or security incident.

## Current Recovery Risk

The current production path uses `prisma db push` and demo seed upserts. That means database rollback is not as reliable as code rollback. Before public launch, move to reviewed Prisma migrations and scheduled backups.

## Code Rollback On Vercel

Use this when a deployment breaks pages or actions but the database is still healthy.

1. Open the Vercel project.
2. Go to Deployments.
3. Find the last known-good production deployment.
4. Use Vercel rollback/promote controls to restore it.
5. Smoke test:

```bash
/
/search
/create-account
/dashboard/user
/dashboard/host
/dashboard/admin
```

6. Check Vercel runtime logs for remaining errors.
7. Create a Git issue or branch for the failed deployment.

## Git Revert

Use this when the bad change is already merged and should be reverted in source control.

```bash
git log --oneline -5
git revert <bad_commit_sha>
npm.cmd test
npm.cmd run build
git push
```

Do not use `git reset --hard` on shared branches.

## Database Recovery

### Current Demo/Staging State

For demo data, the simplest recovery is usually:

```bash
npm.cmd run db:seed
```

This is not a production recovery method.

### Production Requirement

Before public launch, configure:

- Daily automatic Postgres backups.
- Point-in-time recovery if the database provider supports it.
- A documented restore test.
- Separate staging and production databases.
- No demo seeding in production build.

### Production Restore Steps

1. Stop new deploys.
2. Put the app in maintenance mode or protect access.
3. Identify the incident time.
4. Restore the database to a new database instance first.
5. Validate row counts and critical records:
   - Users
   - Listings
   - Bookings
   - Messages
   - Upload records
   - Approval events
   - Additional requirements
6. Point `DATABASE_URL` to the restored database only after validation.
7. Redeploy.
8. Run smoke tests.
9. Keep the broken database read-only for investigation.

## Upload Recovery

Current uploads are local files under `uploads/`. This is not durable on Vercel and cannot be relied on for production recovery.

Before public launch:

- Store files in private object storage.
- Store object key, bucket, checksum, content type, size, owner, upload type, and scan status.
- Back up metadata through the database backup.
- Keep object storage versioning if affordable.

Recovery steps after object storage is implemented:

1. Confirm whether database metadata or object files are missing.
2. Restore database metadata from backup if needed.
3. Restore object versions if object storage supports it.
4. Rebuild thumbnails/previews if those are derived assets.
5. Audit access logs for unexpected downloads.

## Security Incident Response

Use this if admin/export routes, uploads, chat, payments, or account data may be exposed.

1. Protect or disable the public deployment.
2. Rotate database credentials.
3. Disable compromised admin/user sessions once real auth exists.
4. Export relevant audit logs.
5. Preserve Vercel runtime logs.
6. Identify affected users and records.
7. Remove public access to CSV exports.
8. Patch the vulnerability.
9. Run authorization tests.
10. Prepare user notification if personal data was exposed.

## Payment Or Subscription Mistake

Use this if a subscription or booking is marked paid incorrectly.

1. Check the company account manually.
2. Compare payment reference, user, amount, and date.
3. Correct subscription or booking status.
4. Add an approval event explaining the correction.
5. Notify affected renter/host by email once email delivery exists.
6. Record the incident in operations notes.

## Restore Drill Checklist

Run this before public launch and then quarterly:

- Restore a database backup into staging.
- Confirm app boots against restored database.
- Confirm admin can view users/listings/bookings.
- Confirm a renter dashboard loads.
- Confirm a host dashboard loads.
- Confirm uploads can be retrieved from storage.
- Confirm a rollback deployment can be promoted in Vercel.
- Record time to recover.

## Recovery Owners

Assign real owners before production:

- Code rollback owner
- Database recovery owner
- Upload recovery owner
- Security incident owner
- User communication owner
- Payment reconciliation owner
