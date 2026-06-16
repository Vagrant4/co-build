import { describe, expect, it } from "vitest";
import {
  advanceAdditionalRequirementStatus,
  advanceBookingStatus,
  buildRecurringSubscriptionPeriod,
  buildAdditionalRequirementContract,
  calculateBookingQuote,
  calculatePlatformSubscriptionRevenue,
  classifyWorkRisk,
  convenientPaymentMethods,
  dealConfirmationStatus,
  filterListings,
  inferSpaceTypeFromSize,
  PLATFORM_SUBSCRIPTION_MONTHLY,
  sizeBandLabel
} from "../src/lib/fabrication";
import { seedEquipmentAddons, seedListings } from "../src/lib/seed-data";

describe("pricing", () => {
  it("calculates a 1-day maker bench booking with deposit, cleaning, and equipment add-ons", () => {
    const listing = seedListings.find((item) => item.spaceType === "MAKER_BENCH");
    const handTools = seedEquipmentAddons.find((item) => item.slug === "hand-tools");
    const workbench = seedEquipmentAddons.find((item) => item.slug === "workbench");

    const quote = calculateBookingQuote({
      listing: listing!,
      durationDays: 1,
      addons: [handTools!, workbench!],
      workType: "Assembly"
    });

    expect(quote).toEqual({
      durationDays: 1,
      rentalTotal: 45,
      deposit: 200,
      cleaningFee: 35,
      addonTotal: 25,
      grandTotal: 305,
      riskLevel: "STANDARD"
    });
  });

  it("calculates 30-day and 60-day bay pricing from the listing price table", () => {
    const smallBay = seedListings.find((item) => item.spaceType === "SMALL_BAY");
    const mediumBay = seedListings.find((item) => item.spaceType === "MEDIUM_BAY");

    expect(
      calculateBookingQuote({
        listing: smallBay!,
        durationDays: 30,
        addons: [],
        workType: "Packing"
      }).grandTotal
    ).toBe(2250);

    expect(
      calculateBookingQuote({
        listing: mediumBay!,
        durationDays: 60,
        addons: [],
        workType: "Furniture work"
      }).grandTotal
    ).toBe(7500);
  });
});

describe("zoning and risk", () => {
  it("classifies B1-friendly work as standard risk", () => {
    expect(classifyWorkRisk("Electronics", "B1")).toEqual({
      riskLevel: "STANDARD",
      requiresAdminApproval: false,
      reason: "Electronics is suitable for B1 light industrial use."
    });
  });

  it("requires admin approval for hot work, spray painting, chemical work, and B1/B2 mismatches", () => {
    expect(classifyWorkRisk("Welding", "B2").requiresAdminApproval).toBe(true);
    expect(classifyWorkRisk("Spray painting, approval-only", "B2").requiresAdminApproval).toBe(true);
    expect(classifyWorkRisk("Chemical work, approval-only", "B2").requiresAdminApproval).toBe(true);
    expect(classifyWorkRisk("Grinding", "B1")).toEqual({
      riskLevel: "ADMIN_APPROVAL",
      requiresAdminApproval: true,
      reason: "Grinding is heavier/noisy work and needs a B2 space."
    });
  });
});

describe("search filtering", () => {
  it("labels renter size requirements without Maker Bench, Small Bay, Medium Bay, or Large Bay terms", () => {
    expect(sizeBandLabel("UNDER_1000")).toBe("Smaller than 1,000 sqft");
    expect(sizeBandLabel("UNDER_5000")).toBe("Smaller than 5,000 sqft");
    expect(sizeBandLabel("UNDER_10000")).toBe("Smaller than 10,000 sqft");
    expect(sizeBandLabel("OVER_10000")).toBe("Bigger than 10,000 sqft");
  });

  it("infers the internal space type from sqft so hosts do not choose legacy space labels", () => {
    expect(inferSpaceTypeFromSize(45)).toBe("MAKER_BENCH");
    expect(inferSpaceTypeFromSize(140)).toBe("SMALL_BAY");
    expect(inferSpaceTypeFromSize(320)).toBe("MEDIUM_BAY");
    expect(inferSpaceTypeFromSize(850)).toBe("LARGE_BAY");
  });

  it("filters approved listings by location, size, duration, work type, power, equipment, loading, and zoning", () => {
    const results = filterListings(seedListings, {
      location: "Woodlands",
      sizeBand: "UNDER_1000",
      durationDays: 30,
      workType: "Furniture work",
      powerType: "THREE_PHASE",
      equipment: ["cnc-machine"],
      loadingAccess: "cargo lift",
      factoryType: "B2"
    });

    expect(results.map((listing) => listing.slug)).toEqual(["medium-bay-woodlands"]);
  });

  it("filters by larger size bands and office factory type", () => {
    expect(
      filterListings(
        [
          ...seedListings,
          {
            ...seedListings[3],
            slug: "oversized-yard",
            title: "12,000 sqft project yard",
            sizeSqft: 12000
          }
        ],
        { sizeBand: "OVER_10000" }
      ).map((listing) => listing.slug)
    ).toEqual(["oversized-yard"]);

    expect(filterListings(seedListings, { factoryType: "OFFICE" })).toEqual([]);
  });
});

describe("booking workflow", () => {
  it("moves normal bookings through host approval, payment, check-in, and check-out", () => {
    expect(advanceBookingStatus("PENDING_HOST", "HOST_APPROVE", "STANDARD")).toBe("APPROVED_FOR_PAYMENT");
    expect(advanceBookingStatus("APPROVED_FOR_PAYMENT", "PAY", "STANDARD")).toBe("PAID_CONFIRMED");
    expect(advanceBookingStatus("PAID_CONFIRMED", "CHECK_IN", "STANDARD")).toBe("CHECKED_IN");
    expect(advanceBookingStatus("CHECKED_IN", "CHECK_OUT", "STANDARD")).toBe("CHECKED_OUT");
  });

  it("routes high-risk bookings through admin approval before payment", () => {
    expect(advanceBookingStatus("PENDING_HOST", "HOST_APPROVE", "ADMIN_APPROVAL")).toBe(
      "PENDING_ADMIN_HIGH_RISK"
    );
    expect(advanceBookingStatus("PENDING_ADMIN_HIGH_RISK", "ADMIN_APPROVE", "ADMIN_APPROVAL")).toBe(
      "APPROVED_FOR_PAYMENT"
    );
  });
});

describe("additional requirement workflow", () => {
  it("routes requested add-on requirements through host approval and payment", () => {
    expect(advanceAdditionalRequirementStatus("PENDING_HOST", "HOST_APPROVE")).toBe("APPROVED_FOR_PAYMENT");
    expect(advanceAdditionalRequirementStatus("APPROVED_FOR_PAYMENT", "PAY")).toBe("PAID_CONFIRMED");
    expect(advanceAdditionalRequirementStatus("PENDING_HOST", "HOST_REJECT")).toBe("HOST_REJECTED");
  });

  it("generates a contract containing rate, requirement detail, and renter login email", () => {
    const contract = buildAdditionalRequirementContract({
      bookingId: "booking-100",
      listingTitle: "Small Bay with lorry access",
      renterName: "Aisha Tan",
      renterEmail: "renter@example.com",
      hostName: "Marcus Lim",
      requirementDetail: "Need extra compressor support after 6pm.",
      quotedRate: 275,
      issuedAt: "2026-06-15"
    });

    expect(contract).toContain("Additional Requirement Contract");
    expect(contract).toContain("Small Bay with lorry access");
    expect(contract).toContain("Need extra compressor support after 6pm.");
    expect(contract).toContain("S$275");
    expect(contract).toContain("Contract emailed to: renter@example.com");
  });
});

describe("subscription and deal confirmation model", () => {
  it("offers admin-managed Stripe payment methods for the recurring subscription", () => {
    expect(convenientPaymentMethods.map((method) => method.name)).toEqual([
      "Stripe Checkout",
      "Stripe recurring subscription",
      "Stripe invoice link"
    ]);
    expect(convenientPaymentMethods.every((method) => method.adminCollectedThroughStripe)).toBe(true);
  });

  it("charges user and host subscriptions at S$5/month only", () => {
    expect(PLATFORM_SUBSCRIPTION_MONTHLY).toBe(5);
    expect(calculatePlatformSubscriptionRevenue(2)).toBe(10);
  });

  it("builds a recurring monthly subscription period with the next renewal date", () => {
    expect(buildRecurringSubscriptionPeriod(new Date("2026-06-15T08:00:00.000Z"))).toEqual({
      monthlyAmount: 5,
      periodStartAt: new Date("2026-06-15T08:00:00.000Z"),
      periodEndAt: new Date("2026-07-15T08:00:00.000Z"),
      nextBillingAt: new Date("2026-07-15T08:00:00.000Z")
    });
  });

  it("does not calculate any admin commission on deals", () => {
    expect(dealConfirmationStatus(null, null)).toBe("WAITING_BOTH");
    expect(dealConfirmationStatus("2026-06-15", null)).toBe("WAITING_HOST");
    expect(dealConfirmationStatus(null, "2026-06-15")).toBe("WAITING_RENTER");
    expect(dealConfirmationStatus("2026-06-15", "2026-06-15")).toBe("CONFIRMED");
  });
});
