import { PrismaClient } from "@prisma/client";
import { calculateBookingQuote } from "../src/lib/fabrication";
import { commonSafetyRules, seedEquipmentAddons, seedListings } from "../src/lib/seed-data";

const prisma = new PrismaClient();

const demoAccounts = [
  {
    id: "demo-renter-alpha",
    role: "RENTER" as const,
    fullName: "Nora Fabrication",
    mobile: "+65 8111 0001",
    email: "nora.renter@example.com",
    companyName: "Nora Prototype Works",
    uen: "202600101N",
    workType: "Assembly"
  },
  {
    id: "demo-renter-beta",
    role: "RENTER" as const,
    fullName: "Jon Project Ops",
    mobile: "+65 8111 0002",
    email: "jon.renter@example.com",
    companyName: "Beta Build Team",
    uen: "202600102B",
    workType: "Signage work"
  },
  {
    id: "demo-host-east",
    role: "HOST" as const,
    fullName: "Elaine East Bay",
    mobile: "+65 8222 0001",
    email: "elaine.host@example.com",
    companyName: "East Bay Industrial",
    uen: "202600201E",
    workType: "Space owner"
  },
  {
    id: "demo-host-west",
    role: "HOST" as const,
    fullName: "Rafi West Works",
    mobile: "+65 8222 0002",
    email: "rafi.host@example.com",
    companyName: "West Works Space",
    uen: "202600202W",
    workType: "Space owner"
  }
];

async function main() {
  for (const addon of seedEquipmentAddons) {
    await prisma.equipmentAddon.upsert({
      where: { slug: addon.slug },
      update: addon,
      create: addon
    });
  }

  for (const account of demoAccounts) {
    await prisma.user.upsert({
      where: { id: account.id },
      update: {
        ...account,
        verificationStatus: "APPROVED",
        platformSubscriptionStatus: "ACTIVE",
        platformSubscriptionPaidAt: new Date("2026-06-01T00:00:00.000Z"),
        platformSubscriptionPeriodStart: new Date("2026-06-01T00:00:00.000Z"),
        platformSubscriptionPeriodEnd: new Date("2026-07-01T00:00:00.000Z"),
        platformSubscriptionNextBilling: new Date("2026-07-01T00:00:00.000Z"),
        suspended: false
      },
      create: {
        ...account,
        verificationStatus: "APPROVED",
        platformSubscriptionStatus: "ACTIVE",
        platformSubscriptionPaidAt: new Date("2026-06-01T00:00:00.000Z"),
        platformSubscriptionPeriodStart: new Date("2026-06-01T00:00:00.000Z"),
        platformSubscriptionPeriodEnd: new Date("2026-07-01T00:00:00.000Z"),
        platformSubscriptionNextBilling: new Date("2026-07-01T00:00:00.000Z"),
        suspended: false
      }
    });
  }

  await upsertDemoListing({
    sourceSlug: "small-bay-eunos",
    slug: "demo-east-confirmed-bay",
    title: "Confirmed demo small bay - East",
    hostId: "demo-host-east"
  });
  await upsertDemoListing({
    sourceSlug: "medium-bay-woodlands",
    slug: "demo-west-confirmed-bay",
    title: "Confirmed demo medium bay - West",
    hostId: "demo-host-west"
  });

  await upsertConfirmedDeal({
    bookingId: "demo-deal-alpha-east",
    listingSlug: "demo-east-confirmed-bay",
    renterId: "demo-renter-alpha",
    hostId: "demo-host-east",
    durationDays: 7,
    workType: "Assembly",
    addonSlug: "workbench"
  });

  await upsertConfirmedDeal({
    bookingId: "demo-deal-beta-west",
    listingSlug: "demo-west-confirmed-bay",
    renterId: "demo-renter-beta",
    hostId: "demo-host-west",
    durationDays: 30,
    workType: "Signage work",
    addonSlug: "power-tools"
  });
}

async function upsertDemoListing({ sourceSlug, slug, title, hostId }: { sourceSlug: string; slug: string; title: string; hostId: string }) {
  const source = seedListings.find((listing) => listing.slug === sourceSlug);
  if (!source) throw new Error(`Missing seed listing ${sourceSlug}`);

  const listing = await prisma.listing.upsert({
    where: { slug },
    update: {
      title,
      hostId,
      status: "APPROVED"
    },
    create: {
      slug,
      title,
      address: source.address,
      location: source.location,
      sizeSqft: source.sizeSqft,
      spaceType: source.spaceType,
      zoning: source.zoning,
      status: "APPROVED",
      accessHours: source.accessHours,
      powerType: source.powerType,
      loadingAccessJson: JSON.stringify(source.loadingAccess),
      amenitiesJson: JSON.stringify([...source.includedAmenities, "Four-account demo listing"]),
      permittedWorkJson: JSON.stringify(source.permittedWork),
      prohibitedWorkJson: JSON.stringify(source.prohibitedWork),
      safetyRulesJson: JSON.stringify(commonSafetyRules),
      cancellationPolicy: source.cancellationPolicy,
      photoUrlsJson: JSON.stringify(source.photoUrls),
      floorPlanUrl: source.floorPlanUrl,
      priceDay: source.prices.day,
      priceSevenDays: source.prices.sevenDays,
      priceThirtyDays: source.prices.thirtyDays,
      priceSixtyDays: source.prices.sixtyDays,
      depositStandard: source.deposit.standard,
      depositHighRisk: source.deposit.highRiskExtra,
      cleaningFee: source.cleaningFee,
      landlordApproval: "Demo host approved",
      insuranceStatus: "Demo insurance declared",
      fireSafety: "Extinguishers and marked exits declared",
      electricalSupply: source.powerType === "THREE_PHASE" ? "Three-phase industrial supply" : "Single-phase 240V supply",
      hostId,
      equipmentAddons: {
        create: source.equipmentSlugs.map((equipmentSlug) => ({
          equipmentAddon: { connect: { slug: equipmentSlug } }
        }))
      }
    }
  });

  return listing;
}

async function upsertConfirmedDeal({
  bookingId,
  listingSlug,
  renterId,
  hostId,
  durationDays,
  workType,
  addonSlug
}: {
  bookingId: string;
  listingSlug: string;
  renterId: string;
  hostId: string;
  durationDays: 1 | 7 | 30 | 60;
  workType: string;
  addonSlug: string;
}) {
  const listingRecord = await prisma.listing.findUniqueOrThrow({
    where: { slug: listingSlug },
    include: { equipmentAddons: { include: { equipmentAddon: true } } }
  });
  const source = seedListings.find((listing) => listing.slug === (listingSlug.includes("west") ? "medium-bay-woodlands" : "small-bay-eunos"));
  if (!source) throw new Error(`Missing quote source for ${listingSlug}`);

  const addon = await prisma.equipmentAddon.findUniqueOrThrow({ where: { slug: addonSlug } });
  const quote = calculateBookingQuote({ listing: source, durationDays, workType, addons: [addon] });
  const confirmedAt = new Date("2026-06-23T09:00:00.000Z");

  await prisma.booking.upsert({
    where: { id: bookingId },
    update: {
      listingId: listingRecord.id,
      userId: renterId,
      durationDays,
      workType,
      riskLevel: quote.riskLevel,
      status: "PAID_CONFIRMED",
      rentalTotal: quote.rentalTotal,
      deposit: quote.deposit,
      cleaningFee: quote.cleaningFee,
      addonTotal: quote.addonTotal,
      grandTotal: quote.grandTotal,
      safetyAcceptedAt: confirmedAt,
      renterDealConfirmedAt: confirmedAt,
      hostDealConfirmedAt: confirmedAt
    },
    create: {
      id: bookingId,
      listing: { connect: { id: listingRecord.id } },
      user: { connect: { id: renterId } },
      durationDays,
      workType,
      riskLevel: quote.riskLevel,
      status: "PAID_CONFIRMED",
      rentalTotal: quote.rentalTotal,
      deposit: quote.deposit,
      cleaningFee: quote.cleaningFee,
      addonTotal: quote.addonTotal,
      grandTotal: quote.grandTotal,
      safetyAcceptedAt: confirmedAt,
      renterDealConfirmedAt: confirmedAt,
      hostDealConfirmedAt: confirmedAt,
      addons: {
        create: {
          equipmentAddon: { connect: { slug: addonSlug } },
          priceAtBooking: addon.pricePerBooking
        }
      }
    }
  });

  await prisma.bookingAddon.upsert({
    where: { bookingId_equipmentAddonId: { bookingId, equipmentAddonId: addon.id } },
    update: { priceAtBooking: addon.pricePerBooking },
    create: {
      bookingId,
      equipmentAddonId: addon.id,
      priceAtBooking: addon.pricePerBooking
    }
  });

  await prisma.bookingMessage.deleteMany({
    where: {
      bookingId,
      body: { contains: "Demo" }
    }
  });
  await prisma.bookingMessage.createMany({
    data: [
      {
        bookingId,
        senderId: renterId,
        body: `Demo renter confirmed ${workType.toLowerCase()} scope and platform-only communication.`
      },
      {
        bookingId,
        senderId: hostId,
        body: "Demo host confirmed access, safety rules, and no off-platform contact details."
      }
    ]
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    console.log("Four-account deal demo data ready.");
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });