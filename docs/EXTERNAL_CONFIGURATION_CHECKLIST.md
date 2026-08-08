# External Configuration Checklist

These steps require account ownership or a professional attestation and cannot be fabricated by repository automation.

- [ ] Clerk production instance created; verified email sign-in enabled; production domain and redirects configured.
- [ ] First administrator linked to the correct `clerk:<user_id>` identity through a controlled database operation.
- [ ] Separate Neon production branch connected with pooled `DATABASE_URL` and direct `DIRECT_URL`.
- [ ] Neon backups enabled and `npm run db:restore-drill` evidence retained.
- [ ] Private Vercel Blob store connected and smoke test passed.
- [ ] Malware scanner endpoint connected; clean and malicious fixtures tested.
- [ ] Resend domain verified; API key and sender configured; delivery and bounce handling tested.
- [ ] Error-monitoring project, uptime monitor, and alert recipients configured.
- [ ] Company legal name, UEN, bank, account number, reconciliation owner, and refund authority confirmed.
- [ ] Singapore counsel approved the exact `LEGAL_DOCUMENT_VERSION`.
- [ ] Privacy, security, operations, backup, and support owners named.
- [ ] Production domain, DNS, TLS, and email DNS records approved by the domain owner.
- [ ] Invite-only pilot list approved. Public launch remains a separate decision.
