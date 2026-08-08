# Production Readiness Checklist

> This checklist originated at commit `3ac0774`. Phase 1 closed the identity boundary, Phase 2A implemented private storage and migrations, and the pilot readiness automation pass added dated inventory, agreement acceptance, payment reconciliation, privacy controls, and release gates. Co-Build is still not production-ready.

Last reviewed: 2026-08-08

## Status Key

| Status | Meaning |
| --- | --- |
| Blocked | Must be fixed before public production |
| Needed | Required before real users or real money workflows |
| Planned | Should be scheduled before wider rollout |
| Done | Confirmed in the current repo |

## Critical

| Status | Item | Evidence | Required action |
| --- | --- | --- | --- |
| Done | Real authentication boundary | Clerk sessions and server-derived users in pilot/production | Complete owner Clerk configuration before pilot |
| Done | Admin authorization | Admin pages, exports, and mutations require authenticated admin | Retain regression tests |
| Needed | Private durable uploads | Private Blob flow is implemented; external store/scanner decision is unverified | Connect Private Blob and complete storage acceptance tests before enabling uploads |
| Done | Payment integrity foundation | Booking, subscription, and add-on references create ledger records; booking payments require admin reconciliation | Complete bank-operation rehearsal before pilot |
| Needed | Production data safety | Reviewed migration tree and non-mutating build are implemented | Apply to separate Neon branch, configure backups, and complete restore drill |

## High

| Status | Item | Evidence | Required action |
| --- | --- | --- | --- |
| Done | Listing visibility rules | Public detail, checkout, search, and conversation starts require approved listings and eligible hosts | Retain public eligibility regression tests |
| Done | Booking eligibility | Server actions require approved, active, unsuspended renter and host accounts | Retain authorization regression tests |
| Done | Host ownership and role checks | Sensitive actions derive actors from managed sessions and verify resource ownership | Retain authorization regression tests |
| Done | Admin export privacy | Exports are admin-only, rate-limited, audited, formula-neutralized, and chat exports contain metadata rather than message bodies | Add pagination before wider scale |
| Needed | Email delivery | Retryable email outbox and delivery state are implemented | Connect Resend, verify sender DNS, and test delivery/bounce operations |
| Done | Core rate limiting | Booking, chat, payment, agreement, privacy, and upload submissions use persistent account-scoped limits | Add edge/WAF controls before public scale |
| Done | Production migrations | Separate PostgreSQL migration tree and `migrate deploy` | Apply through controlled release process |
| Needed | Legal approval | Versioned dual-party acceptance and privacy request controls are implemented | Singapore lawyer must approve the exact version and owner must set the release gate |

## Medium

| Status | Item | Evidence | Required action |
| --- | --- | --- | --- |
| Done | Search performance | Public filters execute in Prisma with a bounded result set | Add database-specific search indexes after production query metrics exist |
| Done | Dashboard pagination | Admin data is paginated and renter/host views are bounded | Add section-specific filters after pilot usage identifies the useful dimensions |
| Done | Upload validation | Bytes, MIME, extension, dimensions, size, checksum, scanner state, and rejection cleanup are implemented | Connect and test the production scanner or record pilot risk acceptance |
| Done | Contact policy hardening | Blocking, privacy-safe violation records, participant reports, and admin moderation exist | Configure alert ownership and review the queue daily |
| Done | Notification model | In-app notifications, email outbox, retries, delivery state, and aggregate alerts exist | Connect and verify the email provider and alert webhook |
| Done | Audit integrity | Atomic audit events and verifiable SHA-256 checkpoints exist | Retain checkpoint evidence outside the application database before regulated use |
| Done | Demo data separation | Demo seeds fail outside `APP_MODE=demo`; production starts empty | Keep production seed execution disabled |
| Needed | Monitoring | Structured redacted logs, health route, and release-gated monitoring URLs exist | Connect the real error project and uptime alert recipients |

## Low

| Status | Item | Evidence | Required action |
| --- | --- | --- | --- |
| Done | Schema cleanup | Obsolete profile/listing fields were removed with forward migrations | Retain migration coverage |
| Done | Factory type naming | Database enum and field use `FactoryType` / `factoryType` | Keep domain safety classification terminology separate |
| Done | Listing photo handling | Approved, safe listing photos render through a constrained public proxy | Complete real Blob/scanner acceptance testing |
| Done | Dashboard copy | Demo labels and role switching are conditional on demo mode | Retain pilot-mode UI checks |
| Done | Empty states | Renter and host dashboards handle clean accounts without showcase records | Retain clean-database browser checks |
| Done | Brand polish | Responsive overflow, image alternatives, loading, error, not-found, and mobile PWA checks are automated | Conduct owner visual acceptance on the Vercel preview |

## Confirmed Done

| Status | Item | Evidence |
| --- | --- | --- |
| Done | Core marketplace pages | Homepage, search, listing detail, checkout, dashboards, pricing, safety, FAQ, contact |
| Done | Pricing calculation | Domain tests cover duration pricing, add-ons, deposit, cleaning fee, totals |
| Done | Risk routing | Domain tests cover B1/B2/admin-required work |
| Done | Chat surfaces | Listing chat and booking chat exist with contact-detail blocking |
| Done | Additional requirements | Renter request, host quote, pilot add-on record, and payment confirmation flow exist |
| Done | Recurring subscription concept | S$5/month company-account payment reference and admin activation exist |
| Done | Demo showcase data | 10 hosts, 10 renters, listings, bookings, chats, and subscriptions are seeded |

## Public Launch Exit Criteria

Public launch is allowed only when:

1. All Critical items are Done.
2. All High items are Done or have a documented owner, due date, and risk acceptance.
3. A clean production database backup exists.
4. A restore drill has been performed.
5. Auth tests prove unauthorized users cannot access admin/export/mutation paths.
6. Upload tests prove files are private, durable, and permission checked.
7. Payment/subscription workflow has manual reconciliation steps documented.
8. Terms, privacy, safety, cancellation, damage, and dispute policies are live.
