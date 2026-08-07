-- Add dated booking inventory while retaining legacy demo bookings.
ALTER TABLE "Booking" ADD COLUMN "startAt" DATETIME;
ALTER TABLE "Booking" ADD COLUMN "endAt" DATETIME;
ALTER TABLE "Booking" ADD COLUMN "bookingTimeZone" TEXT NOT NULL DEFAULT 'Asia/Singapore';
ALTER TABLE "Booking" ADD COLUMN "depositStatus" TEXT NOT NULL DEFAULT 'HELD';
ALTER TABLE "Booking" ADD COLUMN "depositReturned" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Booking" ADD COLUMN "depositRetained" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Booking_listingId_startAt_endAt_idx" ON "Booking"("listingId", "startAt", "endAt");

CREATE TABLE "PaymentRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "payerId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "bookingId" TEXT,
    "additionalRequirementId" TEXT,
    "proofUploadId" TEXT,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'SGD',
    "reference" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "reviewNote" TEXT,
    "submittedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    CONSTRAINT "PaymentRecord_payerId_fkey" FOREIGN KEY ("payerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "PaymentRecord_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "PaymentRecord_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PaymentRecord_additionalRequirementId_fkey" FOREIGN KEY ("additionalRequirementId") REFERENCES "AdditionalRequirement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PaymentRecord_proofUploadId_fkey" FOREIGN KEY ("proofUploadId") REFERENCES "Upload" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "PaymentRecord_proofUploadId_key" ON "PaymentRecord"("proofUploadId");
CREATE UNIQUE INDEX "PaymentRecord_idempotencyKey_key" ON "PaymentRecord"("idempotencyKey");
CREATE INDEX "PaymentRecord_bookingId_status_submittedAt_idx" ON "PaymentRecord"("bookingId", "status", "submittedAt");
CREATE INDEX "PaymentRecord_payerId_kind_status_idx" ON "PaymentRecord"("payerId", "kind", "status");

CREATE TABLE "AgreementAcceptance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "documentVersion" TEXT NOT NULL,
    "documentHash" TEXT NOT NULL,
    "acceptedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgreementAcceptance_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AgreementAcceptance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "AgreementAcceptance_bookingId_userId_documentVersion_documentHash_key" ON "AgreementAcceptance"("bookingId", "userId", "documentVersion", "documentHash");
CREATE INDEX "AgreementAcceptance_bookingId_documentHash_idx" ON "AgreementAcceptance"("bookingId", "documentHash");

CREATE TABLE "PrivacyRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "detail" TEXT NOT NULL,
    "resolution" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "PrivacyRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "PrivacyRequest_status_createdAt_idx" ON "PrivacyRequest"("status", "createdAt");
CREATE INDEX "PrivacyRequest_userId_createdAt_idx" ON "PrivacyRequest"("userId", "createdAt");

CREATE TABLE "RateLimitBucket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "keyHash" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "windowStartedAt" DATETIME NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "expiresAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "RateLimitBucket_keyHash_action_windowStartedAt_key" ON "RateLimitBucket"("keyHash", "action", "windowStartedAt");
CREATE INDEX "RateLimitBucket_expiresAt_idx" ON "RateLimitBucket"("expiresAt");
