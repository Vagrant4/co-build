# Database Schema Review

Last reviewed: 2026-07-25

## Verdict

The schema is suitable for an MVP demo and early internal workflow testing. It is not yet strong enough for public production because several business rules live only in application code, production migrations are not established, uploads are local paths, and demo seed data can be upserted during deployment.

## Schemas

| File | Provider | Purpose |
| --- | --- | --- |
| `prisma/schema.prisma` | SQLite | Local development and demo |
| `prisma/schema.postgres.prisma` | Postgres | Vercel/live deployment |

The two schemas are manually duplicated. This increases drift risk. A schema change must be applied to both files.

## Core Models

| Model | Purpose |
| --- | --- |
| `User` | Renter, host, and admin demo accounts, verification status, subscription status |
| `Listing` | Fabrication space details, pricing, deposits, safety rules, host relation, status |
| `EquipmentAddon` | Billable add-ons such as tools and machines |
| `ListingEquipment` | Many-to-many relation between listings and add-ons |
| `Booking` | Rental request, risk level, approval/payment/check-in/check-out status, totals |
| `BookingAddon` | Add-ons selected at booking time with captured price |
| `Upload` | Verification, listing photo, floor plan, check-in, and check-out file records |
| `ApprovalEvent` | Admin/host/user approval and status-change event log |
| `AdditionalRequirement` | Renter add-on request, host quote, contract text, payment status |
| `BookingMessage` | Chat after booking exists |
| `ListingMessage` | Pre-deal chat on listing detail |

## Positive Findings

- Booking totals store rental, deposit, cleaning, add-on, and grand total separately.
- Booking add-ons capture `priceAtBooking`, which protects historical totals from future add-on price changes.
- Booking and additional requirement statuses are represented as explicit enums.
- Messages have indexes on `[bookingId, createdAt]` and `[listingId, createdAt]`.
- User emails are unique.
- Listing slugs are unique.
- Delete cascades exist for many child records tied to bookings/listings.

## Critical Issues

### 1. Production migrations are not established

The production deployment command uses:

```bash
prisma db push --schema prisma/schema.postgres.prisma --skip-generate
```

`db push` is useful for prototyping but bypasses reviewed migration history. Production needs `prisma migrate deploy` with Postgres migrations committed and reviewed.

### 2. Showcase seed data runs in the production build path

`vercel-build` runs `npm run db:seed:if-empty`. The `seed-if-empty` script counts rows but still calls `seedDemoData(prisma, { reset: false })` every time. That upserts demo users, listings, equipment, bookings, messages, uploads, and subscriptions.

This is unsafe once real data exists.

### 3. Upload records store local paths

`Upload.localPath` stores filesystem paths from `src/lib/uploads.ts`. On Vercel, local filesystem writes are not durable product storage. It also does not provide access control, signed URLs, retention policy, or malware scanning.

### 4. Authorization is not represented in the schema

The schema has roles, but no session, account membership, password identity, OAuth identity, or permission table. Production authorization cannot be audited from the database.

## High Issues

### 1. JSON string fields should become structured tables or native JSON

`Listing` stores these as strings:

- `loadingAccessJson`
- `amenitiesJson`
- `permittedWorkJson`
- `prohibitedWorkJson`
- `safetyRulesJson`
- `photoUrlsJson`

For Postgres, use `Json` or normalized tables where search/filter/reporting matters.

### 2. Search and dashboard indexes are incomplete

Add indexes for common filters and dashboard queries:

- `Listing.status`
- `Listing.location`
- `Listing.sizeSqft`
- `Listing.zoning`
- `Listing.powerType`
- `Listing.hostId`
- `Booking.userId`
- `Booking.listingId`
- `Booking.status`
- `Booking.riskLevel`
- `Upload.userId`
- `Upload.bookingId`
- `Upload.listingId`
- `ApprovalEvent.createdAt`

### 3. Stale fields remain after UI changes

The user asked to remove insurance and landlord approval from the listing form, but the schema still has:

- `Listing.landlordApproval`
- `Listing.insuranceStatus`

The code writes placeholder values. Either remove the fields in a migration or rename them to internal review fields with clear meaning.

### 4. `experienceLevel` remains after UI removal

The create-account UI removed experience level, but `User.experienceLevel` remains and demo seed data still populates it. Remove or keep only if there is a confirmed future need.

### 5. No durable notification model

Generated contract text stores `emailedTo` and `emailedAt`, but no email provider delivery ID, status, bounce reason, or retry state exists.

### 6. Payment proof is weakly modeled

The subscription and booking flows store payment references/statuses but do not store proof uploads, bank reconciliation state, reviewer identity, or payment ledger rows.

## Medium Issues

- `ApprovalEvent` is useful but not immutable. Admin actions can be created by unprotected server actions.
- Booking status transitions are controlled in code, not constrained by database rules.
- The enum `Zoning` still represents factory type as `B1`, `B2`, and `UNKNOWN`; UI copy says factory type and office, but schema does not include `OFFICE`.
- `SpaceType` still stores maker/small/medium/large bay even though UI now emphasizes required square feet. This is acceptable internally but should not drive user-facing copy.
- `durationDays` is an `Int`; if custom duration is added, pricing and quote logic need a formal model rather than arbitrary integers.

## Recommended Schema Work Before Production

1. Create real Postgres migrations and stop using production `db push`.
2. Remove demo seeding from production build.
3. Add authentication/session/account tables or integrate an auth provider with durable user identity mapping.
4. Add indexes for listing search, dashboards, exports, messages, uploads, and approvals.
5. Replace local upload paths with object-storage keys, bucket, content type, size, checksum, scan status, visibility, and owner.
6. Add notification delivery records.
7. Add payment/subscription ledger records.
8. Decide whether `experienceLevel`, `landlordApproval`, and `insuranceStatus` are removed or renamed.
9. Add `OFFICE` to a renamed `FactoryType` enum if office type remains product scope.

## Suggested Migration Standard

- Use one Prisma schema for production as the source of truth.
- Generate migrations locally against Postgres.
- Review migration SQL before merge.
- Run `prisma migrate deploy` in production.
- Never run destructive migrations without a fresh database backup and rollback plan.
