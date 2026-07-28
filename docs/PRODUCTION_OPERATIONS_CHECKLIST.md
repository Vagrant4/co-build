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
| Runtime monitoring enabled |  |
| Persistent error alerts enabled |  |
| External `/api/health` uptime check |  |
| Backup owner |  |
| Incident owner |  |
| Unscanned-file risk accepted or scanner configured |  |

## Routine Checks

Run `npm.cmd run ops:report -- --json` before and after each release. The report contains aggregate counts only; it omits names, emails, contact details, object keys, database URLs, and credentials.

- Around 50 paid subscribers: review queries, indexes, connections, storage alerts, cost, pagination, and operational workload.
- At 100 paid subscribers: add centralized monitoring, background jobs, retry queues, reconciliation automation, and capacity tests.
- Any stale uploads or missing metadata: keep uploads disabled and investigate before accepting another file.
- Any failed health check or restore drill: stop the pilot until the failure is understood.

Vercel Runtime Logs are the initial runtime view. Sentry is the selected persistent error-alerting candidate, but it is not configured by this branch; the owner must create the project, add the DSN in Vercel, set alert recipients, and verify a test event before pilot.
