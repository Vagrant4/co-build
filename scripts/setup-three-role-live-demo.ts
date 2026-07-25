import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
  buildAdditionalRequirementContract,
  buildRecurringSubscriptionPeriod,
  calculateBookingQuote,
  formatCurrency,
  type EquipmentAddon,
  type Listing
} from "../src/lib/fabrication";
import { commonSafetyRules, seedEquipmentAddons } from "../src/lib/seed-data";

const prisma = new PrismaClient();

const baseUrl = process.argv[2] || "http://127.0.0.1:3001";
const outputDir = join(process.cwd(), "outputs", "three-role-live-demo");
const scenario = {
  hostId: "browser-demo-host",
  renterId: "browser-demo-renter",
  adminId: "demo-admin",
  hostEmail: "browser.host.demo@co-build.test",
  renterEmail: "browser.renter.demo@co-build.test",
  adminEmail: "admin@co-build.test",
  listingSlug: "browser-demo-b2-fabrication-bay"
};

function json(values: string[]): string {
  return JSON.stringify(values);
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function absoluteUrl(path: string): string {
  return `${baseUrl}${path}`;
}

async function cleanupScenario() {
  const [host, renter, listing] = await Promise.all([
    prisma.user.findUnique({ where: { id: scenario.hostId } }),
    prisma.user.findUnique({ where: { id: scenario.renterId } }),
    prisma.listing.findUnique({ where: { slug: scenario.listingSlug } })
  ]);

  const userIds = [host?.id, renter?.id].filter(Boolean) as string[];
  const listingIds = [listing?.id].filter(Boolean) as string[];
  const bookings = listingIds.length
    ? await prisma.booking.findMany({ where: { listingId: { in: listingIds } }, select: { id: true } })
    : [];
  const bookingIds = bookings.map((booking) => booking.id);

  await prisma.approvalEvent.deleteMany({
    where: {
      OR: [
        { actorId: { in: [scenario.hostId, scenario.renterId, scenario.adminId] } },
        { listingId: { in: listingIds } },
        { bookingId: { in: bookingIds } },
        { note: { contains: "browser demo" } }
      ]
    }
  });
  await prisma.bookingMessage.deleteMany({ where: { bookingId: { in: bookingIds } } });
  await prisma.conversationMessage.deleteMany({ where: { conversation: { listingId: { in: listingIds } } } });
  await prisma.conversation.deleteMany({ where: { listingId: { in: listingIds } } });
  await prisma.additionalRequirement.deleteMany({
    where: { OR: [{ bookingId: { in: bookingIds } }, { userId: { in: userIds } }] }
  });
  await prisma.bookingAddon.deleteMany({ where: { bookingId: { in: bookingIds } } });
  await prisma.upload.deleteMany({
    where: {
      OR: [
        { bookingId: { in: bookingIds } },
        { listingId: { in: listingIds } },
        { userId: { in: userIds } },
        { originalName: { contains: "browser-demo" } }
      ]
    }
  });
  await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
  await prisma.listingEquipment.deleteMany({ where: { listingId: { in: listingIds } } });
  await prisma.listing.deleteMany({ where: { slug: scenario.listingSlug } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

async function ensureAdmin() {
  return prisma.user.upsert({
    where: { id: scenario.adminId },
    update: {
      role: "ADMIN",
      fullName: "Co-Build Admin",
      mobile: "+65 6000 0000",
      email: scenario.adminEmail,
      companyName: "Co-Build Platform",
      verificationStatus: "APPROVED",
      platformSubscriptionStatus: "ACTIVE",
      suspended: false
    },
    create: {
      id: scenario.adminId,
      role: "ADMIN",
      fullName: "Co-Build Admin",
      mobile: "+65 6000 0000",
      email: scenario.adminEmail,
      companyName: "Co-Build Platform",
      workType: "Platform operations",
      verificationStatus: "APPROVED",
      platformSubscriptionStatus: "ACTIVE"
    }
  });
}

async function ensureEquipment() {
  for (const addon of seedEquipmentAddons) {
    await prisma.equipmentAddon.upsert({
      where: { slug: addon.slug },
      update: {
        name: addon.name,
        pricePerBooking: addon.pricePerBooking,
        category: addon.category
      },
      create: addon
    });
  }
}

async function main() {
  mkdirSync(outputDir, { recursive: true });
  await cleanupScenario();
  await ensureEquipment();
  const admin = await ensureAdmin();

  const now = new Date();
  const hostPeriod = buildRecurringSubscriptionPeriod(addMinutes(now, -80));
  const renterPeriod = buildRecurringSubscriptionPeriod(addMinutes(now, -70));

  const host = await prisma.user.create({
    data: {
      id: scenario.hostId,
      role: "HOST",
      fullName: "Host Demo - Woodlands Fabrication",
      mobile: "+65 8123 0000",
      email: scenario.hostEmail,
      companyName: "Woodlands Bay Works Pte Ltd",
      uen: "202612345D",
      workType: "Workspace owner",
      verificationStatus: "APPROVED",
      platformSubscriptionStatus: "ACTIVE",
      platformSubscriptionReference: "PAYNOW-HOST-BROWSER-DEMO-SGD5",
      platformSubscriptionPaidAt: hostPeriod.periodStartAt,
      platformSubscriptionPeriodStart: hostPeriod.periodStartAt,
      platformSubscriptionPeriodEnd: hostPeriod.periodEndAt,
      platformSubscriptionNextBilling: hostPeriod.nextBillingAt
    }
  });

  const renter = await prisma.user.create({
    data: {
      id: scenario.renterId,
      role: "RENTER",
      fullName: "Renter Demo - Signage Project",
      mobile: "+65 9123 0000",
      email: scenario.renterEmail,
      companyName: "Bright Sign Project Team",
      uen: "53456789A",
      workType: "Assembly",
      verificationStatus: "APPROVED",
      platformSubscriptionStatus: "ACTIVE",
      platformSubscriptionReference: "PAYNOW-RENTER-BROWSER-DEMO-SGD5",
      platformSubscriptionPaidAt: renterPeriod.periodStartAt,
      platformSubscriptionPeriodStart: renterPeriod.periodStartAt,
      platformSubscriptionPeriodEnd: renterPeriod.periodEndAt,
      platformSubscriptionNextBilling: renterPeriod.nextBillingAt
    }
  });

  const listingView: Listing = {
    slug: scenario.listingSlug,
    title: "Browser Demo B2 Fabrication Bay",
    address: "Woodlands Industrial Xchange, Singapore",
    location: "Woodlands",
    sizeSqft: 850,
    spaceType: "LARGE_BAY",
    zoning: "B2",
    status: "APPROVED",
    accessHours: "8am-10pm daily with host induction",
    powerType: "THREE_PHASE",
    loadingAccess: ["ground floor", "cargo lift", "lorry access"],
    equipmentSlugs: ["workbench", "power-tools", "drill", "compressor", "material-storage"],
    includedAmenities: [
      "Marked fabrication bay",
      "Three-phase isolator",
      "Ground-floor loading zone",
      "Fire extinguishers",
      "Shared wash-up area",
      "No-contact Co-Build chat only"
    ],
    permittedWork: ["Assembly", "Packing", "Light fabrication", "Furniture work", "Signage work", "Storage + work area"],
    prohibitedWork: ["No welding unless approved", "No spray painting unless approved", "No chemical work unless approved"],
    safetyRules: commonSafetyRules,
    cancellationPolicy: "Cancel 72 hours before check-in for a 60% refund. Damage deposit is reviewed after check-out photos.",
    photoUrls: ["/assets/sample-workshop-photo-large-bay.png"],
    floorPlanUrl: "/assets/floor-plan-large-bay.png",
    prices: {
      day: 650,
      sevenDays: 3800,
      thirtyDays: 7800,
      sixtyDays: 14200
    },
    deposit: {
      standard: 3800,
      highRiskExtra: 1200
    },
    cleaningFee: 650
  };

  const selectedAddons = (await prisma.equipmentAddon.findMany({
    where: { slug: { in: ["workbench", "drill", "material-storage"] } }
  })) as EquipmentAddon[];
  const quote = calculateBookingQuote({
    listing: listingView,
    durationDays: 7,
    workType: "Assembly",
    addons: selectedAddons
  });

  const listing = await prisma.listing.create({
    data: {
      slug: listingView.slug,
      title: listingView.title,
      address: listingView.address,
      location: listingView.location,
      sizeSqft: listingView.sizeSqft,
      spaceType: listingView.spaceType,
      zoning: listingView.zoning,
      status: "APPROVED",
      accessHours: listingView.accessHours,
      powerType: listingView.powerType,
      loadingAccessJson: json(listingView.loadingAccess),
      amenitiesJson: json(listingView.includedAmenities),
      permittedWorkJson: json(listingView.permittedWork),
      prohibitedWorkJson: json(listingView.prohibitedWork),
      safetyRulesJson: json(listingView.safetyRules),
      cancellationPolicy: listingView.cancellationPolicy,
      photoUrlsJson: json(listingView.photoUrls),
      floorPlanUrl: listingView.floorPlanUrl,
      priceDay: listingView.prices.day,
      priceSevenDays: listingView.prices.sevenDays,
      priceThirtyDays: listingView.prices.thirtyDays,
      priceSixtyDays: listingView.prices.sixtyDays,
      depositStandard: listingView.deposit.standard,
      depositHighRisk: listingView.deposit.highRiskExtra,
      cleaningFee: listingView.cleaningFee,
      landlordApproval: "Not collected in host listing form",
      insuranceStatus: "Not collected in host listing form",
      fireSafety: "Extinguishers, spill kit, PPE signage, clear exit route",
      electricalSupply: "Three-phase supply declared by host",
      host: { connect: { id: host.id } },
      equipmentAddons: {
        create: listingView.equipmentSlugs.map((slug) => ({
          equipmentAddon: { connect: { slug } }
        }))
      }
    }
  });

  await prisma.upload.createMany({
    data: [
      {
        type: "LISTING_PHOTO",
        originalName: "browser-demo-workspace-photo.png",
        localPath: "/assets/sample-workshop-photo-large-bay.png",
        listingId: listing.id,
        createdAt: addMinutes(now, -66)
      },
      {
        type: "FLOOR_PLAN",
        originalName: "browser-demo-floor-plan.png",
        localPath: "/assets/floor-plan-large-bay.png",
        listingId: listing.id,
        createdAt: addMinutes(now, -65)
      },
      {
        type: "VERIFICATION",
        originalName: "browser-demo-renter-verification.pdf",
        localPath: "uploads/browser-demo-renter-verification.pdf",
        userId: renter.id,
        createdAt: addMinutes(now, -64)
      }
    ]
  });

  const conversation = await prisma.conversation.create({
    data: { listingId: listing.id, renterId: renter.id, hostId: host.id }
  });
  await prisma.conversationMessage.createMany({
    data: [
      {
        conversationId: conversation.id,
        senderId: renter.id,
        body: "I need 7 days for signage assembly. Can the bay support three-phase power and lorry unloading? I will keep all contact inside Co-Build chat.",
        createdAt: addMinutes(now, -55)
      },
      {
        conversationId: conversation.id,
        senderId: host.id,
        body: "Yes. Three-phase power and lorry access are available. Please select workbench, drill, and material storage if needed, then submit the booking on-platform.",
        createdAt: addMinutes(now, -50)
      }
    ]
  });

  const booking = await prisma.booking.create({
    data: {
      listing: { connect: { id: listing.id } },
      user: { connect: { id: renter.id } },
      durationDays: 7,
      workType: "Assembly",
      riskLevel: quote.riskLevel,
      status: "PAID_CONFIRMED",
      rentalTotal: quote.rentalTotal,
      deposit: quote.deposit,
      cleaningFee: quote.cleaningFee,
      addonTotal: quote.addonTotal,
      grandTotal: quote.grandTotal,
      safetyAcceptedAt: addMinutes(now, -45),
      renterDealConfirmedAt: addMinutes(now, -28),
      hostDealConfirmedAt: addMinutes(now, -25),
      addons: {
        create: selectedAddons.map((addon) => ({
          equipmentAddon: { connect: { slug: addon.slug } },
          priceAtBooking: addon.pricePerBooking
        }))
      }
    }
  });

  await prisma.bookingMessage.createMany({
    data: [
      {
        bookingId: booking.id,
        senderId: renter.id,
        body: `Booking submitted for 7 days. I accept PPE, waste clearing, and check-in/check-out photo rules. Total shown is ${formatCurrency(quote.grandTotal)}.`,
        createdAt: addMinutes(now, -43)
      },
      {
        bookingId: booking.id,
        senderId: host.id,
        body: "Booking approved by host. Access induction is at the unit entrance; please keep all coordination here in Co-Build chat.",
        createdAt: addMinutes(now, -40)
      },
      {
        bookingId: booking.id,
        senderId: renter.id,
        body: "Company-account payment proof submitted. I have confirmed the deal on-platform.",
        createdAt: addMinutes(now, -30)
      },
      {
        bookingId: booking.id,
        senderId: host.id,
        body: "Deal confirmed by host. Workbench, drill, and material storage are reserved for the booking period.",
        createdAt: addMinutes(now, -24)
      }
    ]
  });

  const addOnContract = buildAdditionalRequirementContract({
    bookingId: booking.id,
    listingTitle: listing.title,
    renterName: renter.fullName,
    renterEmail: renter.email,
    hostName: host.fullName,
    requirementDetail: "Additional evening access on two days and one extra material storage rack.",
    quotedRate: 220,
    issuedAt: now.toISOString().slice(0, 10)
  });

  const additionalRequirement = await prisma.additionalRequirement.create({
    data: {
      booking: { connect: { id: booking.id } },
      user: { connect: { id: renter.id } },
      detail: "Additional evening access on two days and one extra material storage rack.",
      status: "PAID_CONFIRMED",
      quotedRate: 220,
      contractText: addOnContract,
      emailedTo: renter.email,
      emailedAt: addMinutes(now, -20),
      paidAt: addMinutes(now, -18),
      createdAt: addMinutes(now, -35)
    }
  });

  await prisma.upload.createMany({
    data: [
      {
        type: "CHECK_IN",
        originalName: "browser-demo-check-in-photo.png",
        localPath: "uploads/browser-demo-check-in-photo.png",
        userId: renter.id,
        bookingId: booking.id,
        createdAt: addMinutes(now, -15)
      },
      {
        type: "CHECK_OUT",
        originalName: "browser-demo-check-out-photo.png",
        localPath: "uploads/browser-demo-check-out-photo.png",
        userId: renter.id,
        bookingId: booking.id,
        createdAt: addMinutes(now, -10)
      }
    ]
  });

  await prisma.approvalEvent.createMany({
    data: [
      {
        actorId: admin.id,
        target: "user_verification",
        decision: "APPROVED",
        note: "Admin approved browser demo host account after company verification.",
        createdAt: addMinutes(now, -78)
      },
      {
        actorId: admin.id,
        target: "user_verification",
        decision: "APPROVED",
        note: "Admin approved browser demo renter account after verification upload.",
        createdAt: addMinutes(now, -77)
      },
      {
        actorId: admin.id,
        target: "platform_subscription",
        decision: "APPROVED",
        note: "Admin activated recurring host subscription paid to the company account at S$5/month.",
        createdAt: addMinutes(now, -72)
      },
      {
        actorId: admin.id,
        target: "platform_subscription",
        decision: "APPROVED",
        note: "Admin activated recurring renter subscription paid to the company account at S$5/month.",
        createdAt: addMinutes(now, -71)
      },
      {
        actorId: admin.id,
        listingId: listing.id,
        target: "listing",
        decision: "APPROVED",
        note: "Admin approved browser demo listing with workspace photo, floor plan, B2 type, pricing, deposit, and safety rules.",
        createdAt: addMinutes(now, -63)
      },
      {
        actorId: host.id,
        bookingId: booking.id,
        target: "booking",
        decision: "APPROVED",
        note: "Host approved browser demo booking after pre-deal chat.",
        createdAt: addMinutes(now, -39)
      },
      {
        actorId: renter.id,
        bookingId: booking.id,
        target: "payment",
        decision: "APPROVED",
        note: "Renter submitted company-account payment proof for rental, deposit, cleaning, and equipment add-ons.",
        createdAt: addMinutes(now, -31)
      },
      {
        actorId: renter.id,
        bookingId: booking.id,
        target: "deal_confirmation",
        decision: "APPROVED",
        note: "Renter confirmed deal on platform. No direct contact details exchanged.",
        createdAt: addMinutes(now, -28)
      },
      {
        actorId: host.id,
        bookingId: booking.id,
        target: "deal_confirmation",
        decision: "APPROVED",
        note: "Host confirmed deal on platform. Admin collected no deal commission.",
        createdAt: addMinutes(now, -25)
      },
      {
        actorId: host.id,
        bookingId: booking.id,
        target: "additional_requirement",
        decision: "APPROVED",
        note: "Host approved browser demo additional requirement at S$220. Contract emailed to renter login email.",
        createdAt: addMinutes(now, -20)
      },
      {
        actorId: renter.id,
        bookingId: booking.id,
        target: "additional_requirement_payment",
        decision: "APPROVED",
        note: "Renter paid the approved additional requirement rate to the company account.",
        createdAt: addMinutes(now, -18)
      }
    ]
  });

  const urls = {
    admin: absoluteUrl("/dashboard/admin"),
    hostDashboard: absoluteUrl(`/dashboard/host?account=${host.id}`),
    hostListingForm: absoluteUrl(`/dashboard/host/listings/new?account=${host.id}`),
    renterSearch: absoluteUrl(
      `/search?location=Woodlands&sizeBand=UNDER_1000&durationDays=7&workType=Assembly&powerType=THREE_PHASE&factoryType=B2&equipment=workbench&equipment=drill&equipment=material-storage`
    ),
    renterListing: absoluteUrl(`/listings/${listing.slug}?account=${renter.id}`),
    renterDashboard: absoluteUrl(`/dashboard/user?account=${renter.id}`),
    checkout: absoluteUrl(`/checkout/${listing.slug}?account=${renter.id}`)
  };

  const summary = {
    generatedAt: now.toISOString(),
    accounts: {
      admin: { id: admin.id, email: admin.email, role: admin.role },
      host: {
        id: host.id,
        email: host.email,
        role: host.role,
        subscription: host.platformSubscriptionStatus,
        paymentReference: host.platformSubscriptionReference
      },
      renter: {
        id: renter.id,
        email: renter.email,
        role: renter.role,
        subscription: renter.platformSubscriptionStatus,
        paymentReference: renter.platformSubscriptionReference
      }
    },
    listing: {
      id: listing.id,
      slug: listing.slug,
      title: listing.title,
      status: listing.status,
      sizeSqft: listing.sizeSqft,
      factoryType: listing.zoning,
      photo: listingView.photoUrls[0],
      floorPlan: listingView.floorPlanUrl
    },
    booking: {
      id: booking.id,
      status: booking.status,
      durationDays: booking.durationDays,
      workType: booking.workType,
      rentalTotal: quote.rentalTotal,
      deposit: quote.deposit,
      cleaningFee: quote.cleaningFee,
      addonTotal: quote.addonTotal,
      grandTotal: quote.grandTotal,
      renterDealConfirmed: true,
      hostDealConfirmed: true
    },
    additionalRequirement: {
      id: additionalRequirement.id,
      status: additionalRequirement.status,
      quotedRate: additionalRequirement.quotedRate,
      contractEmailedTo: additionalRequirement.emailedTo
    },
    urls
  };

  const jsonPath = join(outputDir, "demo-state.json");
  const markdownPath = join(outputDir, "summary.md");
  writeFileSync(jsonPath, JSON.stringify(summary, null, 2));
  writeFileSync(
    markdownPath,
    [
      "# Co-Build Three-Role Live Demo",
      "",
      `Generated: ${summary.generatedAt}`,
      "",
      "## Accounts",
      "",
      `- Admin: ${admin.email}`,
      `- Host: ${host.email} / ${host.platformSubscriptionStatus} / ${host.platformSubscriptionReference}`,
      `- Renter: ${renter.email} / ${renter.platformSubscriptionStatus} / ${renter.platformSubscriptionReference}`,
      "",
      "## Deal",
      "",
      `- Listing: ${listing.title}`,
      `- Booking: ${booking.durationDays} days / ${booking.workType} / ${booking.status}`,
      `- Price: rental ${formatCurrency(quote.rentalTotal)}, deposit ${formatCurrency(quote.deposit)}, cleaning ${formatCurrency(quote.cleaningFee)}, add-ons ${formatCurrency(quote.addonTotal)}, total ${formatCurrency(quote.grandTotal)}`,
      `- Additional requirement: ${formatCurrency(additionalRequirement.quotedRate)} / ${additionalRequirement.status} / contract emailed to renter login email`,
      "",
      "## Browser URLs",
      "",
      `- Admin: ${urls.admin}`,
      `- Host dashboard: ${urls.hostDashboard}`,
      `- Host listing form: ${urls.hostListingForm}`,
      `- Renter search: ${urls.renterSearch}`,
      `- Renter listing chat: ${urls.renterListing}`,
      `- Renter dashboard: ${urls.renterDashboard}`,
      `- Checkout: ${urls.checkout}`,
      ""
    ].join("\n")
  );

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
