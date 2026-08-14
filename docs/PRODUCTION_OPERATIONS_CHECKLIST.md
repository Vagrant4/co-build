# Production Operations Checklist

Complete this before the first real pilot account. Blank means unverified.

| Control | Owner record |
| --- | --- |
| Neon project |  |
| Production branch |  |
| Preview branch |  |
| Restore window |  |
| Snapshot schedule |  |
| Last restore drill date |  |
| Restore drill result/location |  |
| Pooled endpoint confirmed |  |
| Direct migration endpoint restricted |  |
| Vercel project linked |  |
| Private Blob store confirmed |  |
| Private Blob deletion tested |  |
| Runtime monitoring enabled | Vercel Runtime Logs and Sentry configuration verified 15 Aug 2026 |
| Persistent error alerts enabled | Sentry plus authenticated Resend operations-alert endpoint configured |
| External `/api/health` uptime check | GitHub `production-uptime.yml`; latest run passed and live endpoint returned HTTP 200 on 15 Aug 2026 |
| Backup owner |  |
| Incident owner |  |
| Unscanned-file risk accepted or scanner configured | Cloudmersive configured; 0 unscanned private uploads; account usage verified 15 Aug 2026 |

## Routine Checks

Run `npm.cmd run ops:report -- --json` before and after each release. The report contains aggregate counts only; it omits names, emails, contact details, object keys, database URLs, and credentials.

- Around 50 paid subscribers: review queries, indexes, connections, storage alerts, cost, pagination, and operational workload.
- At 100 paid subscribers: add centralized monitoring, background jobs, retry queues, reconciliation automation, and capacity tests.
- Any stale uploads or missing metadata: keep uploads disabled and investigate before accepting another file.
- Any failed health check or restore drill: stop the pilot until the failure is understood.

## Automated Schedule

- Every 15 minutes: GitHub checks the public database-aware health endpoint and opens or closes an incident issue.
- Daily: Vercel maintenance clears stale reservations and rate limits, delivers queued email, executes approved retention, checks private Blob storage, verifies the audit chain, and sends aggregate operations alerts.
- Nightly: GitHub exports, validates, encrypts, checksums, and retains a PostgreSQL backup for 14 days.
- Monthly: GitHub restores the latest encrypted backup into a disposable database, verifies the application tables, removes plaintext recovery material, and deletes the temporary database.
- Every pull request and production-branch push: CI runs database validation, migrations, authorization tests, dependency audit, production build, and the desktop/mobile renter-host-admin workflow.

Alerts deliberately contain aggregate counts only. They must never include names, email addresses, contact details, payment references, object keys, database URLs, or credentials.

Vercel Runtime Logs remain the initial runtime view. Sentry configuration and the authenticated operations-alert endpoint are present in Vercel. The latest uptime, encrypted-backup, restore-drill, and public-launch-evidence workflows passed before this checklist was updated on 15 Aug 2026.
