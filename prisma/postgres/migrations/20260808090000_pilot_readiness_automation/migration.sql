ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'PAYMENT_SUBMITTED';
ALTER TYPE "AdditionalRequirementStatus" ADD VALUE IF NOT EXISTS 'PAYMENT_SUBMITTED';

CREATE TYPE "PaymentStatus" AS ENUM ('SUBMITTED', 'VERIFIED', 'REJECTED', 'REFUNDED');
CREATE TYPE "PaymentKind" AS ENUM ('BOOKING_TOTAL', 'SUBSCRIPTION', 'ADDITIONAL_REQUIREMENT', 'DEPOSIT_RELEASE', 'REFUND');
CREATE TYPE "DepositStatus" AS ENUM ('HELD', 'RELEASED', 'PARTIALLY_RETAINED', 'RETAINED', 'DISPUTED');
CREATE TYPE "PrivacyRequestType" AS ENUM ('ACCESS', 'CORRECTION', 'DELETION');
CREATE TYPE "PrivacyRequestStatus" AS ENUM ('SUBMITTED', 'IN_REVIEW', 'COMPLETED', 'REJECTED');

ALTER TABLE "Booking"
ADD COLUMN "startAt" TIMESTAMP(3),
ADD COLUMN "endAt" TIMESTAMP(3),
ADD COLUMN "bookingTimeZone" TEXT NOT NULL DEFAULT 'Asia/Singapore',
ADD COLUMN "depositStatus" "DepositStatus" NOT NULL DEFAULT 'HELD',
ADD COLUMN "depositReturned" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "depositRetained" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Booking_listingId_startAt_endAt_idx" ON "Booking"("listingId", "startAt", "endAt");

CREATE TABLE "PaymentRecord" (
    "id" TEXT NOT NULL,
    "payerId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "bookingId" TEXT,
    "additionalRequirementId" TEXT,
    "proofUploadId" TEXT,
    "kind" "PaymentKind" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'SUBMITTED',
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SGD',
    "reference" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "reviewNote" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaymentRecord_proofUploadId_key" ON "PaymentRecord"("proofUploadId");
CREATE UNIQUE INDEX "PaymentRecord_idempotencyKey_key" ON "PaymentRecord"("idempotencyKey");
CREATE INDEX "PaymentRecord_bookingId_status_submittedAt_idx" ON "PaymentRecord"("bookingId", "status", "submittedAt");
CREATE INDEX "PaymentRecord_payerId_kind_status_idx" ON "PaymentRecord"("payerId", "kind", "status");

CREATE TABLE "AgreementAcceptance" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "documentVersion" TEXT NOT NULL,
    "documentHash" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgreementAcceptance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgreementAcceptance_bookingId_userId_documentVersion_documentHash_key" ON "AgreementAcceptance"("bookingId", "userId", "documentVersion", "documentHash");
CREATE INDEX "AgreementAcceptance_bookingId_documentHash_idx" ON "AgreementAcceptance"("bookingId", "documentHash");

CREATE TABLE "PrivacyRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "PrivacyRequestType" NOT NULL,
    "status" "PrivacyRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "detail" TEXT NOT NULL,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "PrivacyRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PrivacyRequest_status_createdAt_idx" ON "PrivacyRequest"("status", "createdAt");
CREATE INDEX "PrivacyRequest_userId_createdAt_idx" ON "PrivacyRequest"("userId", "createdAt");

CREATE TABLE "RateLimitBucket" (
    "id" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "windowStartedAt" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RateLimitBucket_keyHash_action_windowStartedAt_key" ON "RateLimitBucket"("keyHash", "action", "windowStartedAt");
CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");

ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_additionalRequirementId_fkey" FOREIGN KEY ("additionalRequirementId") REFERENCES "AdditionalRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_proofUploadId_fkey" FOREIGN KEY ("proofUploadId") REFERENCES "Upload"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AgreementAcceptance" ADD CONSTRAINT "AgreementAcceptance_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgreementAcceptance" ADD CONSTRAINT "AgreementAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PrivacyRequest" ADD CONSTRAINT "PrivacyRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
