# Co-Build Pilot Operations Runbook

Last reviewed: 2026-08-10

Co-Build remains fail-closed until the external owner controls in this document are configured and evidenced. Passing CI is not a public production approval.

## Daily Operations

1. Review `/dashboard/admin` for payment, privacy, moderation, listing, user, and high-risk booking queues.
2. Verify company-account references against the bank portal before selecting **Verify paid**.
3. Run `npm run ops:report` against the production database and retain only its aggregate, non-PII output.
4. Confirm the scheduled `/api/cron/maintenance` run delivered notifications, cleaned stale reservations, executed approved retention, verified audit checkpoints, and passed its private Blob write/read/delete check.
5. Review the `Production uptime monitor` GitHub workflow. It checks the database-aware health endpoint every 15 minutes, opens one incident issue after three failed attempts, and closes that issue after recovery.
6. Review the error-monitoring project. Escalate repeated 5xx, authentication failures, storage failures, or audit-checkpoint errors.

## Payment Reconciliation

1. Export a bank statement CSV containing `reference`, `amount`, `currency`, and optional `date` columns.
2. Run `npm run payments:reconcile -- <statement.csv>` in a controlled operator environment.
3. The command is deliberately dry-run only. Investigate every `UNMATCHED`, `AMBIGUOUS`, and `AMOUNT_MISMATCH` row.
4. In the authenticated admin dashboard, compare the private proof, bank reference, payer, amount, and currency.
5. Verify or reject the submitted payment. Never infer payment from a screenshot alone.
6. For duplicate references, reject both submissions until the bank transaction is unambiguously assigned.
7. Record refund and deposit decisions with a reconciliation/dispute note. Co-Build does not claim an automated bank transfer occurred.

## Subscription Renewal

1. Review accounts reaching `platformSubscriptionNextBilling` each day.
2. Require a new monthly bank reference; do not reuse the previous reference.
3. Verify the bank transaction before extending the subscription period.
4. Suspend marketplace actions when the subscription expires, while retaining access needed for existing obligations and privacy requests.

## Backup And Restore Drill

1. Confirm the `Nightly encrypted database backup` GitHub Actions workflow succeeded within the last 24 hours.
2. Keep `DATABASE_DIRECT_URL` and `BACKUP_ENCRYPTION_PASSPHRASE` only in GitHub Actions repository secrets. The passphrase must be unique, at least 32 characters, and stored in the company password manager.
3. The workflow validates a PostgreSQL custom-format dump, encrypts it, removes the plaintext file, and retains the encrypted artifact for 14 days.
4. Download one encrypted artifact for a quarterly restore drill. Verify its `.sha256` file before decrypting it in a controlled operator environment.
5. Create a disposable Neon database whose name includes `restore` or `drill`.
6. Install PostgreSQL client tools (`pg_dump`, `pg_restore`, and `psql`) on the operator machine.
7. Set `DIRECT_URL`, `RESTORE_DATABASE_URL`, and `CONFIRM_RESTORE_DRILL=RESTORE_TO_DISPOSABLE_TARGET` locally. Do not paste credentials or the backup passphrase into tickets or chat.
8. Run `npm run db:restore-drill` and confirm the reported migration count plus a read-only application query.
9. Delete the disposable target after evidence is retained. Set `RESTORE_DRILL_COMPLETED_AT` only after success.

The GitHub artifact is an additional pilot safeguard, not a replacement for a managed backup plan. Upgrade Neon recovery retention before the six-hour history window or 14-day artifact retention no longer meets the business recovery requirement.

## Privacy And Retention

1. Review access, correction, and deletion requests in the admin dashboard.
2. Check booking, payment, dispute, fraud, tax, and legal-hold obligations before deletion.
3. Approved retention execution deletes only expired rejected/deleted upload objects. It does not silently erase active evidence or accounts.
4. Account anonymisation and Clerk identity deletion require a reviewed deletion request and coordinated provider action.
5. Record the response in the privacy request and notify the requester through the platform.

## Safety And Moderation

1. Review blocked contact-sharing attempts and user-submitted chat reports.
2. Inspect only the minimum records needed. Blocked contact-message bodies are not retained.
3. Suspend accounts for repeated circumvention, unsafe work requests, harassment, fraud, or prohibited activity.
4. Preserve relevant audit and dispute evidence when a legal hold applies.

## Incident Response

1. Confirm impact using `/api/health`, Vercel runtime logs, error monitoring, and uptime history.
2. If identity or authorization is uncertain, set the affected deployment to maintenance/protected access and stop new bookings.
3. If uploads are affected, set `REAL_UPLOADS_ENABLED=false`.
4. If payment reconciliation is affected, stop verification actions and preserve submitted records.
5. Rotate compromised Clerk, Neon, Blob, scanner, email, cron, and monitoring credentials.
6. Restore service only after the failing control is tested. Record timeline, impact, decisions, and follow-up owner.

## Release Procedure

1. Require green unit, authorization, production-build, PostgreSQL migration, Playwright, and dependency-audit checks.
2. Run the pilot preflight with real Vercel environment variables.
3. Apply migrations through `npm run db:deploy:prod` before promoting the deployment.
4. Confirm the last scheduled private Blob smoke result and run scanner safe/unsafe fixture tests.
5. Run `npm run email:verify-provider` with the production email variables and require a verified sender domain before inviting pilot users.
6. Test real renter, host, and admin accounts without demo switching.
7. Confirm legal version, restore evidence, owner contacts, bank instructions, monitoring, email delivery, DNS, and TLS.
8. Release to invite-only pilot users first. Public production requires a separate owner approval.

## Human Attestations

- A Singapore lawyer must approve the exact published legal version.
- The company owner must confirm the bank account, UEN, payment instructions, and refund authority.
- The domain owner must approve DNS changes.
- The named privacy, security, operations, and backup owners must accept their roles.
