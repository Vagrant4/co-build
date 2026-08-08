# Architecture Overview

Last reviewed: 2026-07-25

## System Purpose

Co-Build is a Singapore-first marketplace MVP for short-term fabrication space rental. It lets renters search for workspaces, chat with hosts, request bookings, accept safety rules, upload verification/check-in/check-out files, submit company-account payment references, and manage additional requirements. Hosts can submit listings and approve bookings. Admin can approve listings, users, subscriptions, high-risk work, pricing, and unsafe-user controls.

## Current Architecture

```text
Browser
  |
  | Next.js App Router pages and forms
  v
Server Actions and protected route handlers
  |
  +-- Prisma Client -> SQLite demo / managed PostgreSQL pilot
  |
  +-- short-lived restricted token -> Vercel Private Blob
                                      |
                                      +-- authorized upload-ID download route
```

## Main Technology Choices

| Layer | Current implementation |
| --- | --- |
| App framework | Next.js App Router with TypeScript |
| Styling | Tailwind CSS and local components |
| Database ORM | Prisma 6.19.3 |
| Local database | SQLite at `prisma/dev.db` |
| Hosted database | Postgres via `prisma/postgres/schema.prisma` and committed migrations |
| Hosting | Vercel |
| Uploads | Direct client uploads to Vercel Private Blob; disabled by default |
| Auth | Demo switching only in demo; Clerk-managed sessions in pilot/production |
| Payments | Simulated company-account payment references |
| Email | Not implemented; contract text is stored/displayed only |

## User-Facing Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing/search entry, value proposition, pricing, equipment, safety |
| `/search` | Filter approved listings by location, size band, work type, duration, equipment, loading, power, and factory type |
| `/listings/[slug]` | Listing detail, pricing, safety information, pre-deal chat |
| `/checkout/[listingId]` | Booking request form with duration, work type, add-ons, verification upload, and safety acceptance |
| `/dashboard/user` | Renter bookings, chat, additional requirements, payment proof, check-in/check-out uploads |
| `/dashboard/host` | Host listings, booking approvals, pre-deal chat, additional requirement rate approval |
| `/dashboard/host/listings/new` | Host listing submission form |
| `/dashboard/admin` | Demo admin dashboard |
| `/dashboard/admin/export/*` | CSV export routes |
| `/create-account` | Demo account creation for renter/host |
| `/pricing`, `/safety`, `/faq`, `/contact` | Static/support pages |

## Core Modules

| File | Role |
| --- | --- |
| `app/actions.ts` | Main mutation layer for accounts, bookings, listings, subscriptions, chat, uploads, approvals |
| `src/lib/fabrication.ts` | Pricing, risk classification, status transitions, search filtering, contract text, subscription periods |
| `src/lib/repository.ts` | Listing/dashboard data fetching and Prisma-to-domain mapping |
| `src/lib/uploads.ts` | Upload policies, limits, declarations, and immutable key generation |
| `src/lib/upload-service.ts` | Staged Blob verification and database lifecycle |
| `src/lib/upload-authorization.ts` | Upload ownership and participant policy |
| `src/lib/storage/*` | Private object storage adapter |
| `src/lib/contact-policy.ts` | Regex-based direct-contact blocking for chat |
| `src/lib/seed-data.ts` | Static listing/equipment/work-type data |
| `prisma/seed-demo.ts` | Showcase users, hosts, listings, bookings, messages, uploads |
| `prisma/seed-if-empty.ts` | Vercel build seed entrypoint |

## Booking Flow

```text
Renter searches
  -> opens listing
  -> chats with host before booking
  -> selects duration/work type/add-ons
  -> uploads verification if provided
  -> accepts safety rules
  -> booking created as PENDING_HOST
  -> host approves or rejects
  -> high-risk work routes to PENDING_ADMIN_HIGH_RISK
  -> admin approves high-risk work
  -> renter confirms company-account payment
  -> booking becomes PAID_CONFIRMED
  -> renter and host confirm deal on-platform
  -> renter uploads check-in photo
  -> renter uploads check-out photo
```

## Chat Model

There are two chat surfaces:

- `Conversation` and `ConversationMessage`: participant-scoped pre-deal chat on each listing.
- `BookingMessage`: booking-specific chat after a booking exists.

Both apply `containsRestrictedContactDetail()` to block common mobile numbers, email addresses, and direct-contact language. This is a demo safety control, not a complete moderation or compliance system.

## Current Trust Boundaries

The current app does not enforce real trust boundaries. It accepts demo account IDs and roles from form fields or query strings. That means:

- A visitor can switch renter/host demo accounts.
- Admin actions are not protected by a real admin session.
- CSV export routes do not require authentication.
- Several status changes trust submitted hidden inputs.

This is acceptable for demo flow visibility. It is not acceptable for public production.

## Data Storage

Local:

- SQLite database: `prisma/dev.db`
- Upload files: `uploads/`

Hosted:

- Postgres via `DATABASE_URL`
- Uploads still use local server filesystem unless changed

The hosted upload design must be replaced before real documents or photos are collected.

## Architecture Recommendations

Critical before public launch:

- Add real authentication and session management.
- Add role-based authorization for every dashboard, action, and export route.
- Move uploads to private object storage.
- Replace `db push` with migrations for production.
- Remove production demo seeding.

High priority:

- Add email delivery and notification records.
- Add audit log integrity for admin and payment actions.
- Enforce listing status and user subscription checks server-side.
- Add rate limiting and CSRF protection.
