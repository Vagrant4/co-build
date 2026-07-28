-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('RENTER', 'HOST', 'ADMIN');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ListingStatus" AS ENUM ('DRAFT', 'PENDING_ADMIN', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "SpaceType" AS ENUM ('MAKER_BENCH', 'SMALL_BAY', 'MEDIUM_BAY', 'LARGE_BAY');

-- CreateEnum
CREATE TYPE "Zoning" AS ENUM ('B1', 'B2', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "PowerType" AS ENUM ('SINGLE_PHASE', 'THREE_PHASE');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('DRAFT', 'PENDING_HOST', 'PENDING_ADMIN_HIGH_RISK', 'APPROVED_FOR_PAYMENT', 'PAID_CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'HOST_REJECTED', 'ADMIN_REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('STANDARD', 'ADMIN_APPROVAL');

-- CreateEnum
CREATE TYPE "UploadType" AS ENUM ('VERIFICATION', 'CHECK_IN', 'CHECK_OUT', 'LISTING_PHOTO', 'FLOOR_PLAN', 'PAYMENT_EVIDENCE', 'DISPUTE_EVIDENCE', 'CONTRACT');

-- CreateEnum
CREATE TYPE "StorageProvider" AS ENUM ('LEGACY_LOCAL', 'VERCEL_BLOB');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('PENDING', 'AVAILABLE', 'REJECTED', 'DELETED', 'LEGACY_DEMO');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'SAFE', 'UNSAFE', 'FAILED');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AdditionalRequirementStatus" AS ENUM ('PENDING_HOST', 'APPROVED_FOR_PAYMENT', 'PAID_CONFIRMED', 'HOST_REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PlatformSubscriptionStatus" AS ENUM ('UNPAID', 'PENDING_ADMIN', 'ACTIVE');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "authProviderId" TEXT,
    "role" "UserRole" NOT NULL,
    "fullName" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "uen" TEXT,
    "workType" TEXT,
    "experienceLevel" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "platformSubscriptionStatus" "PlatformSubscriptionStatus" NOT NULL DEFAULT 'UNPAID',
    "platformSubscriptionReference" TEXT,
    "platformSubscriptionPaidAt" TIMESTAMP(3),
    "platformSubscriptionPeriodStart" TIMESTAMP(3),
    "platformSubscriptionPeriodEnd" TIMESTAMP(3),
    "platformSubscriptionNextBilling" TIMESTAMP(3),
    "suspended" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "sizeSqft" INTEGER NOT NULL,
    "spaceType" "SpaceType" NOT NULL,
    "zoning" "Zoning" NOT NULL,
    "status" "ListingStatus" NOT NULL DEFAULT 'PENDING_ADMIN',
    "accessHours" TEXT NOT NULL,
    "powerType" "PowerType" NOT NULL,
    "loadingAccessJson" TEXT NOT NULL,
    "amenitiesJson" TEXT NOT NULL,
    "permittedWorkJson" TEXT NOT NULL,
    "prohibitedWorkJson" TEXT NOT NULL,
    "safetyRulesJson" TEXT NOT NULL,
    "cancellationPolicy" TEXT NOT NULL,
    "photoUrlsJson" TEXT NOT NULL,
    "floorPlanUrl" TEXT NOT NULL,
    "priceDay" INTEGER NOT NULL,
    "priceSevenDays" INTEGER NOT NULL,
    "priceThirtyDays" INTEGER NOT NULL,
    "priceSixtyDays" INTEGER NOT NULL,
    "depositStandard" INTEGER NOT NULL,
    "depositHighRisk" INTEGER NOT NULL,
    "cleaningFee" INTEGER NOT NULL,
    "landlordApproval" TEXT NOT NULL DEFAULT 'unknown',
    "insuranceStatus" TEXT NOT NULL DEFAULT 'unknown',
    "fireSafety" TEXT NOT NULL DEFAULT 'Fire extinguishers on site',
    "electricalSupply" TEXT NOT NULL DEFAULT 'Declared by host',
    "hostId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentAddon" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pricePerBooking" INTEGER NOT NULL,
    "category" TEXT NOT NULL,

    CONSTRAINT "EquipmentAddon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ListingEquipment" (
    "listingId" TEXT NOT NULL,
    "equipmentAddonId" TEXT NOT NULL,

    CONSTRAINT "ListingEquipment_pkey" PRIMARY KEY ("listingId","equipmentAddonId")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "workType" TEXT NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING_HOST',
    "rentalTotal" INTEGER NOT NULL,
    "deposit" INTEGER NOT NULL,
    "cleaningFee" INTEGER NOT NULL,
    "addonTotal" INTEGER NOT NULL,
    "grandTotal" INTEGER NOT NULL,
    "safetyAcceptedAt" TIMESTAMP(3),
    "renterDealConfirmedAt" TIMESTAMP(3),
    "hostDealConfirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdditionalRequirement" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "detail" TEXT NOT NULL,
    "status" "AdditionalRequirementStatus" NOT NULL DEFAULT 'PENDING_HOST',
    "quotedRate" INTEGER NOT NULL DEFAULT 0,
    "contractText" TEXT,
    "emailedTo" TEXT,
    "emailedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdditionalRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingMessage" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingMessage_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "BookingAddon" (
    "bookingId" TEXT NOT NULL,
    "equipmentAddonId" TEXT NOT NULL,
    "priceAtBooking" INTEGER NOT NULL,

    CONSTRAINT "BookingAddon_pkey" PRIMARY KEY ("bookingId","equipmentAddonId")
);

-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL,
    "type" "UploadType" NOT NULL,
    "originalName" TEXT NOT NULL,
    "storageProvider" "StorageProvider" NOT NULL DEFAULT 'VERCEL_BLOB',
    "objectKey" TEXT,
    "legacyLocalPath" TEXT,
    "contentType" TEXT,
    "sizeBytes" INTEGER,
    "checksumSha256" TEXT,
    "uploadStatus" "UploadStatus" NOT NULL DEFAULT 'PENDING',
    "scanStatus" "ScanStatus" NOT NULL DEFAULT 'PENDING',
    "uploadedByUserId" TEXT,
    "ownerUserId" TEXT,
    "bookingId" TEXT,
    "listingId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Upload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "listingId" TEXT,
    "bookingId" TEXT,
    "target" TEXT NOT NULL,
    "decision" "ApprovalDecision" NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminExportEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "exportType" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminExportEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_authProviderId_key" ON "User"("authProviderId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_slug_key" ON "Listing"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentAddon_slug_key" ON "EquipmentAddon"("slug");

-- CreateIndex
CREATE INDEX "BookingMessage_bookingId_createdAt_idx" ON "BookingMessage"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "Conversation_renterId_updatedAt_idx" ON "Conversation"("renterId", "updatedAt");

-- CreateIndex
CREATE INDEX "Conversation_hostId_updatedAt_idx" ON "Conversation"("hostId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_listingId_renterId_key" ON "Conversation"("listingId", "renterId");

-- CreateIndex
CREATE INDEX "ConversationMessage_conversationId_createdAt_idx" ON "ConversationMessage"("conversationId", "createdAt");

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
CREATE INDEX "AdminExportEvent_actorId_createdAt_idx" ON "AdminExportEvent"("actorId", "createdAt");

-- AddForeignKey
ALTER TABLE "Listing" ADD CONSTRAINT "Listing_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingEquipment" ADD CONSTRAINT "ListingEquipment_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListingEquipment" ADD CONSTRAINT "ListingEquipment_equipmentAddonId_fkey" FOREIGN KEY ("equipmentAddonId") REFERENCES "EquipmentAddon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdditionalRequirement" ADD CONSTRAINT "AdditionalRequirement_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdditionalRequirement" ADD CONSTRAINT "AdditionalRequirement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingMessage" ADD CONSTRAINT "BookingMessage_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingMessage" ADD CONSTRAINT "BookingMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

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
ALTER TABLE "BookingAddon" ADD CONSTRAINT "BookingAddon_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAddon" ADD CONSTRAINT "BookingAddon_equipmentAddonId_fkey" FOREIGN KEY ("equipmentAddonId") REFERENCES "EquipmentAddon"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Upload" ADD CONSTRAINT "Upload_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalEvent" ADD CONSTRAINT "ApprovalEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalEvent" ADD CONSTRAINT "ApprovalEvent_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalEvent" ADD CONSTRAINT "ApprovalEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminExportEvent" ADD CONSTRAINT "AdminExportEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
