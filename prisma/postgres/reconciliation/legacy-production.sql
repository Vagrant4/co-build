-- This reconciliation is intentionally data-preserving and is only valid for
-- the reviewed legacy production schema. The release workflow verifies the
-- exact pre-migration diff checksum before executing it.
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "ListingMessage" lm
    JOIN "User" u ON u."id" = lm."senderId"
    GROUP BY lm."listingId"
    HAVING COUNT(DISTINCT CASE WHEN u."role" = 'RENTER' THEN lm."senderId" END) <> 1
  ) THEN
    RAISE EXCEPTION 'Legacy listing conversation cannot be isolated safely';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM "ListingMessage" lm
    JOIN "User" u ON u."id" = lm."senderId"
    JOIN "Listing" l ON l."id" = lm."listingId"
    WHERE u."role" NOT IN ('RENTER', 'HOST') OR l."hostId" IS NULL
  ) THEN
    RAISE EXCEPTION 'Legacy listing message has no valid renter-host ownership';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "Upload" WHERE "userId" IS NULL AND "bookingId" IS NULL
  ) THEN
    RAISE EXCEPTION 'Legacy upload ownership cannot be inferred safely';
  END IF;
END $$;

-- Rename the existing enum so current listing values remain intact.
ALTER TYPE "Zoning" RENAME TO "FactoryType";

-- CreateEnum
CREATE TYPE "StorageProvider" AS ENUM ('LEGACY_LOCAL', 'VERCEL_BLOB');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('PENDING', 'AVAILABLE', 'REJECTED', 'DELETED', 'LEGACY_DEMO');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'SAFE', 'UNSAFE', 'FAILED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('SUBMITTED', 'VERIFIED', 'REJECTED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('BOOKING_TOTAL', 'SUBSCRIPTION', 'ADDITIONAL_REQUIREMENT', 'DEPOSIT_RELEASE', 'REFUND');

-- CreateEnum
CREATE TYPE "DepositStatus" AS ENUM ('HELD', 'RELEASED', 'PARTIALLY_RETAINED', 'RETAINED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "PrivacyRequestType" AS ENUM ('ACCESS', 'CORRECTION', 'DELETION');

-- CreateEnum
CREATE TYPE "PrivacyRequestStatus" AS ENUM ('SUBMITTED', 'IN_REVIEW', 'COMPLETED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ');

-- CreateEnum
CREATE TYPE "ModerationReportStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED');

-- AlterEnum
ALTER TYPE "AdditionalRequirementStatus" ADD VALUE 'PAYMENT_SUBMITTED';

-- AlterEnum
ALTER TYPE "BookingStatus" ADD VALUE 'PAYMENT_SUBMITTED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UploadType" ADD VALUE 'PAYMENT_EVIDENCE';
ALTER TYPE "UploadType" ADD VALUE 'DISPUTE_EVIDENCE';
ALTER TYPE "UploadType" ADD VALUE 'CONTRACT';

-- DropForeignKey
ALTER TABLE "Upload" DROP CONSTRAINT "Upload_bookingId_fkey";

-- DropForeignKey
ALTER TABLE "Upload" DROP CONSTRAINT "Upload_listingId_fkey";

-- DropForeignKey
ALTER TABLE "Upload" DROP CONSTRAINT "Upload_userId_fkey";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "bookingTimeZone" TEXT NOT NULL DEFAULT 'Asia/Singapore',
ADD COLUMN     "depositRetained" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "depositReturned" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "depositStatus" "DepositStatus" NOT NULL DEFAULT 'HELD',
ADD COLUMN     "endAt" TIMESTAMP(3),
ADD COLUMN     "startAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Listing" DROP COLUMN "insuranceStatus",
DROP COLUMN "landlordApproval",
RENAME COLUMN "zoning" TO "factoryType";

-- Preserve legacy upload paths and infer ownership from the related booking.
ALTER TABLE "Upload" RENAME COLUMN "localPath" TO "legacyLocalPath";
ALTER TABLE "Upload" RENAME COLUMN "userId" TO "ownerUserId";
ALTER TABLE "Upload"
ADD COLUMN     "checksumSha256" TEXT,
ADD COLUMN     "contentType" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "objectKey" TEXT,
ADD COLUMN     "scanStatus" "ScanStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
ADD COLUMN     "sizeBytes" INTEGER,
ADD COLUMN     "storageProvider" "StorageProvider" NOT NULL DEFAULT 'LEGACY_LOCAL',
ADD COLUMN     "uploadStatus" "UploadStatus" NOT NULL DEFAULT 'AVAILABLE',
ADD COLUMN     "uploadedByUserId" TEXT,
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

UPDATE "Upload" u
SET "ownerUserId" = COALESCE(u."ownerUserId", b."userId"),
    "uploadedByUserId" = COALESCE(u."ownerUserId", b."userId")
FROM "Booking" b
WHERE u."bookingId" = b."id";

ALTER TABLE "Upload" ALTER COLUMN "scanStatus" SET DEFAULT 'PENDING';
ALTER TABLE "Upload" ALTER COLUMN "storageProvider" SET DEFAULT 'VERCEL_BLOB';
ALTER TABLE "Upload" ALTER COLUMN "uploadStatus" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "experienceLevel",
ADD COLUMN     "authProviderId" TEXT;

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "renterId" TEXT NOT NULL,
    "hostId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationMessage_pkey" PRIMARY KEY ("id")
);

-- Each reviewed legacy listing thread has exactly one renter. Preserve all
-- messages while replacing the shared listing thread with a private scope.
INSERT INTO "Conversation" ("id", "listingId", "renterId", "hostId", "createdAt", "updatedAt")
SELECT
  'legacy-conv-' || md5(lm."listingId" || ':' || lm."senderId"),
  lm."listingId",
  lm."senderId",
  l."hostId",
  MIN(all_messages."createdAt"),
  MAX(all_messages."createdAt")
FROM "ListingMessage" lm
JOIN "User" renter ON renter."id" = lm."senderId" AND renter."role" = 'RENTER'
JOIN "Listing" l ON l."id" = lm."listingId"
JOIN "ListingMessage" all_messages ON all_messages."listingId" = lm."listingId"
GROUP BY lm."listingId", lm."senderId", l."hostId";

INSERT INTO "ConversationMessage" ("id", "conversationId", "senderId", "body", "createdAt")
SELECT
  lm."id",
  c."id",
  lm."senderId",
  lm."body",
  lm."createdAt"
FROM "ListingMessage" lm
JOIN "User" sender ON sender."id" = lm."senderId"
JOIN "Conversation" c
  ON c."listingId" = lm."listingId"
 AND (sender."role" = 'HOST' OR c."renterId" = lm."senderId");

DROP TABLE "ListingMessage";

-- CreateTable
CREATE TABLE "AdminExportEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "exportType" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminExportEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateTable
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

-- CreateTable
CREATE TABLE "RateLimitBucket" (
    "id" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "windowStartedAt" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "dedupeKey" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastErrorCode" TEXT,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedUserId" TEXT,
    "reviewerId" TEXT,
    "contextType" TEXT NOT NULL,
    "contextId" TEXT NOT NULL,
    "messageId" TEXT,
    "reason" TEXT NOT NULL,
    "detail" TEXT,
    "status" "ModerationReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModerationReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditCheckpoint" (
    "id" TEXT NOT NULL,
    "fromAt" TIMESTAMP(3) NOT NULL,
    "throughAt" TIMESTAMP(3) NOT NULL,
    "eventCount" INTEGER NOT NULL,
    "previousDigest" TEXT,
    "digest" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Conversation_renterId_updatedAt_idx" ON "Conversation"("renterId", "updatedAt");

-- CreateIndex
CREATE INDEX "Conversation_hostId_updatedAt_idx" ON "Conversation"("hostId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_listingId_renterId_key" ON "Conversation"("listingId", "renterId");

-- CreateIndex
CREATE INDEX "ConversationMessage_conversationId_createdAt_idx" ON "ConversationMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminExportEvent_actorId_createdAt_idx" ON "AdminExportEvent"("actorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRecord_proofUploadId_key" ON "PaymentRecord"("proofUploadId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRecord_idempotencyKey_key" ON "PaymentRecord"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PaymentRecord_bookingId_status_submittedAt_idx" ON "PaymentRecord"("bookingId", "status", "submittedAt");

-- CreateIndex
CREATE INDEX "PaymentRecord_payerId_kind_status_idx" ON "PaymentRecord"("payerId", "kind", "status");

-- CreateIndex
CREATE INDEX "AgreementAcceptance_bookingId_documentHash_idx" ON "AgreementAcceptance"("bookingId", "documentHash");

-- CreateIndex
CREATE UNIQUE INDEX "AgreementAcceptance_bookingId_userId_documentVersion_docume_key" ON "AgreementAcceptance"("bookingId", "userId", "documentVersion", "documentHash");

-- CreateIndex
CREATE INDEX "PrivacyRequest_status_createdAt_idx" ON "PrivacyRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PrivacyRequest_userId_createdAt_idx" ON "PrivacyRequest"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "RateLimitBucket_keyHash_action_windowStartedAt_key" ON "RateLimitBucket"("keyHash", "action", "windowStartedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");

-- CreateIndex
CREATE INDEX "Notification_userId_status_createdAt_idx" ON "Notification"("userId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_channel_status_availableAt_idx" ON "Notification"("channel", "status", "availableAt");

-- CreateIndex
CREATE INDEX "ModerationReport_status_createdAt_idx" ON "ModerationReport"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ModerationReport_reportedUserId_createdAt_idx" ON "ModerationReport"("reportedUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ModerationReport_contextType_contextId_idx" ON "ModerationReport"("contextType", "contextId");

-- CreateIndex
CREATE UNIQUE INDEX "AuditCheckpoint_digest_key" ON "AuditCheckpoint"("digest");

-- CreateIndex
CREATE INDEX "AuditCheckpoint_throughAt_idx" ON "AuditCheckpoint"("throughAt");

-- CreateIndex
CREATE INDEX "Booking_listingId_startAt_endAt_idx" ON "Booking"("listingId", "startAt", "endAt");

-- CreateIndex
CREATE UNIQUE INDEX "Upload_objectKey_key" ON "Upload"("objectKey");

-- CreateIndex
CREATE INDEX "Upload_ownerUserId_createdAt_idx" ON "Upload"("ownerUserId", "createdAt");

-- CreateIndex
CREATE INDEX "Upload_bookingId_type_idx" ON "Upload"("bookingId", "type");

-- CreateIndex
CREATE INDEX "Upload_listingId_type_idx" ON "Upload"("listingId", "type");

-- CreateIndex
CREATE INDEX "Upload_uploadStatus_createdAt_idx" ON "Upload"("uploadStatus", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_authProviderId_key" ON "User"("authProviderId");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_renterId_fkey" FOREIGN KEY ("renterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminExportEvent" ADD CONSTRAINT "AdminExportEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_additionalRequirementId_fkey" FOREIGN KEY ("additionalRequirementId") REFERENCES "AdditionalRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_proofUploadId_fkey" FOREIGN KEY ("proofUploadId") REFERENCES "Upload"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgreementAcceptance" ADD CONSTRAINT "AgreementAcceptance_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgreementAcceptance" ADD CONSTRAINT "AgreementAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrivacyRequest" ADD CONSTRAINT "PrivacyRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationReport" ADD CONSTRAINT "ModerationReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationReport" ADD CONSTRAINT "ModerationReport_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationReport" ADD CONSTRAINT "ModerationReport_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
