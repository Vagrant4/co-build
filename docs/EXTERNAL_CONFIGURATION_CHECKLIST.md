# External Configuration Checklist

These steps require account ownership or a professional attestation and cannot be fabricated by repository automation.

- [ ] Clerk production instance created; verified email sign-in enabled; production domain and redirects configured.
- [ ] First administrator linked to the correct `clerk:<user_id>` identity through a controlled database operation.
- [ ] Separate Neon production branch connected with pooled `DATABASE_URL` and direct `DIRECT_URL`.
- [ ] Neon backups enabled and `npm run db:restore-drill` evidence retained.
- [ ] Private Vercel Blob store connected and smoke test passed.
- [x] Malware scanner endpoint connected; Cloudmersive Free Tier credential and live API use verified on 15 Aug 2026. Clean and malicious fixture handling is enforced by the upload gate.
- [x] Resend domain verified; `spaceoncall.com` is verified and production listing, subscription, approval, and setup messages show delivered status as of 15 Aug 2026.
- [x] Error monitoring, operations alerts, and uptime checks configured. Sentry and alert environment variables are present; the latest scheduled uptime run passed on 15 Aug 2026 Singapore time.
- [ ] Company legal name, UEN, bank, account number, reconciliation owner, and refund authority confirmed.
- [ ] Singapore counsel approved the exact `LEGAL_DOCUMENT_VERSION`.
- [ ] Privacy, security, operations, backup, and support owners named.
- [ ] Production domain, DNS, TLS, and email DNS records approved by the domain owner.
- [ ] Invite-only pilot list approved. Public launch remains a separate decision.
