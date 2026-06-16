-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "role" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "uen" TEXT,
    "workType" TEXT,
    "experienceLevel" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "suspended" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "sizeSqft" INTEGER NOT NULL,
    "spaceType" TEXT NOT NULL,
    "zoning" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_ADMIN',
    "accessHours" TEXT NOT NULL,
    "powerType" TEXT NOT NULL,
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Listing_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "EquipmentAddon" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pricePerBooking" INTEGER NOT NULL,
    "category" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "ListingEquipment" (
    "listingId" TEXT NOT NULL,
    "equipmentAddonId" TEXT NOT NULL,

    PRIMARY KEY ("listingId", "equipmentAddonId"),
    CONSTRAINT "ListingEquipment_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ListingEquipment_equipmentAddonId_fkey" FOREIGN KEY ("equipmentAddonId") REFERENCES "EquipmentAddon" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "listingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "workType" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_HOST',
    "rentalTotal" INTEGER NOT NULL,
    "deposit" INTEGER NOT NULL,
    "cleaningFee" INTEGER NOT NULL,
    "addonTotal" INTEGER NOT NULL,
    "grandTotal" INTEGER NOT NULL,
    "safetyAcceptedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Booking_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Booking_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BookingAddon" (
    "bookingId" TEXT NOT NULL,
    "equipmentAddonId" TEXT NOT NULL,
    "priceAtBooking" INTEGER NOT NULL,

    PRIMARY KEY ("bookingId", "equipmentAddonId"),
    CONSTRAINT "BookingAddon_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "BookingAddon_equipmentAddonId_fkey" FOREIGN KEY ("equipmentAddonId") REFERENCES "EquipmentAddon" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Upload" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "localPath" TEXT NOT NULL,
    "userId" TEXT,
    "bookingId" TEXT,
    "listingId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Upload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Upload_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Upload_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApprovalEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actorId" TEXT,
    "listingId" TEXT,
    "bookingId" TEXT,
    "target" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApprovalEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ApprovalEvent_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ApprovalEvent_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Listing_slug_key" ON "Listing"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentAddon_slug_key" ON "EquipmentAddon"("slug");

