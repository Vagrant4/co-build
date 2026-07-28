-- Existing local uploads are demo-only records. They are deliberately not copied
-- to private object storage and are never served by pilot/production routes.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Upload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "storageProvider" TEXT NOT NULL DEFAULT 'VERCEL_BLOB',
    "objectKey" TEXT,
    "legacyLocalPath" TEXT,
    "contentType" TEXT,
    "sizeBytes" INTEGER,
    "checksumSha256" TEXT,
    "uploadStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "scanStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "uploadedByUserId" TEXT,
    "ownerUserId" TEXT,
    "bookingId" TEXT,
    "listingId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedAt" DATETIME,
    "deletedAt" DATETIME,
    CONSTRAINT "Upload_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Upload_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Upload_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Upload_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_Upload" (
    "id", "type", "originalName", "storageProvider", "legacyLocalPath",
    "uploadStatus", "scanStatus", "uploadedByUserId", "ownerUserId",
    "bookingId", "listingId", "createdAt"
)
SELECT
    "id", "type", "originalName", 'LEGACY_LOCAL', "localPath",
    'LEGACY_DEMO', 'NOT_REQUIRED', "userId", "userId",
    "bookingId", "listingId", "createdAt"
FROM "Upload";

DROP TABLE "Upload";
ALTER TABLE "new_Upload" RENAME TO "Upload";

CREATE UNIQUE INDEX "Upload_objectKey_key" ON "Upload"("objectKey");
CREATE INDEX "Upload_ownerUserId_createdAt_idx" ON "Upload"("ownerUserId", "createdAt");
CREATE INDEX "Upload_bookingId_type_idx" ON "Upload"("bookingId", "type");
CREATE INDEX "Upload_listingId_type_idx" ON "Upload"("listingId", "type");
CREATE INDEX "Upload_uploadStatus_createdAt_idx" ON "Upload"("uploadStatus", "createdAt");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
