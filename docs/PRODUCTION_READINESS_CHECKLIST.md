# Production Readiness Checklist

> This checklist originated at commit `3ac0774`. Phase 1 closed the identity boundary and Phase 2A implemented the private-storage and migration boundary. Use [PHASE_2A_IMPLEMENTATION_REPORT.md](PHASE_2A_IMPLEMENTATION_REPORT.md) as the current implementation record. Co-Build is still not production-ready.

Last reviewed: 2026-07-25

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
| Blocked | Payment integrity | Payment confirmation is simulated | Add proof submission, admin reconciliation, and ledger records |
| Needed | Production data safety | Reviewed migration tree and non-mutating build are implemented | Apply to separate Neon branch, configure backups, and complete restore drill |

## High

| Status | Item | Evidence | Required action |
| --- | --- | --- | --- |
| Needed | Listing visibility rules | Public listing detail is not status-restricted | Only expose approved listings publicly |
| Needed | Booking eligibility | Booking action does not check verification/subscription/suspension | Enforce account and listing eligibility in server action |
| Needed | Host ownership and role checks | Several actions trust `hostId`, `actorId`, or role fields | Bind all mutations to authenticated user |
| Needed | Admin export privacy | CSV exports include user/chat/booking data | Auth guard, audit log, minimization, pagination |
| Needed | Email delivery | Contract "email" is stored text only | Add transactional email provider and delivery state |
| Needed | Rate limiting | No limits for chat/account/upload/export | Add route/action rate limits |
| Done | Production migrations | Separate PostgreSQL migration tree and `migrate deploy` | Apply through controlled release process |
| Needed | Legal and privacy documents | Safety rules exist, but public terms/privacy/retention are not complete | Add terms, privacy, data retention, dispute policy |

## Medium

| Status | Item | Evidence | Required action |
| --- | --- | --- | --- |
| Planned | Search performance | Filters run after loading listing records | Push filtering into Prisma queries |
| Planned | Dashboard pagination | Admin dashboard uses broad `findMany()` calls | Add pagination, tabs, and filters |
| Done | Upload validation | Server validates bytes, MIME, extension, dimensions, size, checksum, and scan status | Add malware scanner or record pilot risk acceptance |
| Planned | Contact policy hardening | Regex-only contact blocking | Add moderation review, violation records, and reporting |
| Planned | Notification model | No email/chat notification persistence | Add notification table and retry jobs |
| Planned | Audit integrity | Approval events can be written by unprotected actions | Use authenticated actor, append-only events, export logs |
| Planned | Demo data separation | Showcase records are mixed with deploy workflow | Separate demo, staging, and production seeds |
| Planned | Monitoring | No error/uptime/performance monitoring config | Add Vercel logs, Sentry or equivalent, uptime checks |

## Low

| Status | Item | Evidence | Required action |
| --- | --- | --- | --- |
| Planned | Schema cleanup | `experienceLevel`, `landlordApproval`, `insuranceStatus` remain | Remove or rename with migration |
| Planned | Factory type naming | Schema uses `Zoning`; UI says type/factory type | Rename when safe |
| Planned | Listing photo handling | Uploaded listing photo is stored but fallback URL is used | Render uploaded listing photos after object storage migration |
| Planned | Dashboard copy | Demo labels remain visible | Use environment-aware demo banners |
| Planned | Empty states | Some dashboards rely on seeded data | Improve empty and first-use states |
| Planned | Brand polish | UI has improved but needs final design QA | Run visual review across mobile/desktop |

## Confirmed Done

| Status | Item | Evidence |
| --- | --- | --- |
| Done | Core marketplace pages | Homepage, search, listing detail, checkout, dashboards, pricing, safety, FAQ, contact |
| Done | Pricing calculation | Domain tests cover duration pricing, add-ons, deposit, cleaning fee, totals |
| Done | Risk routing | Domain tests cover B1/B2/admin-required work |
| Done | Chat surfaces | Listing chat and booking chat exist with contact-detail blocking |
| Done | Additional requirements | Renter request, host quote, generated contract text, and payment confirmation flow exist |
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
