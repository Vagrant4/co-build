import type { Prisma } from "@prisma/client";
import type { EquipmentAddon, Listing, ListingFilters } from "./fabrication";
import { filterListings } from "./fabrication";
import { prisma } from "./db";
import { humanServiceAddonSlugs } from "./seed-data";

type ListingRecord = Awaited<ReturnType<typeof prisma.listing.findMany>>[number] & {
  equipmentAddons?: { equipmentAddon: EquipmentAddon }[];
  uploads?: { id: string; type: string; uploadStatus: string; scanStatus: string }[];
};

export async function getEquipmentAddons(): Promise<EquipmentAddon[]> {
  return prisma.equipmentAddon.findMany({
    where: { slug: { notIn: [...humanServiceAddonSlugs] } },
    orderBy: [{ category: "asc" }, { name: "asc" }]
  });
}

export async function getListings(filters?: ListingFilters): Promise<Listing[]> {
  const records = await prisma.listing.findMany({
    include: { equipmentAddons: { include: { equipmentAddon: true } }, uploads: { where: { type: "LISTING_PHOTO", uploadStatus: "AVAILABLE" }, select: { id: true, type: true, uploadStatus: true, scanStatus: true }, take: 8 } },
    orderBy: { sizeSqft: "asc" }
  });
  const listings = records.map(toListing);
  return filters ? filterListings(listings, filters) : listings;
}

export async function getApprovedListings(filters?: ListingFilters): Promise<Listing[]> {
  if (filters?.factoryType === "OFFICE") return [];
  const records = await prisma.listing.findMany({
    where: approvedListingWhere(filters),
    include: { equipmentAddons: { include: { equipmentAddon: true } }, uploads: { where: { type: "LISTING_PHOTO", uploadStatus: "AVAILABLE" }, select: { id: true, type: true, uploadStatus: true, scanStatus: true }, take: 8 } },
    orderBy: { sizeSqft: "asc" },
    take: 100
  });
  return records.map(toListing);
}

function approvedListingWhere(filters?: ListingFilters): Prisma.ListingWhereInput {
  const and: Prisma.ListingWhereInput[] = [];
  if (filters?.location) and.push({ OR: [{ location: { contains: filters.location } }, { address: { contains: filters.location } }] });
  if (filters?.minSqft) and.push({ sizeSqft: { gte: filters.minSqft } });
  if (filters?.maxSqft) and.push({ sizeSqft: { lte: filters.maxSqft } });
  if (filters?.sizeBand === "UNDER_1000") and.push({ sizeSqft: { lt: 1000 } });
  if (filters?.sizeBand === "UNDER_5000") and.push({ sizeSqft: { lt: 5000 } });
  if (filters?.sizeBand === "UNDER_10000") and.push({ sizeSqft: { lt: 10000 } });
  if (filters?.sizeBand === "OVER_10000") and.push({ sizeSqft: { gt: 10000 } });
  if (filters?.powerType) and.push({ powerType: filters.powerType });
  if (filters?.factoryType === "B1" || filters?.factoryType === "B2") and.push({ factoryType: filters.factoryType });
  if (filters?.workType) and.push({ permittedWorkJson: { contains: filters.workType } });
  if (filters?.loadingAccess) and.push({ loadingAccessJson: { contains: filters.loadingAccess } });
  for (const slug of filters?.equipment ?? []) and.push({ equipmentAddons: { some: { equipmentAddon: { slug } } } });
  if (filters?.durationDays === 1) and.push({ priceDay: { gt: 0 } });
  if (filters?.durationDays === 7) and.push({ priceSevenDays: { gt: 0 } });
  if (filters?.durationDays === 30) and.push({ priceThirtyDays: { gt: 0 } });
  if (filters?.durationDays === 60) and.push({ priceSixtyDays: { gt: 0 } });
  return {
      status: "APPROVED",
      host: {
        is: {
          role: "HOST",
          suspended: false,
          verificationStatus: "APPROVED",
          platformSubscriptionStatus: "ACTIVE"
        }
      },
      AND: and
  };
}

export async function getPublicListingBySlug(slug: string): Promise<Listing | null> {
  const record = await prisma.listing.findFirst({
    where: {
      slug,
      status: "APPROVED",
      host: { is: { role: "HOST", suspended: false, verificationStatus: "APPROVED", platformSubscriptionStatus: "ACTIVE" } }
    },
    include: { equipmentAddons: { include: { equipmentAddon: true } }, uploads: { where: { type: "LISTING_PHOTO", uploadStatus: "AVAILABLE" }, select: { id: true, type: true, uploadStatus: true, scanStatus: true }, take: 8 } }
  });
  return record ? toListing(record) : null;
}

export async function getDashboardData(options: { page?: number; pageSize?: number } = {}) {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = Math.min(100, Math.max(10, options.pageSize ?? 25));
  const skip = (page - 1) * pageSize;
  const [users, listings, bookings, uploads, approvalEvents, equipment, payments, privacyRequests, moderationReports] = await Promise.all([
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, skip, take: pageSize }),
    prisma.listing.findMany({
      include: {
        bookings: true,
        host: { select: { fullName: true, role: true, suspended: true, verificationStatus: true, platformSubscriptionStatus: true } }
      },
      orderBy: { createdAt: "desc" },
      skip, take: pageSize
    }),
    prisma.booking.findMany({
      include: {
        listing: true,
        user: true,
        addons: { include: { equipmentAddon: true } },
        uploads: true,
        paymentRecords: { include: { proofUpload: true }, orderBy: { submittedAt: "desc" } }
      },
      orderBy: { createdAt: "desc" },
      skip, take: pageSize
    }),
    prisma.upload.findMany({ orderBy: { createdAt: "desc" }, skip, take: pageSize }),
    prisma.approvalEvent.findMany({
      include: { actor: true, listing: true, booking: true },
      orderBy: { createdAt: "desc" },
      take: 12
    }),
    prisma.equipmentAddon.findMany({
      where: { slug: { notIn: [...humanServiceAddonSlugs] } },
      orderBy: { name: "asc" }
    }),
    prisma.paymentRecord.findMany({
      include: { payer: true, booking: { include: { listing: true } }, additionalRequirement: true, proofUpload: true },
      orderBy: { submittedAt: "desc" },
      skip, take: pageSize
    }),
    prisma.privacyRequest.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, skip, take: pageSize }),
    prisma.moderationReport.findMany({ include: { reporter: true, reportedUser: true, reviewer: true }, orderBy: { createdAt: "desc" }, skip, take: pageSize })
  ]);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [
    userCount, listingCount, bookingCount, activeSubscriptionCount, occupiedBookingCount,
    hostCount, renterCount, pendingUserCount, pendingListingCount, pendingBookingCount,
    submittedPaymentCount, newUserCount, newListingCount, newBookingCount
  ] = await Promise.all([
    prisma.user.count(),
    prisma.listing.count(),
    prisma.booking.count(),
    prisma.user.count({ where: { role: { in: ["RENTER", "HOST"] }, platformSubscriptionStatus: "ACTIVE" } }),
    prisma.booking.count({ where: { status: { in: ["PAID_CONFIRMED", "CHECKED_IN"] } } }),
    prisma.user.count({ where: { role: "HOST" } }),
    prisma.user.count({ where: { role: "RENTER" } }),
    prisma.user.count({ where: { role: { in: ["RENTER", "HOST"] }, verificationStatus: "PENDING" } }),
    prisma.listing.count({ where: { status: "PENDING_ADMIN" } }),
    prisma.booking.count({ where: { status: { in: ["PENDING_HOST", "PENDING_ADMIN_HIGH_RISK", "APPROVED_FOR_PAYMENT", "PAYMENT_SUBMITTED"] } } }),
    prisma.paymentRecord.count({ where: { status: "SUBMITTED" } }),
    prisma.user.count({ where: { role: { in: ["RENTER", "HOST"] }, createdAt: { gte: sevenDaysAgo } } }),
    prisma.listing.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.booking.count({ where: { createdAt: { gte: sevenDaysAgo } } })
  ]);

  const totalPages = Math.max(1, Math.ceil(Math.max(userCount, listingCount, bookingCount) / pageSize));
  return {
    users, listings, bookings, uploads, approvalEvents, equipment, payments, privacyRequests, moderationReports,
    pagination: { page, pageSize, totalPages },
    totals: {
      userCount, listingCount, bookingCount, activeSubscriptionCount, occupiedBookingCount,
      hostCount, renterCount, pendingUserCount, pendingListingCount, pendingBookingCount,
      submittedPaymentCount, newUserCount, newListingCount, newBookingCount
    }
  };
}

export function toListing(record: ListingRecord): Listing {
  const uploadedPhotoUrls = record.uploads?.filter((upload) => upload.scanStatus === "SAFE" || upload.scanStatus === "NOT_REQUIRED").map((upload) => `/api/listings/${record.id}/photos/${upload.id}`) ?? [];
  return {
    slug: record.slug,
    title: record.title,
    address: record.address,
    location: record.location,
    sizeSqft: record.sizeSqft,
    spaceType: record.spaceType,
    zoning: record.factoryType,
    status: record.status,
    accessHours: record.accessHours,
    powerType: record.powerType,
    loadingAccess: parseJsonArray(record.loadingAccessJson),
    equipmentSlugs:
      record.equipmentAddons
        ?.map((item) => item.equipmentAddon.slug)
        .filter((slug) => !humanServiceAddonSlugs.includes(slug as (typeof humanServiceAddonSlugs)[number])) ?? [],
    includedAmenities: parseJsonArray(record.amenitiesJson),
    permittedWork: parseJsonArray(record.permittedWorkJson),
    prohibitedWork: parseJsonArray(record.prohibitedWorkJson),
    safetyRules: parseJsonArray(record.safetyRulesJson),
    cancellationPolicy: record.cancellationPolicy,
    photoUrls: uploadedPhotoUrls.length ? uploadedPhotoUrls : parseJsonArray(record.photoUrlsJson),
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
