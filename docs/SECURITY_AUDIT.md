# Security Audit

> Baseline findings from commit `3ac0774`. See [PHASE_1_IMPLEMENTATION_REPORT.md](PHASE_1_IMPLEMENTATION_REPORT.md) for controls implemented after this audit and remaining blockers.

Last reviewed: 2026-07-25

## Verdict

The application is not safe for public production use in its current state. The main problem is not one isolated bug; it is the absence of a real security boundary. Demo role switching and form-submitted actor IDs are useful for showcasing flows, but they must be removed or protected before real users, documents, payments, or disputes are handled.

## Critical Findings

### CRITICAL-1: No real authentication or session enforcement

Current state:

- Renter and host dashboards use query-string account switching.
- Server actions accept `userId`, `hostId`, `actorId`, and `role` from forms.
- `/dashboard/admin` is a demo admin page, not a protected admin console.

Impact:

- A visitor can act as another demo user or host.
- Admin actions cannot be trusted.
- Payment, deal, listing, and verification state can be manipulated.

Required fix:

- Add real authentication.
- Bind every server action to the authenticated session user.
- Enforce role and ownership checks server-side.
- Remove demo account switching from any public deployment.

### CRITICAL-2: Admin mutation actions are not protected

Current state:

- Listing approval, user verification, user suspension, subscription activation, equipment pricing, listing pricing, and high-risk booking approval are server actions exposed through demo UI.
- Some actions use fixed `demo-admin` as actor.

Impact:

- A non-admin can trigger admin changes if the action endpoint is reachable.
- Audit events may falsely attribute decisions to the demo admin.

Required fix:

- Add an `requireAdmin()` guard to every admin action.
- Verify CSRF protection.
- Log real admin identity.
- Add tests that non-admin users receive a hard failure.

### CRITICAL-3: Admin CSV exports are public route handlers

Current state:

- `/dashboard/admin/export/users.csv`
- `/dashboard/admin/export/listings.csv`
- `/dashboard/admin/export/bookings.csv`
- `/dashboard/admin/export/messages.csv`

These routes do not check authentication or admin role.

Impact:

- User emails, UEN, booking records, chat messages, pricing, and operational data can be exported by anyone who can reach the routes.

Required fix:

- Add admin auth checks to every export route.
- Add audit logging for exports.
- Consider signed export jobs instead of direct GET routes.
- Remove personal data from exports unless required.

### CRITICAL-4: Uploads are local, unverified, and not private

Current state:

- `saveUpload()` writes files to `uploads/<prefix>/`.
- Server action body limit is 10 MB, but there is no explicit MIME validation, file extension validation, content scanning, owner permission check, or durable private storage.

Impact:

- Uploaded files may be lost on serverless hosting.
- Sensitive verification and dispute files may not be protected.
- Malicious or oversized files may be accepted within server-action limits.

Required fix:

- Use private object storage such as S3, R2, Vercel Blob, or UploadThing.
- Store object keys, size, content type, checksum, uploader, owner, and scan status.
- Use signed upload/download URLs.
- Restrict uploads by role, booking/listing ownership, type, count, and size.

### CRITICAL-5: Payment and deal confirmations are simulated but can look real

Current state:

- Booking payment confirmation changes status to `PAID_CONFIRMED` without payment proof validation.
- Subscription activation can be approved by unprotected admin action.
- Deal confirmation trusts form fields.

Impact:

- Records can falsely show paid or confirmed.
- Users could rely on inaccurate booking or contract status.

Required fix:

- Separate "proof submitted" from "payment verified".
- Require authenticated actors and admin review.
- Store payment references/proof/ledger entries.
- Add admin reconciliation workflow for company-account payments.

## High Findings

### HIGH-1: Listing visibility is inconsistent

`filterListings()` filters for `APPROVED`, but `getApprovedListings()` returns all listings when called without filters because it delegates to `getListings(filters)`. Listing detail lookup also does not restrict status.

Impact:

- Pending, rejected, or suspended listings may be visible or bookable through direct routes or unfiltered calls.

Required fix:

- Make `getApprovedListings()` always apply `status: APPROVED`.
- Make public listing detail and checkout require approved status.
- Add tests for pending/rejected/suspended listing access.

### HIGH-2: Users can create bookings without verification/subscription enforcement

Current state:

- `createBookingAction()` does not require approved verification, active subscription, or unsuspended user status.
- It does not require the listing host to be active or approved.

Impact:

- Unapproved or suspended accounts may book.

Required fix:

- Enforce verification, subscription, and suspension checks before booking.
- Add host/listing eligibility checks.

### HIGH-3: Contact policy is regex-only

Current state:

- Chat blocks obvious emails, phone-like numbers, and direct-contact phrases.

Impact:

- Users can evade the policy with spacing, words, images, encoded contacts, or indirect instructions.

Required fix:

- Keep the regex as a first pass.
- Add moderation review queues, reporting, rate limits, and escalation.
- Treat repeated violations as suspension signals.

### HIGH-4: No rate limiting or anti-automation controls

Current state:

- Account creation, chat, uploads, booking requests, and admin exports are not rate-limited.

Impact:

- Spam accounts, chat abuse, upload abuse, and export scraping are possible.

Required fix:

- Add rate limits by session, user, IP, action type, and route.
- Add captcha or email verification to account creation.

### HIGH-5: No transactional email delivery

Current state:

- UI text says contracts are emailed, but the app only stores generated contract text and email metadata.

Impact:

- Users may believe legally relevant documents were sent when they were not.

Required fix:

- Integrate an email provider.
- Store delivery IDs and statuses.
- Make UI copy accurate until delivery exists.

### HIGH-6: No privacy or retention controls for personal data

Current state:

- User records include full name, mobile, email, company, UEN, work type, and uploads.
- No retention, deletion, consent, or export policy is enforced.

Impact:

- Privacy compliance risk increases quickly after real users join.

Required fix:

- Define retention schedules.
- Add account deletion and data export processes.
- Limit admin exports.
- Write privacy policy and terms before public launch.

### HIGH-7: Audit log identity is not trustworthy

Current state:

- `ApprovalEvent.actorId` can come from form fields or fixed demo IDs.

Impact:

- The audit trail cannot be trusted during a dispute.

Required fix:

- Use authenticated session identity only.
- Record IP/user agent where appropriate.
- Make destructive/security-sensitive audit records append-only.

### HIGH-8: Demo seed data can overwrite showcase records in live environments

Current state:

- The build path upserts fixed demo records on deploy.

Impact:

- Production demo data can be reintroduced or mutated unintentionally.

Required fix:

- Separate demo seed, staging seed, and production seed.
- Make production seed opt-in and minimal.

## Medium Findings

- No explicit CSRF strategy is documented.
- Upload accepted file types rely mainly on client `accept` attributes and server action body limit.
- Admin exports are unpaginated and may expose more data than necessary.
- Generated contracts are plain text without versioned legal template control.
- Listing photo uploads are stored as upload records but new listings still use fallback image URLs.
- No centralized authorization helper exists.
- No error monitoring or security alerting is configured.
- No backup/restore drill is documented outside this new pass.

## Low Findings

- Some schema field names no longer match UI language.
- Demo labels remain visible in dashboards.
- Several workflows need more explicit empty and failure states.
- Contact-policy copy is uppercase in chat and may feel heavy after launch.
- Favicon/app-icon review should be included before brand launch.
- Static demo assets should be separated from user-uploaded assets.

## Minimum Security Definition For Public Launch

Public launch requires all of the following:

- Authenticated renter, host, and admin accounts.
- Role and ownership checks on every server action and route handler.
- Protected admin dashboard and CSV exports.
- Private durable upload storage.
- Verified subscription/payment proof workflow.
- Production-safe migrations and seed process.
- Rate limiting.
- Email verification and transactional email.
- Privacy policy, terms, safety acceptance, and data retention process.
- Automated tests that prove unauthorized users cannot perform restricted actions.
