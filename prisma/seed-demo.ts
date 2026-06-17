import type { PrismaClient } from "@prisma/client";
import { calculateBookingQuote } from "../src/lib/fabrication";
import { seedEquipmentAddons, seedListings } from "../src/lib/seed-data";

export async function seedDemoData(prisma: PrismaClient, options: { reset?: boolean } = {}) {
  if (options.reset) {
    await prisma.approvalEvent.deleteMany();
    await prisma.upload.deleteMany();
    await prisma.additionalRequirement.deleteMany();
    await prisma.bookingMessage.deleteMany();
    await prisma.bookingAddon.deleteMany();
    await prisma.booking.deleteMany();
    await prisma.listingEquipment.deleteMany();
    await prisma.listing.deleteMany();
    await prisma.equipmentAddon.deleteMany();
    await prisma.user.deleteMany();
  }

  await prisma.user.createMany({
    data: [
      {
        id: "demo-renter",
        role: "RENTER",
        fullName: "Aisha Tan",
        mobile: "+65 9000 1200",
        email: "renter@example.com",
        companyName: "Tan Studio Works",
        uen: "202400001A",
        workType: "Furniture work",
        experienceLevel: "Intermediate",
        verificationStatus: "APPROVED"
      },
      {
        id: "demo-host",
        role: "HOST",
        fullName: "Marcus Lim",
        mobile: "+65 9000 2200",
        email: "host@example.com",
        companyName: "Lim Industrial Space",
        uen: "201900002B",
        workType: "Space owner",
        experienceLevel: "Experienced",
        verificationStatus: "APPROVED"
      },
      {
        id: "demo-admin",
        role: "ADMIN",
        fullName: "Ops Admin",
        mobile: "+65 9000 3300",
        email: "admin@example.com",
        companyName: "Fabrication Bay Ops",
        workType: "Compliance",
        experienceLevel: "Experienced",
        verificationStatus: "APPROVED"
      }
    ]
  });

  for (const addon of seedEquipmentAddons) {
    await prisma.equipmentAddon.create({ data: addon });
  }

  for (const listing of seedListings) {
    await prisma.listing.create({
      data: {
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
        landlordApproval: "Host confirmed landlord approval",
        insuranceStatus: "Public liability insurance declared",
        fireSafety: "Extinguishers, marked exits, spill kit where relevant",
        electricalSupply: listing.powerType === "THREE_PHASE" ? "Three-phase industrial supply" : "Single-phase 240V supply",
        hostId: "demo-host",
        equipmentAddons: {
          create: listing.equipmentSlugs.map((slug) => ({
            equipmentAddon: { connect: { slug } }
          }))
        }
      }
    });
  }

  const normalListing = seedListings.find((listing) => listing.slug === "small-bay-eunos")!;
  const handTools = seedEquipmentAddons.find((addon) => addon.slug === "hand-tools")!;
  const normalQuote = calculateBookingQuote({
    listing: normalListing,
    durationDays: 7,
    workType: "Packing",
    addons: [handTools]
  });
  const normalBooking = await prisma.booking.create({
    data: {
      listing: { connect: { slug: normalListing.slug } },
      user: { connect: { id: "demo-renter" } },
      durationDays: normalQuote.durationDays,
      workType: "Packing",
      riskLevel: normalQuote.riskLevel,
      status: "PAID_CONFIRMED",
      rentalTotal: normalQuote.rentalTotal,
      deposit: normalQuote.deposit,
      cleaningFee: normalQuote.cleaningFee,
      addonTotal: normalQuote.addonTotal,
      grandTotal: normalQuote.grandTotal,
      safetyAcceptedAt: new Date(),
      addons: {
        create: {
          equipmentAddon: { connect: { slug: handTools.slug } },
          priceAtBooking: handTools.pricePerBooking
        }
      }
    }
  });

  const highRiskListing = seedListings.find((listing) => listing.slug === "large-bay-tuas")!;
  const weldingSet = seedEquipmentAddons.find((addon) => addon.slug === "welding-set")!;
  const highRiskQuote = calculateBookingQuote({
    listing: highRiskListing,
    durationDays: 30,
    workType: "Welding",
    addons: [weldingSet]
  });
  const highRiskBooking = await prisma.booking.create({
    data: {
      listing: { connect: { slug: highRiskListing.slug } },
      user: { connect: { id: "demo-renter" } },
      durationDays: highRiskQuote.durationDays,
      workType: "Welding",
      riskLevel: highRiskQuote.riskLevel,
      status: "PENDING_ADMIN_HIGH_RISK",
      rentalTotal: highRiskQuote.rentalTotal,
      deposit: highRiskQuote.deposit,
      cleaningFee: highRiskQuote.cleaningFee,
      addonTotal: highRiskQuote.addonTotal,
      grandTotal: highRiskQuote.grandTotal,
      safetyAcceptedAt: new Date(),
      addons: {
        create: {
          equipmentAddon: { connect: { slug: weldingSet.slug } },
          priceAtBooking: weldingSet.pricePerBooking
        }
      }
    }
  });

  await prisma.bookingMessage.createMany({
    data: [
      {
        bookingId: normalBooking.id,
        senderId: "demo-renter",
        body: "Hi Marcus, we will use the space for packing and light assembly only."
      },
      {
        bookingId: normalBooking.id,
        senderId: "demo-host",
        body: "Confirmed. Loading ramp is available from 8am; please upload check-in photos before work starts."
      },
      {
        bookingId: highRiskBooking.id,
        senderId: "demo-host",
        body: "Welding request received. We are waiting for admin high-risk approval before payment."
      }
    ]
  });

  await prisma.approvalEvent.create({
    data: {
      actor: { connect: { id: "demo-host" } },
      booking: { connect: { id: highRiskBooking.id } },
      target: "booking",
      decision: "APPROVED",
      note: "Host approved; waiting for admin high-risk work approval."
    }
  });
}
