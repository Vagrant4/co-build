# Performance And Scalability Notes

Last reviewed: 2026-07-25

## Verdict

The current implementation is acceptable for a light booking pilot and demo dataset. It will need database indexing, pagination, object storage, background jobs, and observability before larger subscriber growth.

## Current Performance Profile

The app currently works by:

- Rendering most pages server-side through Next.js App Router.
- Reading from Prisma on each dynamic dashboard/search route.
- Filtering listings in application code after loading listing records.
- Loading dashboard datasets with broad `findMany()` calls.
- Saving uploads through server actions to local disk.
- Running demo seed upserts during the Vercel build path.

This is simple and fast enough for a small controlled pilot, but it is not designed for high volume.

## Light Booking Definition

For the first few months, "light booking" should mean:

- Fewer than 50 active paying subscribers.
- Fewer than 200 total users.
- Fewer than 100 active listings.
- Fewer than 500 bookings.
- File uploads kept low and manually reviewed.
- Admin review done manually.

When active subscribers reach 50, start the heavier database/storage migration work. When active subscribers reach 100, do not delay it.

## Bottlenecks

### Search

`getListings()` loads all listing records and maps them into domain objects before filtering. This is fine for tens of listings. It is inefficient for thousands.

Needed:

- Push filters into Prisma queries.
- Add indexes for `status`, `location`, `sizeSqft`, `zoning`, and `powerType`.
- Normalize or index equipment/loading filters.
- Add pagination and sorting.

### Dashboards

Admin dashboard loads users, listings, bookings, uploads, approval events, and equipment. Host and user dashboards load full related data.

Needed:

- Pagination.
- Status tabs.
- Date filters.
- Aggregated metrics queries.
- Separate detail fetches from list fetches.

### Chat

Chat currently renders server-side with forms and page revalidation. This is workable for low traffic but will feel slow for active conversations.

Needed:

- Paginated message history.
- Realtime transport or polling.
- Message rate limits.
- Notification delivery.
- Moderation tooling.

### Uploads

Uploads pass through server actions and local disk.

Needed:

- Direct-to-object-storage uploads.
- Signed URLs.
- Virus/malware scanning.
- Max file size per upload type.
- Background processing for thumbnails and metadata.

### Database Connections

Vercel serverless deployments need pooled Postgres connections. Use a pooled `DATABASE_URL` where possible.

Needed:

- Connection pooling.
- Prisma Accelerate or provider-side pooler if required.
- Database metrics for connection count, slow queries, and errors.

## Subscriber Growth Trigger

Notify the business owner and move from light booking to a heavier production setup when any of these happen:

- 50 active paid subscribers.
- 100 registered renter/host accounts.
- 100 approved listings.
- 500 bookings.
- More than 1 GB of uploaded files.
- Admin review takes more than 30 minutes per day.
- Any production data-loss, privacy, upload, or payment dispute incident.

## Recommended Scaling Roadmap

### Stage 1: Private Demo

- Vercel preview or protected production deployment.
- Postgres for shared demo data.
- Demo seed data enabled.
- No real documents.

### Stage 2: Controlled Pilot

- Real auth.
- Protected admin.
- Private object storage.
- Production seed disabled.
- Manual payment/subscription review.
- Daily database backup.
- Error monitoring enabled.

### Stage 3: Early Production

- Prisma migrations only.
- Indexed search and dashboards.
- Paginated admin exports.
- Email notifications.
- Rate limiting.
- Upload scanning.
- Basic analytics and funnel tracking.

### Stage 4: Marketplace Scale

- Queue-based email/upload/payment workflows.
- Realtime chat.
- Moderation dashboard.
- Separate reporting database or materialized views.
- Automated subscription renewal reminders.
- SLA monitoring and incident runbooks.

## Cost-Control Notes

Close-to-zero budget is possible only for demos and low usage:

- Vercel free/hobby for app hosting.
- Neon/Supabase/Railway free tier for small Postgres.
- Object storage free tier or low-cost pay-as-you-go.
- Manual company-account payment verification.
- No paid SMS, no heavy media processing, no native mobile app.

The cost jump usually comes from file storage, email volume, database growth, and monitoring requirements, not from the Next.js app itself.
