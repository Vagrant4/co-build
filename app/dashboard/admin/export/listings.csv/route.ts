import { csvResponse, toCsv } from "@/src/lib/csv-export";
import { prisma } from "@/src/lib/db";
import { requireAdmin } from "@/src/lib/authorization";
import { enforceRateLimit } from "@/src/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  await enforceRateLimit({ action: "export:listings", identity: admin.id, limit: 5, windowSeconds: 60 * 60 });
  const listings = await prisma.$transaction(async (tx) => {
    const rows = await tx.listing.findMany({
      orderBy: { createdAt: "desc" },
      select: {
      accessHours: true,
      address: true,
      cleaningFee: true,
      createdAt: true,
      depositHighRisk: true,
      depositStandard: true,
      electricalSupply: true,
      fireSafety: true,
      id: true,
      loadingAccessJson: true,
      location: true,
      powerType: true,
      priceDay: true,
      priceSevenDays: true,
      priceSixtyDays: true,
      priceThirtyDays: true,
      sizeSqft: true,
      slug: true,
      spaceType: true,
      status: true,
      title: true,
        zoning: true
      }
    });
    await tx.adminExportEvent.create({ data: { actorId: admin.id, exportType: "listings", rowCount: rows.length } });
    return rows;
  });

  const csv = toCsv(listings, [
    { key: "id", header: "Listing ID" },
    { key: "slug", header: "Slug" },
    { key: "title", header: "Title" },
    { key: "status", header: "Status" },
    { key: "address", header: "Address" },
    { key: "location", header: "Location" },
    { key: "sizeSqft", header: "Size sqft" },
    { key: "spaceType", header: "Space type" },
    { key: "zoning", header: "Factory type" },
    { key: "powerType", header: "Power" },
    { key: "loadingAccessJson", header: "Loading access" },
    { key: "accessHours", header: "Access hours" },
    { key: "priceDay", header: "1 day price" },
    { key: "priceSevenDays", header: "7 day price" },
    { key: "priceThirtyDays", header: "30 day price" },
    { key: "priceSixtyDays", header: "60 day price" },
    { key: "depositStandard", header: "Standard deposit" },
    { key: "depositHighRisk", header: "High-risk deposit" },
    { key: "cleaningFee", header: "Cleaning fee" },
    { key: "fireSafety", header: "Fire safety" },
    { key: "electricalSupply", header: "Electrical supply" },
    { key: "createdAt", header: "Created" }
  ]);

  return csvResponse("co-build-listings.csv", csv);
}
