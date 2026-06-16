export type DurationDays = 1 | 7 | 30 | 60;
export type SpaceType = "MAKER_BENCH" | "SMALL_BAY" | "MEDIUM_BAY" | "LARGE_BAY";
export type SizeBand = "UNDER_1000" | "UNDER_5000" | "UNDER_10000" | "OVER_10000";
export type Zoning = "B1" | "B2" | "UNKNOWN";
export type FactoryType = "OFFICE" | "B1" | "B2";
export type PowerType = "SINGLE_PHASE" | "THREE_PHASE";
export type ListingStatus = "DRAFT" | "PENDING_ADMIN" | "APPROVED" | "REJECTED" | "SUSPENDED";
export type RiskLevel = "STANDARD" | "ADMIN_APPROVAL";
export type AdditionalRequirementStatus = "PENDING_HOST" | "APPROVED_FOR_PAYMENT" | "PAID_CONFIRMED" | "HOST_REJECTED" | "CANCELLED";
export type AdditionalRequirementAction = "HOST_APPROVE" | "HOST_REJECT" | "PAY" | "CANCEL";
export type DealConfirmationStatus = "WAITING_BOTH" | "WAITING_RENTER" | "WAITING_HOST" | "CONFIRMED";
export const PLATFORM_SUBSCRIPTION_MONTHLY = 5;

export type ConvenientPaymentMethod = {
  name: string;
  bestFor: string;
  instructions: string;
  adminCollectedThroughStripe: boolean;
};

export const convenientPaymentMethods: ConvenientPaymentMethod[] = [
  {
    name: "Stripe Checkout",
    bestFor: "Fastest card payment",
    instructions: "Open the Stripe-hosted checkout from your dashboard. Admin receives the subscription payment in Stripe.",
    adminCollectedThroughStripe: true
  },
  {
    name: "Stripe recurring subscription",
    bestFor: "Automatic S$5/month renewal",
    instructions: "Stripe stores the recurring subscription for admin so monthly renewal can run without manual references.",
    adminCollectedThroughStripe: true
  },
  {
    name: "Stripe invoice link",
    bestFor: "Company finance teams",
    instructions: "Admin can send a Stripe invoice/payment link when a company needs a finance-approved payment trail.",
    adminCollectedThroughStripe: true
  }
];

export type RecurringSubscriptionPeriod = {
  monthlyAmount: number;
  periodStartAt: Date;
  periodEndAt: Date;
  nextBillingAt: Date;
};

export type BookingStatus =
  | "DRAFT"
  | "PENDING_HOST"
  | "PENDING_ADMIN_HIGH_RISK"
  | "APPROVED_FOR_PAYMENT"
  | "PAID_CONFIRMED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "HOST_REJECTED"
  | "ADMIN_REJECTED"
  | "CANCELLED";

export type BookingAction = "HOST_APPROVE" | "HOST_REJECT" | "ADMIN_APPROVE" | "ADMIN_REJECT" | "PAY" | "CHECK_IN" | "CHECK_OUT" | "CANCEL";

export type EquipmentAddon = {
  slug: string;
  name: string;
  pricePerBooking: number;
  category: string;
};

export type Listing = {
  slug: string;
  title: string;
  address: string;
  location: string;
  sizeSqft: number;
  spaceType: SpaceType;
  zoning: Zoning;
  status: ListingStatus;
  accessHours: string;
  powerType: PowerType;
  loadingAccess: string[];
  equipmentSlugs: string[];
  includedAmenities: string[];
  permittedWork: string[];
  prohibitedWork: string[];
  safetyRules: string[];
  cancellationPolicy: string;
  photoUrls: string[];
  floorPlanUrl: string;
  prices: Record<"day" | "sevenDays" | "thirtyDays" | "sixtyDays", number>;
  deposit: {
    standard: number;
    highRiskExtra: number;
  };
  cleaningFee: number;
};

export type BookingQuoteInput = {
  listing: Listing;
  durationDays: DurationDays;
  addons: EquipmentAddon[];
  workType: string;
};

export type BookingQuote = {
  durationDays: DurationDays;
  rentalTotal: number;
  deposit: number;
  cleaningFee: number;
  addonTotal: number;
  grandTotal: number;
  riskLevel: RiskLevel;
};

export type AdditionalRequirementContractInput = {
  bookingId: string;
  listingTitle: string;
  renterName: string;
  renterEmail: string;
  hostName: string;
  requirementDetail: string;
  quotedRate: number;
  issuedAt?: string;
};

export type ListingFilters = {
  location?: string;
  minSqft?: number;
  maxSqft?: number;
  sizeBand?: SizeBand;
  durationDays?: DurationDays;
  workType?: string;
  powerType?: PowerType;
  equipment?: string[];
  loadingAccess?: string;
  factoryType?: FactoryType;
};

const B1_WORK = new Set([
  "Assembly",
  "Packing",
  "Repair",
  "Light fabrication",
  "Electronics",
  "3D printing",
  "Storage + work area"
]);

const B2_WORK = new Set([
  "Metal fabrication",
  "Welding",
  "Grinding",
  "Woodworking",
  "Furniture work",
  "Signage work",
  "Laser cutting",
  "CNC work"
]);

const APPROVAL_ONLY_WORK = new Set(["Welding", "Spray painting, approval-only", "Chemical work, approval-only"]);

export function calculateBookingQuote(input: BookingQuoteInput): BookingQuote {
  const rentalTotal = getDurationPrice(input.listing, input.durationDays);
  const risk = classifyWorkRisk(input.workType, input.listing.zoning);
  const addonTotal = input.addons.reduce((sum, addon) => sum + addon.pricePerBooking, 0);
  const deposit =
    risk.riskLevel === "ADMIN_APPROVAL"
      ? input.listing.deposit.standard + input.listing.deposit.highRiskExtra
      : input.listing.deposit.standard;
  const cleaningFee = input.listing.cleaningFee;

  return {
    durationDays: input.durationDays,
    rentalTotal,
    deposit,
    cleaningFee,
    addonTotal,
    grandTotal: rentalTotal + deposit + cleaningFee + addonTotal,
    riskLevel: risk.riskLevel
  };
}

export function getDurationPrice(listing: Listing, durationDays: DurationDays): number {
  if (durationDays === 1) return listing.prices.day;
  if (durationDays === 7) return listing.prices.sevenDays;
  if (durationDays === 30) return listing.prices.thirtyDays;
  return listing.prices.sixtyDays;
}

export function classifyWorkRisk(
  workType: string,
  zoning: Zoning
): { riskLevel: RiskLevel; requiresAdminApproval: boolean; reason: string } {
  if (APPROVAL_ONLY_WORK.has(workType)) {
    return {
      riskLevel: "ADMIN_APPROVAL",
      requiresAdminApproval: true,
      reason: `${workType} requires admin approval before payment.`
    };
  }

  if (zoning === "B1" && B2_WORK.has(workType)) {
    return {
      riskLevel: "ADMIN_APPROVAL",
      requiresAdminApproval: true,
      reason: `${workType} is heavier/noisy work and needs a B2 space.`
    };
  }

  if (zoning === "UNKNOWN") {
    return {
      riskLevel: "ADMIN_APPROVAL",
      requiresAdminApproval: true,
      reason: `${workType} needs admin review because zoning is unknown.`
    };
  }

  return {
    riskLevel: "STANDARD",
    requiresAdminApproval: false,
    reason: `${workType} is suitable for ${zoning} ${zoning === "B1" ? "light industrial" : "industrial"} use.`
  };
}

export function filterListings(listings: Listing[], filters: ListingFilters): Listing[] {
  return listings.filter((listing) => {
    if (listing.status !== "APPROVED") return false;
    if (filters.location && !includesText(listing.location, filters.location) && !includesText(listing.address, filters.location)) return false;
    if (filters.sizeBand === "UNDER_1000" && listing.sizeSqft >= 1000) return false;
    if (filters.sizeBand === "UNDER_5000" && listing.sizeSqft >= 5000) return false;
    if (filters.sizeBand === "UNDER_10000" && listing.sizeSqft >= 10000) return false;
    if (filters.sizeBand === "OVER_10000" && listing.sizeSqft <= 10000) return false;
    if (filters.minSqft && listing.sizeSqft < filters.minSqft) return false;
    if (filters.maxSqft && listing.sizeSqft > filters.maxSqft) return false;
    if (filters.powerType && listing.powerType !== filters.powerType) return false;
    if (filters.factoryType === "OFFICE") return false;
    if ((filters.factoryType === "B1" || filters.factoryType === "B2") && listing.zoning !== filters.factoryType) return false;
    if (filters.workType && !listing.permittedWork.includes(filters.workType)) return false;
    if (filters.loadingAccess && !listing.loadingAccess.some((item) => includesText(item, filters.loadingAccess!))) return false;
    if (filters.equipment?.length && !filters.equipment.every((slug) => listing.equipmentSlugs.includes(slug))) return false;
    if (filters.durationDays && getDurationPrice(listing, filters.durationDays) <= 0) return false;
    return true;
  });
}

export function advanceBookingStatus(status: BookingStatus, action: BookingAction, riskLevel: RiskLevel): BookingStatus {
  if (action === "CANCEL") return "CANCELLED";
  if (status === "PENDING_HOST" && action === "HOST_REJECT") return "HOST_REJECTED";
  if (status === "PENDING_ADMIN_HIGH_RISK" && action === "ADMIN_REJECT") return "ADMIN_REJECTED";
  if (status === "PENDING_HOST" && action === "HOST_APPROVE") {
    return riskLevel === "ADMIN_APPROVAL" ? "PENDING_ADMIN_HIGH_RISK" : "APPROVED_FOR_PAYMENT";
  }
  if (status === "PENDING_ADMIN_HIGH_RISK" && action === "ADMIN_APPROVE") return "APPROVED_FOR_PAYMENT";
  if (status === "APPROVED_FOR_PAYMENT" && action === "PAY") return "PAID_CONFIRMED";
  if (status === "PAID_CONFIRMED" && action === "CHECK_IN") return "CHECKED_IN";
  if (status === "CHECKED_IN" && action === "CHECK_OUT") return "CHECKED_OUT";
  return status;
}

export function advanceAdditionalRequirementStatus(
  status: AdditionalRequirementStatus,
  action: AdditionalRequirementAction
): AdditionalRequirementStatus {
  if (action === "CANCEL") return "CANCELLED";
  if (status === "PENDING_HOST" && action === "HOST_REJECT") return "HOST_REJECTED";
  if (status === "PENDING_HOST" && action === "HOST_APPROVE") return "APPROVED_FOR_PAYMENT";
  if (status === "APPROVED_FOR_PAYMENT" && action === "PAY") return "PAID_CONFIRMED";
  return status;
}

export function buildAdditionalRequirementContract(input: AdditionalRequirementContractInput): string {
  const issuedAt = input.issuedAt ?? new Date().toISOString().slice(0, 10);

  return [
    "Additional Requirement Contract",
    `Issued: ${issuedAt}`,
    `Booking: ${input.bookingId}`,
    `Listing: ${input.listingTitle}`,
    `Renter: ${input.renterName}`,
    `Host: ${input.hostName}`,
    `Requirement: ${input.requirementDetail}`,
    `Approved add-on rate: ${formatCurrency(input.quotedRate)}`,
    "Payment status: Approved for Stripe payment",
    `Contract emailed to: ${input.renterEmail}`
  ].join("\n");
}

export function calculatePlatformSubscriptionRevenue(activeSubscriberCount: number): number {
  return activeSubscriberCount * PLATFORM_SUBSCRIPTION_MONTHLY;
}

export function buildRecurringSubscriptionPeriod(startAt: Date): RecurringSubscriptionPeriod {
  const periodStartAt = new Date(startAt);
  const periodEndAt = addMonthsClamped(periodStartAt, 1);

  return {
    monthlyAmount: PLATFORM_SUBSCRIPTION_MONTHLY,
    periodStartAt,
    periodEndAt,
    nextBillingAt: new Date(periodEndAt)
  };
}

export function dealConfirmationStatus(renterConfirmedAt: string | Date | null, hostConfirmedAt: string | Date | null): DealConfirmationStatus {
  if (renterConfirmedAt && hostConfirmedAt) return "CONFIRMED";
  if (renterConfirmedAt) return "WAITING_HOST";
  if (hostConfirmedAt) return "WAITING_RENTER";
  return "WAITING_BOTH";
}

export function formatCurrency(amount: number): string {
  return `S$${new Intl.NumberFormat("en-SG", {
    maximumFractionDigits: 0
  }).format(amount)}`;
}

export function sizeBandLabel(sizeBand: SizeBand): string {
  const labels: Record<SizeBand, string> = {
    UNDER_1000: "Smaller than 1,000 sqft",
    UNDER_5000: "Smaller than 5,000 sqft",
    UNDER_10000: "Smaller than 10,000 sqft",
    OVER_10000: "Bigger than 10,000 sqft"
  };
  return labels[sizeBand];
}

export function sizeRequirementLabel(sizeSqft: number): string {
  return sizeSqft <= 1000 ? "Smaller than 1,000 sqft" : "Bigger than 1,000 sqft";
}

export function inferSpaceTypeFromSize(sizeSqft: number): SpaceType {
  if (sizeSqft <= 50) return "MAKER_BENCH";
  if (sizeSqft <= 150) return "SMALL_BAY";
  if (sizeSqft <= 400) return "MEDIUM_BAY";
  return "LARGE_BAY";
}

function addMonthsClamped(date: Date, months: number): Date {
  const next = new Date(date);
  const originalDay = next.getUTCDate();
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + months);
  const lastDayOfTargetMonth = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(originalDay, lastDayOfTargetMonth));
  return next;
}

function includesText(value: string, search: string): boolean {
  return value.toLowerCase().includes(search.toLowerCase());
}
