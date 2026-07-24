# Maintenance Guide

Last reviewed: 2026-07-25

## Purpose

This guide defines the recurring operational work needed to keep Co-Build reliable after launch.

## Daily Tasks During Pilot

- Review new renter and host accounts.
- Verify pending S$5/month subscription payment references against the company account.
- Review pending host listings.
- Review high-risk booking requests.
- Review chat/contact-policy violations once violation logging exists.
- Review upload failures and suspicious files.
- Check Vercel runtime errors.
- Check database connection and query errors.

## Weekly Tasks

- Export a private operations report, not a public CSV link.
- Review active subscribers and next billing dates.
- Review pending unpaid subscriptions.
- Review bookings by status.
- Review disputes and check-in/check-out photo completion.
- Review unapproved or suspended users/hosts.
- Confirm backups completed.
- Run automated tests locally:

```bash
npm.cmd test
npm.cmd exec prisma validate
npm.cmd run build
```

## Monthly Tasks

- Reconcile recurring subscriptions.
- Send renewal reminders once email delivery exists.
- Review pricing and equipment add-on rates.
- Review safety rules and prohibited-work policy.
- Review privacy/data-retention obligations.
- Patch dependencies.
- Run a restore drill in staging once the system has real users.

## Release Maintenance

Before each release:

1. Read the diff.
2. Run tests and build.
3. Review migration SQL if schema changed.
4. Confirm no demo seed is included in production path.
5. Confirm environment variables are present.
6. Deploy to preview.
7. Smoke test renter, host, and admin flows.
8. Deploy to production only after preview passes.

After each release:

1. Smoke test production.
2. Watch logs for at least 15 minutes.
3. Check database errors.
4. Check upload errors.
5. Record release notes.

## Data Maintenance

Before public launch, define:

- User data retention period.
- Verification upload retention period.
- Check-in/check-out photo retention period.
- Chat retention period.
- Admin export retention period.
- Account deletion process.
- Suspended account process.

## Subscription Maintenance

The business model is recurring S$5/month from each renter and host. Admin does not charge commission on deals.

Maintain:

- Active subscriber count.
- Pending payment references.
- Next billing dates.
- Overdue subscriptions.
- Manual reconciliation notes.
- Revenue report.

Trigger heavier database/storage work when active subscribers reach 50.

## Safety And Dispute Maintenance

Maintain:

- High-risk approval log.
- Hot work, welding, spray painting, and chemical-work approvals.
- Damage/deposit review notes.
- Check-in/check-out photo completion.
- Host safety declarations.
- User suspension history.

## Dependency Maintenance

Current dependency risk:

- `next`, `react`, `react-dom`, `lucide-react`, `tsx`, and TypeScript packages use `latest`.
- Prisma and Tailwind are pinned.

Recommendation:

- Pin all production dependencies before public launch.
- Update dependencies on a scheduled branch.
- Run tests and build before merging dependency updates.
- Review Next.js and Prisma security advisories.

## Monitoring Maintenance

Add before public launch:

- Error monitoring.
- Uptime monitoring.
- Database slow-query monitoring.
- Upload failure monitoring.
- Email delivery monitoring.
- Admin action audit review.
- Backup success alerts.

## Documentation Maintenance

Update these docs whenever the implementation changes:

- `docs/ARCHITECTURE.md` for route/module/storage/auth changes.
- `docs/DATABASE_SCHEMA_REVIEW.md` for schema or migration changes.
- `docs/SECURITY_AUDIT.md` for auth, upload, payment, and admin changes.
- `docs/PERFORMANCE_SCALABILITY.md` for volume thresholds and scaling decisions.
- `docs/PRODUCTION_READINESS_CHECKLIST.md` when items move from Blocked/Needed to Done.
- `DEPLOYMENT.md` for environment variables and release steps.
- `docs/ROLLBACK_RECOVERY.md` after recovery drills.
