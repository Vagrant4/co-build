# Clerk Setup for the Invite-Only Pilot

The owner must complete these external steps. Do not set `APP_MODE=pilot` or `production` until both Clerk keys are present; the application intentionally fails closed without them.

## 1. Create the Clerk Application

1. Sign in to the Clerk Dashboard and create a Co-Build application.
2. Use email as the required sign-in identifier.
3. Enable an email verification method managed by Clerk.
4. In the Clerk Dashboard, enable Restricted sign-up mode so only invited users can register.
5. Enable the setting that prevents end users from changing their email identifier after sign-up for the controlled pilot.

## 2. Configure Local or Preview Pilot Keys

Copy the development instance keys from Clerk Dashboard > API keys into `.env.local`:

```bash
APP_MODE="pilot"
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
```

Keep `.env.local` out of git. Restart the Next.js server after changing the keys.

## 3. Configure Vercel

1. Open Vercel > Co-Build > Settings > Environment Variables.
2. Add `APP_MODE=pilot` to Preview and the invite-only pilot deployment.
3. Add the matching Clerk publishable and secret keys to the same Vercel environments.
4. Add `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` and `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`.
5. Keep `APP_MODE=demo` only on a deliberately separate showcase deployment.
6. Redeploy after the variables are saved.

Use separate Clerk applications or instances for preview/staging and real production. Do not reuse test keys for a production instance.

## 4. Invite Pilot Users

1. Open Clerk Dashboard > Invitations.
2. Invite each renter, host, and initial administrator by email.
3. The invitee completes Clerk sign-up, then opens `/create-account` to create the Co-Build profile mapping.
4. A renter or host chooses their account type only during first profile creation. Later profile edits cannot change role, verification, suspension, or subscription state.

## 5. Bootstrap the First Administrator

The first administrator cannot self-promote. After that person accepts a Clerk invitation and completes `/create-account`, use the managed PostgreSQL console during a maintenance window:

```sql
BEGIN;

SELECT "id", "email", "authProviderId", "role"
FROM "User"
WHERE lower("email") = lower('owner@example.com');

UPDATE "User"
SET "role" = 'ADMIN',
    "verificationStatus" = 'APPROVED',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE lower("email") = lower('owner@example.com')
  AND "authProviderId" LIKE 'clerk:%';

COMMIT;
```

Confirm the `SELECT` returns exactly one mapped user before running the `UPDATE`. Record this one-time bootstrap in the database provider's operations log. Every later administrative change must be performed through an authenticated ADMIN account.

## 6. Verify the Boundary

1. Signed out: `/dashboard/user`, `/dashboard/host`, and `/dashboard/admin` return 401.
2. Renter: renter dashboard works; host/admin dashboards and admin exports return 403.
3. Host: host dashboard and owned listings work; renter/admin dashboards return 403.
4. Admin: admin dashboard and exports work, and an `AdminExportEvent` is created for each export.
5. A second renter cannot read the first renter's listing conversation.
6. Pending, rejected, draft, suspended, or ineligible-host listings return 404 from detail and checkout.

## 7. Move from Pilot to Production

1. Activate a Clerk production instance and configure the owned production domain.
2. Replace Vercel test keys with Clerk production keys.
3. Set `APP_MODE=production` only after the Phase 2 blockers are closed.
4. Redeploy and repeat the verification checklist above.

Co-Build creates the durable Prisma user mapping during `/create-account`; a Clerk webhook is not required for Phase 1. Add a verified webhook later only if background identity synchronization becomes necessary.
