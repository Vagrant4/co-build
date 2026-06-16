import type { EquipmentAddon, Listing, ListingFilters } from "./fabrication";
import { filterListings } from "./fabrication";
import { prisma } from "./db";

type ListingRecord = Awaited<ReturnType<typeof prisma.listing.findMany>>[number] & {
  equipmentAddons?: { equipmentAddon: EquipmentAddon }[];
};

export async function getEquipmentAddons(): Promise<EquipmentAddon[]> {
  return prisma.equipmentAddon.findMany({
    orderBy: [{ category: "asc" }, { name: "asc" }]
  });
}

export async function getListings(filters?: ListingFilters): Promise<Listing[]> {
  const records = await prisma.listing.findMany({
    include: { equipmentAddons: { include: { equipmentAddon: true } } },
    orderBy: { sizeSqft: "asc" }
  });
  const listings = records.map(toListing);
  return filters ? filterListings(listings, filters) : listings;
}

export async function getApprovedListings(filters?: ListingFilters): Promise<Listing[]> {
  return getListings(filters);
}

export async function getListingBySlug(slug: string): Promise<Listing | null> {
  const record = await prisma.listing.findUnique({
    where: { slug },
    include: { equipmentAddons: { include: { equipmentAddon: true } } }
  });
  return record ? toListing(record) : null;
}

export async function getDashboardData() {
  const [users, listings, bookings, uploads, approvalEvents, equipment] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.listing.findMany({
      include: { bookings: true },
      orderBy: { createdAt: "desc" }
    }),
    prisma.booking.findMany({
      include: {
        listing: true,
        user: true,
        addons: { include: { equipmentAddon: true } },
        uploads: true
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.upload.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.approvalEvent.findMany({
      include: { actor: true, listing: true, booking: true },
      orderBy: { createdAt: "desc" },
      take: 12
    }),
    prisma.equipmentAddon.findMany({ orderBy: { name: "asc" } })
  ]);

  return { users, listings, bookings, uploads, approvalEvents, equipment };
}

export function toListing(record: ListingRecord): Listing {
  return {
    slug: record.slug,
    title: record.title,
    address: record.address,
    location: record.location,
    sizeSqft: record.sizeSqft,
    spaceType: record.spaceType,
    zoning: record.zoning,
    status: record.status,
    accessHours: record.accessHours,
    powerType: record.powerType,
    loadingAccess: parseJsonArray(record.loadingAccessJson),
    equipmentSlugs: record.equipmentAddons?.map((item) => item.equipmentAddon.slug) ?? [],
    includedAmenities: parseJsonArray(record.amenitiesJson),
    permittedWork: parseJsonArray(record.permittedWorkJson),
    prohibitedWork: parseJsonArray(record.prohibitedWorkJson),
    safetyRules: parseJsonArray(record.safetyRulesJson),
    cancellationPolicy: record.cancellationPolicy,
    photoUrls: parseJsonArray(record.photoUrlsJson),
    floorPlanUrl: record.floorPlanUrl,
    prices: {
      day: record.priceDay,
      sevenDays: record.priceSevenDays,
      thirtyDays: record.priceThirtyDays,
      sixtyDays: record.priceSixtyDays
    },
    deposit: {
      standard: record.depositStandard,
      highRiskExtra: record.depositHighRisk
    },
    cleaningFee: record.cleaningFee
  };
}

function parseJsonArray(value: string): string[] {
  const parsed = JSON.parse(value) as unknown;
  return Array.isArray(parsed) ? parsed.map(String) : [];
}
