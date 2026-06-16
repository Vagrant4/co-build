-- AlterTable
ALTER TABLE "User" ADD COLUMN "platformSubscriptionStatus" TEXT NOT NULL DEFAULT 'UNPAID';
ALTER TABLE "User" ADD COLUMN "platformSubscriptionReference" TEXT;
ALTER TABLE "User" ADD COLUMN "platformSubscriptionPaidAt" DATETIME;

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "renterDealConfirmedAt" DATETIME;
ALTER TABLE "Booking" ADD COLUMN "hostDealConfirmedAt" DATETIME;
