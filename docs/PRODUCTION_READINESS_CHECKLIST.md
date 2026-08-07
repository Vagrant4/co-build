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
| Needed | Email delivery | False email claims were removed; no provider is connected | Add transactional email provider and verified delivery state |
| Done | Core rate limiting | Booking, chat, payment, agreement, privacy, and upload submissions use persistent account-scoped limits | Add edge/WAF controls before public scale |
| Done | Production migrations | Separate PostgreSQL migration tree and `migrate deploy` | Apply through controlled release process |
| Needed | Legal approval | Versioned dual-party acceptance and privacy request controls are implemented | Singapore lawyer must approve the exact version and owner must set the release gate |

## Medium

| Status | Item | Evidence | Required action |
| --- | --- | --- | --- |
| Planned | Search performance | Filters run after loading listing records | Push filtering into Prisma queries |
| Planned | Dashboard pagination | Admin dashboard uses broad `findMany()` calls | Add pagination, tabs, and filters |
| Done | Upload validation | Server validates bytes, MIME, extension, dimensions, size, checksum, and scan status | Add malware scanner or record pilot risk acceptance |
| Planned | Contact policy hardening | Regex-only contact blocking | Add moderation review, violation records, and reporting |
| Planned | Notification model | No email/chat notification persistence | Add notification table and retry jobs |
| Done | Audit integrity | Sensitive mutations and authenticated audit events share Prisma transactions | Add tamper-evident archival before regulated use |
| Planned | Demo data separation | Showcase records are mixed with deploy workflow | Separate demo, staging, and production seeds |
| Needed | Monitoring | Structured redacted logs, health route, and release-gated monitoring URLs exist | Connect the real error project and uptime alert recipients |

## Low

| Status | Item | Evidence | Required action |
| --- | --- | --- | --- |
| Planned | Schema cleanup | `experienceLevel`, `landlordApproval`, `insuranceStatus` remain | Remove or rename with migration |
| Planned | Factory type naming | Schema uses `Zoning`; UI says type/factory type | Rename when safe |
| Planned | Listing photo handling | Uploaded listing photo is stored but fallback URL is used | Render uploaded listing photos after object storage migration |
| Done | Dashboard copy | Demo labels and role switching are conditional on demo mode | Retain pilot-mode UI checks |
| Planned | Empty states | Some dashboards rely on seeded data | Improve empty and first-use states |
| Planned | Brand polish | UI has improved but needs final design QA | Run visual review across mobile/desktop |

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
