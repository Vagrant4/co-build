import type { PrismaClient } from "@prisma/client";
import {
  buildAdditionalRequirementContract,
  buildRecurringSubscriptionPeriod,
  calculateBookingQuote,
  type BookingStatus,
  type DurationDays
} from "../src/lib/fabrication";
import { seedEquipmentAddons, seedListings } from "../src/lib/seed-data";

const seedClock = new Date("2026-07-01T02:00:00.000Z");

function activeSubscription(reference: string, dayOffset: number) {
  const paidAt = new Date(seedClock);
  paidAt.setUTCDate(seedClock.getUTCDate() + dayOffset);
  const period = buildRecurringSubscriptionPeriod(paidAt);

  return {
    platformSubscriptionStatus: "ACTIVE" as const,
    platformSubscriptionReference: reference,
    platformSubscriptionPaidAt: paidAt,
    platformSubscriptionPeriodStart: period.periodStartAt,
    platformSubscriptionPeriodEnd: period.periodEndAt,
    platformSubscriptionNextBilling: period.nextBillingAt
  };
}

function pendingSubscription(reference: string) {
  return {
    platformSubscriptionStatus: "PENDING_ADMIN" as const,
    platformSubscriptionReference: reference,
    platformSubscriptionPaidAt: null,
    platformSubscriptionPeriodStart: null,
    platformSubscriptionPeriodEnd: null,
    platformSubscriptionNextBilling: null
  };
}

function unpaidSubscription() {
  return {
    platformSubscriptionStatus: "UNPAID" as const,
    platformSubscriptionReference: null,
    platformSubscriptionPaidAt: null,
    platformSubscriptionPeriodStart: null,
    platformSubscriptionPeriodEnd: null,
    platformSubscriptionNextBilling: null
  };
}

export const showcaseHosts = [
  {
    id: "demo-host",
    role: "HOST" as const,
    fullName: "Marcus Lim",
    mobile: "+65 0000 2200",
    email: "host@example.com",
    companyName: "Lim Industrial Space",
    uen: "201900002B",
    workType: "Space owner",
    experienceLevel: "Experienced",
    verificationStatus: "APPROVED" as const,
    ...activeSubscription("PAYNOW-HOST-001-SGD5", 0)
  },
  {
    id: "showcase-host-02",
    role: "HOST" as const,
    fullName: "Priya Nair",
    mobile: "+65 0000 2202",
    email: "host.priya@co-build.test",
    companyName: "Rivet Yard SG",
    uen: "202100202N",
    workType: "Space owner",
    experienceLevel: "Experienced",
    verificationStatus: "APPROVED" as const,
    ...activeSubscription("PAYNOW-HOST-002-SGD5", 1)
  },
  {
    id: "showcase-host-03",
    role: "HOST" as const,
    fullName: "Bryan Koh",
    mobile: "+65 0000 2203",
    email: "host.bryan@co-build.test",
    companyName: "North Grid Industrial",
    uen: "202100203K",
    workType: "Space owner",
    experienceLevel: "Experienced",
    verificationStatus: "APPROVED" as const,
    ...activeSubscription("PAYNOW-HOST-003-SGD5", 2)
  },
  {
    id: "showcase-host-04",
    role: "HOST" as const,
    fullName: "Siti Rahman",
    mobile: "+65 0000 2204",
    email: "host.siti@co-build.test",
    companyName: "Tuas Shared Works",
    uen: "202100204R",
    workType: "Space owner",
    experienceLevel: "Experienced",
    verificationStatus: "APPROVED" as const,
    ...pendingSubscription("FAST-HOST-004-SGD5")
  },
  {
    id: "showcase-host-05",
    role: "HOST" as const,
    fullName: "Daniel Ong",
    mobile: "+65 0000 2205",
    email: "host.daniel@co-build.test",
    companyName: "Ubi Maker Assets",
    uen: "202100205D",
    workType: "Space owner",
    experienceLevel: "Experienced",
    verificationStatus: "APPROVED" as const,
    ...activeSubscription("PAYNOW-HOST-005-SGD5", 3)
  },
  {
    id: "showcase-host-06",
    role: "HOST" as const,
    fullName: "Elaine Chua",
    mobile: "+65 0000 2206",
    email: "host.elaine@co-build.test",
    companyName: "Bedok Build Studio",
    uen: "202100206C",
    workType: "Space owner",
    experienceLevel: "Experienced",
    verificationStatus: "APPROVED" as const,
    ...activeSubscription("PAYNOW-HOST-006-SGD5", 4)
  },
  {
    id: "showcase-host-07",
    role: "HOST" as const,
    fullName: "Harith Ismail",
    mobile: "+65 0000 2207",
    email: "host.harith@co-build.test",
    companyName: "Jurong Signage Works",
    uen: "202100207I",
    workType: "Space owner",
    experienceLevel: "Experienced",
    verificationStatus: "APPROVED" as const,
    ...activeSubscription("PAYNOW-HOST-007-SGD5", 5)
  },
  {
    id: "showcase-host-08",
    role: "HOST" as const,
    fullName: "Joanne Teo",
    mobile: "+65 0000 2208",
    email: "host.joanne@co-build.test",
    companyName: "Changi Project Storage",
    uen: "202100208T",
    workType: "Space owner",
    experienceLevel: "Experienced",
    verificationStatus: "PENDING" as const,
    ...unpaidSubscription()
  },
  {
    id: "showcase-host-09",
    role: "HOST" as const,
    fullName: "Kelvin Seah",
    mobile: "+65 0000 2209",
    email: "host.kelvin@co-build.test",
    companyName: "Bukit Batok Metal Bays",
    uen: "202100209S",
    workType: "Space owner",
    experienceLevel: "Experienced",
    verificationStatus: "APPROVED" as const,
    ...pendingSubscription("INVOICE-HOST-009-SGD5")
  },
  {
    id: "showcase-host-10",
    role: "HOST" as const,
    fullName: "Mei Wong",
    mobile: "+65 0000 2210",
    email: "host.mei@co-build.test",
    companyName: "Tuas West Project Hall",
    uen: "202100210W",
    workType: "Space owner",
    experienceLevel: "Experienced",
    verificationStatus: "APPROVED" as const,
    ...activeSubscription("PAYNOW-HOST-010-SGD5", 6)
  }
] as const;

export const showcaseRenters = [
  {
    id: "demo-renter",
    role: "RENTER" as const,
    fullName: "Aisha Tan",
    mobile: "+65 0000 1200",
    email: "renter@example.com",
    companyName: "Tan Studio Works",
    uen: "202400001A",
    workType: "Furniture work",
    experienceLevel: "Intermediate",
    verificationStatus: "APPROVED" as const,
    ...activeSubscription("PAYNOW-RENTER-001-SGD5", 0)
  },
  {
    id: "showcase-renter-02",
    role: "RENTER" as const,
    fullName: "Ravi Menon",
    mobile: "+65 0000 1202",
    email: "renter.ravi@co-build.test",
    companyName: "Menon Repair Lab",
    uen: "202400102M",
    workType: "Repair",
    experienceLevel: "Intermediate",
    verificationStatus: "APPROVED" as const,
    ...activeSubscription("PAYNOW-RENTER-002-SGD5", 1)
  },
  {
    id: "showcase-renter-03",
    role: "RENTER" as const,
    fullName: "Clara Ng",
    mobile: "+65 0000 1203",
    email: "renter.clara@co-build.test",
    companyName: "Circuit Pilot",
    uen: "202400103N",
    workType: "Electronics",
    experienceLevel: "Intermediate",
    verificationStatus: "APPROVED" as const,
    ...pendingSubscription("FAST-RENTER-003-SGD5")
  },
  {
    id: "showcase-renter-04",
    role: "RENTER" as const,
    fullName: "Jason Low",
    mobile: "+65 0000 1204",
    email: "renter.jason@co-build.test",
    companyName: "Low CNC Fixtures",
    uen: "202400104L",
    workType: "CNC work",
    experienceLevel: "Experienced",
    verificationStatus: "APPROVED" as const,
    ...activeSubscription("PAYNOW-RENTER-004-SGD5", 2)
  },
  {
    id: "showcase-renter-05",
    role: "RENTER" as const,
    fullName: "Farah Abdullah",
    mobile: "+65 0000 1205",
    email: "renter.farah@co-build.test",
    companyName: "Farah Furniture Runs",
    uen: "202400105A",
    workType: "Furniture work",
    experienceLevel: "Intermediate",
    verificationStatus: "APPROVED" as const,
    ...activeSubscription("PAYNOW-RENTER-005-SGD5", 3)
  },
  {
    id: "showcase-renter-06",
    role: "RENTER" as const,
    fullName: "Ming Wei",
    mobile: "+65 0000 1206",
    email: "renter.ming@co-build.test",
    companyName: "Wei Signage Projects",
    uen: "202400106W",
    workType: "Signage work",
    experienceLevel: "Experienced",
    verificationStatus: "APPROVED" as const,
    ...activeSubscription("PAYNOW-RENTER-006-SGD5", 4)
  },
  {
    id: "showcase-renter-07",
    role: "RENTER" as const,
    fullName: "Nadia Salleh",
    mobile: "+65 0000 1207",
    email: "renter.nadia@co-build.test",
    companyName: "Nadia Ecommerce Ops",
    uen: "202400107S",
    workType: "Packing",
    experienceLevel: "Beginner",
    verificationStatus: "PENDING" as const,
    ...unpaidSubscription()
  },
  {
    id: "showcase-renter-08",
    role: "RENTER" as const,
    fullName: "Owen Tay",
    mobile: "+65 0000 1208",
    email: "renter.owen@co-build.test",
    companyName: "Tay Metal Prototype",
    uen: "202400108T",
    workType: "Grinding",
    experienceLevel: "Experienced",
    verificationStatus: "APPROVED" as const,
    ...pendingSubscription("FAST-RENTER-008-SGD5")
  },
  {
    id: "showcase-renter-09",
    role: "RENTER" as const,
    fullName: "Sophia Goh",
    mobile: "+65 0000 1209",
    email: "renter.sophia@co-build.test",
    companyName: "Goh Project Assembly",
    uen: "202400109G",
    workType: "Assembly",
    experienceLevel: "Intermediate",
    verificationStatus: "APPROVED" as const,
    ...activeSubscription("PAYNOW-RENTER-009-SGD5", 5)
  },
  {
    id: "showcase-renter-10",
    role: "RENTER" as const,
    fullName: "Terry Sim",
    mobile: "+65 0000 1210",
    email: "renter.terry@co-build.test",
    companyName: "Sim Storage Builds",
    uen: "202400110S",
    workType: "Storage + work area",
    experienceLevel: "Intermediate",
    verificationStatus: "APPROVED" as const,
    ...activeSubscription("PAYNOW-RENTER-010-SGD5", 6)
  }
] as const;

const showcaseAdmin = {
  id: "demo-admin",
  role: "ADMIN" as const,
  fullName: "Ops Admin",
  mobile: "+65 0000 3300",
  email: "admin@example.com",
  companyName: "Co-Build Ops",
  uen: "202400999C",
  workType: "Compliance",
  experienceLevel: "Experienced",
  verificationStatus: "APPROVED" as const,
  ...activeSubscription("INTERNAL-ADMIN", 0)
};

export const showcaseListingHostIds: Record<string, string> = {
  "maker-bench-kallang": "demo-host",
  "small-bay-eunos": "showcase-host-02",
  "medium-bay-woodlands": "showcase-host-03",
  "large-bay-tuas": "showcase-host-04",
  "electronics-bench-ubi": "showcase-host-05",
  "woodworking-bay-bedok": "showcase-host-06",
  "signage-bay-jurong": "showcase-host-07",
  "ecommerce-packing-changi": "showcase-host-08",
  "metalwork-bay-bukit-batok": "showcase-host-09",
  "project-hall-tuas-west": "showcase-host-10"
};

type BookingSeed = {
  listingSlug: string;
  userId: string;
  durationDays: DurationDays;
  workType: string;
  addonSlugs: string[];
  status: BookingStatus;
  dealConfirmedBy?: "RENTER" | "HOST" | "BOTH";
  messages: Array<{ senderId: string; body: string }>;
  additionalRequirement?: {
    detail: string;
    status: "PENDING_HOST" | "APPROVED_FOR_PAYMENT" | "PAID_CONFIRMED";
    quotedRate: number;
  };
  uploads?: Array<{ type: "CHECK_IN" | "CHECK_OUT"; originalName: string }>;
};

const showcaseBookings: BookingSeed[] = [
  {
    listingSlug: "small-bay-eunos",
    userId: "demo-renter",
    durationDays: 7,
    workType: "Packing",
    addonSlugs: ["hand-tools"],
    status: "PAID_CONFIRMED",
    dealConfirmedBy: "BOTH",
    messages: [
      { senderId: "demo-renter", body: "We will use the space for packing and light assembly only." },
      { senderId: "showcase-host-02", body: "Confirmed. Loading ramp is available from 8am; upload check-in photos before work starts." }
    ],
    additionalRequirement: {
      detail: "Need one extra lockable storage cabinet for seven days.",
      status: "PAID_CONFIRMED",
      quotedRate: 90
    },
    uploads: [{ type: "CHECK_IN", originalName: "packing-check-in.jpg" }]
  },
  {
    listingSlug: "large-bay-tuas",
    userId: "demo-renter",
    durationDays: 30,
    workType: "Welding",
    addonSlugs: ["welding-set"],
    status: "PENDING_ADMIN_HIGH_RISK",
    dealConfirmedBy: "HOST",
    messages: [
      { senderId: "showcase-host-04", body: "Welding request received. We are waiting for admin high-risk approval before payment." }
    ]
  },
  {
    listingSlug: "maker-bench-kallang",
    userId: "showcase-renter-02",
    durationDays: 1,
    workType: "Electronics",
    addonSlugs: ["3d-printer", "lockable-cabinet"],
    status: "CHECKED_OUT",
    dealConfirmedBy: "BOTH",
    messages: [
      { senderId: "showcase-renter-02", body: "Can I run a small diagnostic setup on the bench for one day?" },
      { senderId: "demo-host", body: "Yes. Bench power and cabinet access are included for the day pass." }
    ],
    uploads: [
      { type: "CHECK_IN", originalName: "electronics-check-in.jpg" },
      { type: "CHECK_OUT", originalName: "electronics-check-out.jpg" }
    ]
  },
  {
    listingSlug: "electronics-bench-ubi",
    userId: "showcase-renter-03",
    durationDays: 30,
    workType: "Electronics",
    addonSlugs: ["lockable-cabinet", "drill"],
    status: "APPROVED_FOR_PAYMENT",
    dealConfirmedBy: "HOST",
    messages: [
      { senderId: "showcase-renter-03", body: "We need the bench for small electronics assembly and packing." },
      { senderId: "showcase-host-05", body: "Approved for payment. Keep soldering work within the stated bench rules." }
    ]
  },
  {
    listingSlug: "medium-bay-woodlands",
    userId: "showcase-renter-04",
    durationDays: 7,
    workType: "CNC work",
    addonSlugs: ["cnc-machine", "material-storage"],
    status: "PENDING_HOST",
    dealConfirmedBy: "RENTER",
    messages: [
      { senderId: "showcase-renter-04", body: "Requesting CNC access for fixture work and one pallet of material." }
    ]
  },
  {
    listingSlug: "woodworking-bay-bedok",
    userId: "showcase-renter-05",
    durationDays: 60,
    workType: "Furniture work",
    addonSlugs: ["power-tools", "drill", "material-storage"],
    status: "CHECKED_IN",
    dealConfirmedBy: "BOTH",
    messages: [
      { senderId: "showcase-renter-05", body: "We need a two-month furniture assembly area with tool storage." },
      { senderId: "showcase-host-06", body: "Approved. Dust control rules apply and waste must be cleared weekly." }
    ],
    uploads: [{ type: "CHECK_IN", originalName: "furniture-check-in.jpg" }]
  },
  {
    listingSlug: "signage-bay-jurong",
    userId: "showcase-renter-06",
    durationDays: 30,
    workType: "Signage work",
    addonSlugs: ["laser-cutter", "power-tools"],
    status: "PAID_CONFIRMED",
    dealConfirmedBy: "BOTH",
    messages: [
      { senderId: "showcase-renter-06", body: "We need laser cutting and assembly tables for signage panels." },
      { senderId: "showcase-host-07", body: "Laser access is available after induction. No spray painting on site." }
    ]
  },
  {
    listingSlug: "ecommerce-packing-changi",
    userId: "showcase-renter-07",
    durationDays: 30,
    workType: "Packing",
    addonSlugs: ["material-storage", "lockable-cabinet"],
    status: "APPROVED_FOR_PAYMENT",
    dealConfirmedBy: "BOTH",
    messages: [
      { senderId: "showcase-renter-07", body: "We need packing tables for a short campaign and pallet staging." },
      { senderId: "showcase-host-08", body: "Approved for payment. Ground-floor loading is available during access hours." }
    ],
    additionalRequirement: {
      detail: "Need two additional packing tables for launch week.",
      status: "APPROVED_FOR_PAYMENT",
      quotedRate: 180
    }
  },
  {
    listingSlug: "metalwork-bay-bukit-batok",
    userId: "showcase-renter-08",
    durationDays: 7,
    workType: "Grinding",
    addonSlugs: ["grinder", "compressor"],
    status: "PENDING_ADMIN_HIGH_RISK",
    dealConfirmedBy: "HOST",
    messages: [
      { senderId: "showcase-renter-08", body: "Grinding request is for prepared metal parts only." },
      { senderId: "showcase-host-09", body: "Host approved the workspace fit. Admin high-risk approval is still required." }
    ]
  },
  {
    listingSlug: "project-hall-tuas-west",
    userId: "showcase-renter-09",
    durationDays: 60,
    workType: "Metal fabrication",
    addonSlugs: ["compressor", "material-storage", "drill"],
    status: "PENDING_HOST",
    dealConfirmedBy: "RENTER",
    messages: [
      { senderId: "showcase-renter-09", body: "Requesting the hall for staged assembly and metal fabrication prep." }
    ]
  },
  {
    listingSlug: "ecommerce-packing-changi",
    userId: "showcase-renter-10",
    durationDays: 7,
    workType: "Storage + work area",
    addonSlugs: ["material-storage"],
    status: "PAID_CONFIRMED",
    dealConfirmedBy: "BOTH",
    messages: [
      { senderId: "showcase-renter-10", body: "We only need temporary storage plus light packing for one week." },
      { senderId: "showcase-host-08", body: "Confirmed. Keep aisles clear and upload check-out photos before leaving." }
    ],
    uploads: [{ type: "CHECK_IN", originalName: "storage-check-in.jpg" }]
  }
];

export async function seedDemoData(prisma: PrismaClient, options: { reset?: boolean } = {}) {
  if (options.reset) {
    await prisma.approvalEvent.deleteMany();
    await prisma.upload.deleteMany();
    await prisma.additionalRequirement.deleteMany();
    await prisma.bookingMessage.deleteMany();
    await prisma.bookingAddon.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.listingMessage.deleteMany();
    await prisma.listingEquipment.deleteMany();
    await prisma.listing.deleteMany();
    await prisma.equipmentAddon.deleteMany();
    await prisma.user.deleteMany();
  }

  for (const user of [...showcaseRenters, ...showcaseHosts, showcaseAdmin]) {
    const { id, ...data } = user;
    await prisma.user.upsert({
      where: { id },
      update: data,
      create: { id, ...data }
    });
  }

  for (const addon of seedEquipmentAddons) {
    const { slug, ...data } = addon;
    await prisma.equipmentAddon.upsert({
      where: { slug },
      update: data,
      create: { slug, ...data }
    });
  }

  const addonRecords = await prisma.equipmentAddon.findMany();
  const addonIdBySlug = new Map(addonRecords.map((addon) => [addon.slug, addon.id]));

  for (const listing of seedListings) {
    const hostId = showcaseListingHostIds[listing.slug] ?? "demo-host";
    const { slug, ...data } = listingData(listing, hostId);
    const record = await prisma.listing.upsert({
      where: { slug },
      update: data,
      create: { slug, ...data }
    });

    await prisma.listingEquipment.deleteMany({ where: { listingId: record.id } });
    for (const equipmentSlug of listing.equipmentSlugs) {
      const equipmentAddonId = addonIdBySlug.get(equipmentSlug);
      if (!equipmentAddonId) continue;
      await prisma.listingEquipment.create({
        data: {
          listingId: record.id,
          equipmentAddonId
        }
      });
    }
  }

  await seedListingMessages(prisma);

  for (const bookingSeed of showcaseBookings) {
    await ensureBooking(prisma, bookingSeed, addonIdBySlug);
  }
}

function listingData(listing: (typeof seedListings)[number], hostId: string) {
  return {
    slug: listing.slug,
    title: listing.title,
    address: listing.address,
    location: listing.location,
    sizeSqft: listing.sizeSqft,
    spaceType: listing.spaceType,
    zoning: listing.zoning,
    status: listing.status,
    accessHours: listing.accessHours,
    powerType: listing.powerType,
    loadingAccessJson: JSON.stringify(listing.loadingAccess),
    amenitiesJson: JSON.stringify(listing.includedAmenities),
    permittedWorkJson: JSON.stringify(listing.permittedWork),
    prohibitedWorkJson: JSON.stringify(listing.prohibitedWork),
    safetyRulesJson: JSON.stringify(listing.safetyRules),
    cancellationPolicy: listing.cancellationPolicy,
    photoUrlsJson: JSON.stringify(listing.photoUrls),
    floorPlanUrl: listing.floorPlanUrl,
    priceDay: listing.prices.day,
    priceSevenDays: listing.prices.sevenDays,
    priceThirtyDays: listing.prices.thirtyDays,
    priceSixtyDays: listing.prices.sixtyDays,
    depositStandard: listing.deposit.standard,
    depositHighRisk: listing.deposit.highRiskExtra,
    cleaningFee: listing.cleaningFee,
    landlordApproval: "Host declared authority to list this space",
    insuranceStatus: "Insurance not collected in MVP showcase",
    fireSafety: "Extinguishers, marked exits, spill kit where relevant",
    electricalSupply: listing.powerType === "THREE_PHASE" ? "Three-phase industrial supply" : "Single-phase 240V supply",
    hostId
  };
}

async function seedListingMessages(prisma: PrismaClient) {
  const listingMessages = [
    {
      listingSlug: "small-bay-eunos",
      messages: [
        { senderId: "demo-renter", body: "Can we use the loading ramp for two pallet deliveries before booking?" },
        { senderId: "showcase-host-02", body: "Yes, loading ramp access is available during the stated access hours." }
      ]
    },
    {
      listingSlug: "electronics-bench-ubi",
      messages: [
        { senderId: "showcase-renter-03", body: "Is this suitable for small electronics assembly and final packing?" },
        { senderId: "showcase-host-05", body: "Yes. It is B1 suitable, with single-phase power and cabinet storage." }
      ]
    },
    {
      listingSlug: "signage-bay-jurong",
      messages: [
        { senderId: "showcase-renter-06", body: "Can we bring acrylic sheets and use the laser cutter add-on?" },
        { senderId: "showcase-host-07", body: "Yes after induction. Please submit material details before confirmation." }
      ]
    }
  ];

  for (const scenario of listingMessages) {
    const listing = await prisma.listing.findUnique({ where: { slug: scenario.listingSlug }, select: { id: true } });
    if (!listing) continue;
    const existing = await prisma.listingMessage.count({ where: { listingId: listing.id } });
    if (existing > 0) continue;
    await prisma.listingMessage.createMany({
      data: scenario.messages.map((message) => ({
        listingId: listing.id,
        senderId: message.senderId,
        body: message.body
      }))
    });
  }
}

async function ensureBooking(
  prisma: PrismaClient,
  bookingSeed: BookingSeed,
  addonIdBySlug: Map<string, string>
) {
  const listing = seedListings.find((item) => item.slug === bookingSeed.listingSlug);
  if (!listing) return;

  const addonInputs = seedEquipmentAddons.filter((addon) => bookingSeed.addonSlugs.includes(addon.slug));
  const quote = calculateBookingQuote({
    listing,
    durationDays: bookingSeed.durationDays,
    workType: bookingSeed.workType,
    addons: addonInputs
  });
  const dealDates = dealConfirmationDates(bookingSeed.dealConfirmedBy);
  const safetyAcceptedAt = new Date("2026-07-03T02:00:00.000Z");

  const existing = await prisma.booking.findFirst({
    where: {
      userId: bookingSeed.userId,
      workType: bookingSeed.workType,
      durationDays: bookingSeed.durationDays,
      listing: { slug: bookingSeed.listingSlug }
    },
    select: { id: true }
  });

  const baseData = {
    durationDays: quote.durationDays,
    workType: bookingSeed.workType,
    riskLevel: quote.riskLevel,
    status: bookingSeed.status,
    rentalTotal: quote.rentalTotal,
    deposit: quote.deposit,
    cleaningFee: quote.cleaningFee,
    addonTotal: quote.addonTotal,
    grandTotal: quote.grandTotal,
    safetyAcceptedAt,
    renterDealConfirmedAt: dealDates.renterDealConfirmedAt,
    hostDealConfirmedAt: dealDates.hostDealConfirmedAt
  };

  const booking = existing
    ? await prisma.booking.update({ where: { id: existing.id }, data: baseData })
    : await prisma.booking.create({
        data: {
          ...baseData,
          listing: { connect: { slug: bookingSeed.listingSlug } },
          user: { connect: { id: bookingSeed.userId } }
        }
      });

  await prisma.bookingAddon.deleteMany({ where: { bookingId: booking.id } });
  for (const addon of addonInputs) {
    const equipmentAddonId = addonIdBySlug.get(addon.slug);
    if (!equipmentAddonId) continue;
    await prisma.bookingAddon.create({
      data: {
        bookingId: booking.id,
        equipmentAddonId,
        priceAtBooking: addon.pricePerBooking
      }
    });
  }

  const messageCount = await prisma.bookingMessage.count({ where: { bookingId: booking.id } });
  if (messageCount === 0) {
    await prisma.bookingMessage.createMany({
      data: bookingSeed.messages.map((message) => ({
        bookingId: booking.id,
        senderId: message.senderId,
        body: message.body
      }))
    });
  }

  if (bookingSeed.status === "PENDING_ADMIN_HIGH_RISK") {
    await ensureApprovalEvent(prisma, booking.id, showcaseListingHostIds[bookingSeed.listingSlug]);
  }

  if (bookingSeed.additionalRequirement) {
    await ensureAdditionalRequirement(prisma, booking.id, bookingSeed);
  }

  for (const upload of bookingSeed.uploads ?? []) {
    await ensureUpload(prisma, booking.id, upload.type, upload.originalName);
  }
}

function dealConfirmationDates(confirmedBy: BookingSeed["dealConfirmedBy"]) {
  const confirmedAt = new Date("2026-07-04T02:00:00.000Z");
  return {
    renterDealConfirmedAt: confirmedBy === "RENTER" || confirmedBy === "BOTH" ? confirmedAt : null,
    hostDealConfirmedAt: confirmedBy === "HOST" || confirmedBy === "BOTH" ? confirmedAt : null
  };
}

async function ensureApprovalEvent(prisma: PrismaClient, bookingId: string, actorId?: string) {
  const existing = await prisma.approvalEvent.findFirst({
    where: {
      bookingId,
      target: "booking",
      decision: "APPROVED",
      note: { contains: "Host approved" }
    },
    select: { id: true }
  });
  if (existing) return;

  await prisma.approvalEvent.create({
    data: {
      actor: actorId ? { connect: { id: actorId } } : undefined,
      booking: { connect: { id: bookingId } },
      target: "booking",
      decision: "APPROVED",
      note: "Host approved; waiting for admin high-risk work approval."
    }
  });
}

async function ensureAdditionalRequirement(prisma: PrismaClient, bookingId: string, bookingSeed: BookingSeed) {
  const requirement = bookingSeed.additionalRequirement;
  if (!requirement) return;

  const existing = await prisma.additionalRequirement.findFirst({
    where: { bookingId, detail: requirement.detail },
    select: { id: true }
  });
  if (existing) return;

  const renter = showcaseRenters.find((item) => item.id === bookingSeed.userId);
  const hostId = showcaseListingHostIds[bookingSeed.listingSlug] ?? "demo-host";
  const host = showcaseHosts.find((item) => item.id === hostId);
  const listing = seedListings.find((item) => item.slug === bookingSeed.listingSlug);
  const contractText =
    requirement.status === "PENDING_HOST"
      ? null
      : buildAdditionalRequirementContract({
          bookingId,
          listingTitle: listing?.title ?? bookingSeed.listingSlug,
          renterName: renter?.fullName ?? bookingSeed.userId,
          renterEmail: renter?.email ?? "renter@example.com",
          hostName: host?.fullName ?? "Host",
          requirementDetail: requirement.detail,
          quotedRate: requirement.quotedRate,
          issuedAt: "2026-07-05"
        });

  await prisma.additionalRequirement.create({
    data: {
      bookingId,
      userId: bookingSeed.userId,
      detail: requirement.detail,
      status: requirement.status,
      quotedRate: requirement.quotedRate,
      contractText,
      emailedTo: contractText ? renter?.email ?? null : null,
      emailedAt: contractText ? new Date("2026-07-05T02:00:00.000Z") : null,
      paidAt: requirement.status === "PAID_CONFIRMED" ? new Date("2026-07-06T02:00:00.000Z") : null
    }
  });
}

async function ensureUpload(
  prisma: PrismaClient,
  bookingId: string,
  type: "CHECK_IN" | "CHECK_OUT",
  originalName: string
) {
  const existing = await prisma.upload.findFirst({
    where: { bookingId, type, originalName },
    select: { id: true }
  });
  if (existing) return;

  await prisma.upload.create({
    data: {
      bookingId,
      type,
      originalName,
      localPath: `uploads/showcase/${bookingId}/${originalName}`
    }
  });
}
