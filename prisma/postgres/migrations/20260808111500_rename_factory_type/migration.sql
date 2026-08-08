ALTER TYPE "Zoning" RENAME TO "FactoryType";
ALTER TABLE "Listing" RENAME COLUMN "zoning" TO "factoryType";
