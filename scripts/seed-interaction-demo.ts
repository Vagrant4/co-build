import { PrismaClient } from "@prisma/client";
import { buildAdditionalRequirementContract, calculateBookingQuote } from "../src/lib/fabrication";
import { seedEquipmentAddons, seedListings } from "../src/lib/seed-data";

const prisma = new PrismaClient();
const issuedAt = "2026-06-23";

async function main() {
  await ensureAdminUser();
  await seedPreDealChats();
  await seedBookingWorkflowExtras();
  await seedHighRiskAdminScenario();
  await seedOperationalUploads();
  await seedApprovalTrail();

  console.log("Host/renter/admin interaction demo data ready.");
}

async function ensureAdminUser() {
  await prisma.user.upsert({
    where: { id: "demo-admin" },
    update: {
      role: "ADMIN",
      fullName: "Admin Operations",
      mobile: "+65 8333 0001",
      email: "admin@co-build.local",
      companyName: "Co-Build Platform",
      workType: "Platform administration",
      verificationStatus: "APPROVED",
      platformSubscriptionStatus: "ACTIVE",
      suspended: false
    },
    create: {
      id: "demo-admin",
      role: "ADMIN",
      fullName: "Admin Operations",
      mobile: "+65 8333 0001",
      email: "admin@co-build.local",
      companyName: "Co-Build Platform",
      workType: "Platform administration",
      verificationStatus: "APPROVED",
      platformSubscriptionStatus: "ACTIVE",
      suspended: false
    }
  });
}

async function seedPreDealChats() {
  const eastListing = await prisma.listing.findUniqueOrThrow({ where: { slug: "demo-east-confirmed-bay" } });
  const westListing = await prisma.listing.findUniqueOrThrow({ where: { slug: "demo-west-confirmed-bay" } });

  await prisma.conversationMessage.deleteMany({
    where: { id: { in: [
          "demo-prechat-east-1",
          "demo-prechat-east-2",
          "demo-prechat-east-3",
          "demo-prechat-west-1",
          "demo-prechat-west-2"
    ] } }
  });
  await prisma.conversation.deleteMany({ where: { id: { in: ["demo-conversation-east", "demo-conversation-west"] } } });

  await prisma.conversation.createMany({ data: [
    { id: "demo-conversation-east", listingId: eastListing.id, renterId: "demo-renter-alpha", hostId: "demo-host-east", updatedAt: new Date("2026-06-23T08:08:00.000Z") },
    { id: "demo-conversation-west", listingId: westListing.id, renterId: "demo-renter-beta", hostId: "demo-host-west", updatedAt: new Date("2026-06-23T08:20:00.000Z") }
  ] });
  await prisma.conversationMessage.createMany({
    data: [
      {
        id: "demo-prechat-east-1",
        conversationId: "demo-conversation-east",
        senderId: "demo-renter-alpha",
        body: "Can we reserve the bay for 7 days for assembly and packing? We will keep all communication here in Co-Build chat.",
        createdAt: new Date("2026-06-23T08:00:00.000Z")
      },
      {
        id: "demo-prechat-east-2",
        conversationId: "demo-conversation-east",
        senderId: "demo-host-east",
        body: "Yes. Ramp access is available from 8am, and power tools can be requested as add-ons before checkout.",
        createdAt: new Date("2026-06-23T08:05:00.000Z")
      },
      {
        id: "demo-prechat-east-3",
        conversationId: "demo-conversation-east",
        senderId: "demo-renter-alpha",
        body: "Confirmed. We will submit the booking request with workbench and safety acceptance.",
        createdAt: new Date("2026-06-23T08:08:00.000Z")
      },
      {
        id: "demo-prechat-west-1",
        conversationId: "demo-conversation-west",
        senderId: "demo-renter-beta",
        body: "We need 30 days for signage assembly with material storage. Is cargo lift access available?",
        createdAt: new Date("2026-06-23T08:15:00.000Z")
      },
      {
        id: "demo-prechat-west-2",
        conversationId: "demo-conversation-west",
        senderId: "demo-host-west",
        body: "Cargo lift and B2 suitability are available. Please keep the project scope in the checkout notes and chat.",
        createdAt: new Date("2026-06-23T08:20:00.000Z")
      }
    ]
  });
}

async function seedBookingWorkflowExtras() {
  const alphaBooking = await prisma.booking.findUniqueOrThrow({
    where: { id: "demo-deal-alpha-east" },
    include: { listing: { include: { host: true } }, user: true }
  });
  const betaBooking = await prisma.booking.findUniqueOrThrow({
    where: { id: "demo-deal-beta-west" },
    include: { listing: { include: { host: true } }, user: true }
  });

  await prisma.bookingMessage.deleteMany({
    where: {
      id: {
        in: [
          "demo-booking-alpha-1",
          "demo-booking-alpha-2",
          "demo-booking-alpha-3",
          "demo-booking-beta-1",
          "demo-booking-beta-2"
        ]
      }
    }
  });
  await prisma.bookingMessage.createMany({
    data: [
      {
        id: "demo-booking-alpha-1",
        bookingId: alphaBooking.id,
        senderId: alphaBooking.userId,
        body: "Booking paid and safety rules accepted. We will upload check-in photos before starting work.",
        createdAt: new Date("2026-06-23T09:20:00.000Z")
      },
      {
        id: "demo-booking-alpha-2",
        bookingId: alphaBooking.id,
        senderId: alphaBooking.listing.hostId!,
        body: "Host confirms loading window and bench position. Please request any extra storage here before arrival.",
        createdAt: new Date("2026-06-23T09:25:00.000Z")
      },
      {
        id: "demo-booking-alpha-3",
        bookingId: alphaBooking.id,
        senderId: alphaBooking.userId,
        body: "Requesting two extra storage racks and one evening access extension. Please quote the add-on rate in the platform.",
        createdAt: new Date("2026-06-23T09:35:00.000Z")
      },
      {
        id: "demo-booking-beta-1",
        bookingId: betaBooking.id,
        senderId: betaBooking.userId,
        body: "We need material storage near the cargo lift and will keep the walkway clear.",
        createdAt: new Date("2026-06-23T10:10:00.000Z")
      },
      {
        id: "demo-booking-beta-2",
        bookingId: betaBooking.id,
        senderId: betaBooking.listing.hostId!,
        body: "Acknowledged. Submit the additional storage request and I will approve a rate for payment.",
        createdAt: new Date("2026-06-23T10:15:00.000Z")
      }
    ]
  });

  await upsertAdditionalRequirement({
    id: "demo-extra-alpha-contract",
    booking: alphaBooking,
    detail: "Two extra storage racks, one evening access extension, and extra end-of-project cleaning.",
    quotedRate: 280,
    status: "PAID_CONFIRMED",
    paidAt: new Date("2026-06-23T10:00:00.000Z")
  });

  await upsertAdditionalRequirement({
    id: "demo-extra-beta-pending",
    booking: betaBooking,
    detail: "Additional material storage beside cargo lift for 30-day signage project.",
    quotedRate: 150,
    status: "PENDING_HOST"
  });
}

async function seedHighRiskAdminScenario() {
  const listing = await prisma.listing.findUniqueOrThrow({
    where: { slug: "large-bay-tuas" },
    include: { equipmentAddons: { include: { equipmentAddon: true } } }
  });
  const source = seedListings.find((item) => item.slug === "large-bay-tuas");
  const addon = await prisma.equipmentAddon.findUniqueOrThrow({ where: { slug: "welding-set" } });
  if (!source) throw new Error("Missing large-bay-tuas seed listing.");
  const quote = calculateBookingQuote({ listing: source, durationDays: 30, workType: "Welding", addons: [addon] });

  await prisma.booking.upsert({
    where: { id: "demo-high-risk-admin-review" },
    update: {
      listingId: listing.id,
      userId: "demo-renter-alpha",
      durationDays: 30,
      workType: "Welding",
      riskLevel: quote.riskLevel,
      status: "PENDING_ADMIN_HIGH_RISK",
      rentalTotal: quote.rentalTotal,
      deposit: quote.deposit,
      cleaningFee: quote.cleaningFee,
      addonTotal: quote.addonTotal,
      grandTotal: quote.grandTotal,
      safetyAcceptedAt: new Date("2026-06-23T11:00:00.000Z"),
      renterDealConfirmedAt: null,
      hostDealConfirmedAt: null
    },
    create: {
      id: "demo-high-risk-admin-review",
      listingId: listing.id,
      userId: "demo-renter-alpha",
      durationDays: 30,
      workType: "Welding",
      riskLevel: quote.riskLevel,
      status: "PENDING_ADMIN_HIGH_RISK",
      rentalTotal: quote.rentalTotal,
      deposit: quote.deposit,
      cleaningFee: quote.cleaningFee,
      addonTotal: quote.addonTotal,
      grandTotal: quote.grandTotal,
      safetyAcceptedAt: new Date("2026-06-23T11:00:00.000Z"),
      addons: {
        create: {
          equipmentAddon: { connect: { slug: addon.slug } },
          priceAtBooking: addon.pricePerBooking
        }
      }
    }
  });

  await prisma.bookingAddon.upsert({
    where: { bookingId_equipmentAddonId: { bookingId: "demo-high-risk-admin-review", equipmentAddonId: addon.id } },
    update: { priceAtBooking: addon.pricePerBooking },
    create: {
      bookingId: "demo-high-risk-admin-review",
      equipmentAddonId: addon.id,
      priceAtBooking: addon.pricePerBooking
    }
  });

  await prisma.bookingMessage.deleteMany({ where: { id: { in: ["demo-highrisk-chat-1", "demo-highrisk-chat-2"] } } });
  await prisma.bookingMessage.createMany({
    data: [
      {
        id: "demo-highrisk-chat-1",
        bookingId: "demo-high-risk-admin-review",
        senderId: "demo-renter-alpha",
        body: "This welding request is ready for admin review. We will provide PPE and hot-work method statement in platform chat.",
        createdAt: new Date("2026-06-23T11:05:00.000Z")
      },
      {
        id: "demo-highrisk-chat-2",
        bookingId: "demo-high-risk-admin-review",
        senderId: listing.hostId ?? "demo-host",
        body: "Host has reviewed the scope. Admin approval is required before payment because this is welding work.",
        createdAt: new Date("2026-06-23T11:08:00.000Z")
      }
    ]
  });
}

async function seedOperationalUploads() {
  await prisma.upload.deleteMany({
    where: { id: { in: ["demo-alpha-check-in", "demo-alpha-check-out", "demo-alpha-verification", "demo-east-listing-photo"] } }
  });
  await prisma.upload.createMany({
    data: [
      {
        id: "demo-alpha-verification",
        type: "VERIFICATION",
        originalName: "uen-verification-demo.pdf",
        storageProvider: "LEGACY_LOCAL", legacyLocalPath: "uploads/demo/uen-verification-demo.pdf", uploadStatus: "LEGACY_DEMO", scanStatus: "NOT_REQUIRED",
        uploadedByUserId: "demo-renter-alpha", ownerUserId: "demo-renter-alpha"
      },
      {
        id: "demo-alpha-check-in",
        type: "CHECK_IN",
        originalName: "check-in-bay-condition.jpg",
        storageProvider: "LEGACY_LOCAL", legacyLocalPath: "uploads/demo/check-in-bay-condition.jpg", uploadStatus: "LEGACY_DEMO", scanStatus: "NOT_REQUIRED",
        bookingId: "demo-deal-alpha-east"
      },
      {
        id: "demo-alpha-check-out",
        type: "CHECK_OUT",
        originalName: "check-out-cleaned-bay.jpg",
        storageProvider: "LEGACY_LOCAL", legacyLocalPath: "uploads/demo/check-out-cleaned-bay.jpg", uploadStatus: "LEGACY_DEMO", scanStatus: "NOT_REQUIRED",
        bookingId: "demo-deal-alpha-east"
      },
      {
        id: "demo-east-listing-photo",
        type: "LISTING_PHOTO",
        originalName: "demo-east-workspace-photo.png",
        storageProvider: "LEGACY_LOCAL", legacyLocalPath: "public/assets/sample-workshop-photo-small-bay.png", uploadStatus: "LEGACY_DEMO", scanStatus: "NOT_REQUIRED",
        listingId: (await prisma.listing.findUniqueOrThrow({ where: { slug: "demo-east-confirmed-bay" } })).id
      }
    ]
  });
}

async function seedApprovalTrail() {
  await prisma.approvalEvent.deleteMany({
    where: {
      id: {
        in: [
          "demo-approval-listing-east",
          "demo-approval-alpha-payment",
          "demo-approval-alpha-extra",
          "demo-approval-high-risk",
          "demo-approval-pricing"
        ]
      }
    }
  });

  const eastListing = await prisma.listing.findUniqueOrThrow({ where: { slug: "demo-east-confirmed-bay" } });
  await prisma.approvalEvent.createMany({
    data: [
      {
        id: "demo-approval-listing-east",
        actorId: "demo-admin",
        listingId: eastListing.id,
        target: "listing",
        decision: "APPROVED",
        note: "Admin approved host listing after checking type, fire safety, power, pricing, and photos.",
        createdAt: new Date("2026-06-23T08:45:00.000Z")
      },
      {
        id: "demo-approval-alpha-payment",
        actorId: "demo-renter-alpha",
        bookingId: "demo-deal-alpha-east",
        target: "booking_payment",
        decision: "APPROVED",
        note: "Renter paid booking total and deposit after host approval and safety acceptance.",
        createdAt: new Date("2026-06-23T09:15:00.000Z")
      },
      {
        id: "demo-approval-alpha-extra",
        actorId: "demo-host-east",
        bookingId: "demo-deal-alpha-east",
        target: "additional_requirement",
        decision: "APPROVED",
        note: "Host approved extra storage and access at S$280; contract generated and sent to login email.",
        createdAt: new Date("2026-06-23T09:55:00.000Z")
      },
      {
        id: "demo-approval-high-risk",
        actorId: "demo-admin",
        bookingId: "demo-high-risk-admin-review",
        target: "high_risk_work",
        decision: "APPROVED",
        note: "Admin screen shows welding workflow pending review before payment can proceed.",
        createdAt: new Date("2026-06-23T11:10:00.000Z")
      },
      {
        id: "demo-approval-pricing",
        actorId: "demo-admin",
        target: "pricing_management",
        decision: "APPROVED",
        note: "Admin can update equipment pricing, day rates, month rates, deposits, and cleaning fees from pricing controls.",
        createdAt: new Date("2026-06-23T11:20:00.000Z")
      }
    ]
  });
}

async function upsertAdditionalRequirement({
  id,
  booking,
  detail,
  quotedRate,
  status,
  paidAt
}: {
  id: string;
  booking: Awaited<ReturnType<typeof prisma.booking.findUniqueOrThrow>> & {
    listing: { title: string; host: { fullName: string } | null };
    user: { fullName: string; email: string };
  };
  detail: string;
  quotedRate: number;
  status: "PENDING_HOST" | "APPROVED_FOR_PAYMENT" | "PAID_CONFIRMED";
  paidAt?: Date;
}) {
  const contractText =
    status === "PENDING_HOST"
      ? null
      : buildAdditionalRequirementContract({
          bookingId: booking.id,
          listingTitle: booking.listing.title,
          renterName: booking.user.fullName,
          hostName: booking.listing.host?.fullName ?? "Host",
          requirementDetail: detail,
          quotedRate,
          issuedAt
        });

  await prisma.additionalRequirement.upsert({
    where: { id },
    update: {
      detail,
      status,
      quotedRate: status === "PENDING_HOST" ? 0 : quotedRate,
      contractText,
      emailedTo: null,
      emailedAt: null,
      paidAt: paidAt ?? null
    },
    create: {
      id,
      bookingId: booking.id,
      userId: booking.userId,
      detail,
      status,
      quotedRate: status === "PENDING_HOST" ? 0 : quotedRate,
      contractText,
      emailedTo: null,
      emailedAt: null,
      paidAt: paidAt ?? null
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
