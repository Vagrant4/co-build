"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { BookingAction, DurationDays, PowerType, SpaceType, Zoning } from "@/src/lib/fabrication";
import {
  advanceAdditionalRequirementStatus,
  advanceBookingStatus,
  buildAdditionalRequirementContract,
  buildRecurringSubscriptionPeriod,
  calculateBookingQuote,
  dealConfirmationStatus,
  formatCurrency,
  inferSpaceTypeFromSize
} from "@/src/lib/fabrication";
import { prisma } from "@/src/lib/db";
import { toListing } from "@/src/lib/repository";
import { saveUpload } from "@/src/lib/uploads";
import { commonSafetyRules } from "@/src/lib/seed-data";

export async function createBookingAction(formData: FormData) {
  const safetyAccepted = formData.get("safetyAccepted") === "on";
  if (!safetyAccepted) {
    throw new Error("Safety rules must be accepted before submitting a booking request.");
  }

  const listingSlug = requireString(formData, "listingSlug");
  const durationDays = parseDuration(requireString(formData, "durationDays"));
  const workType = requireString(formData, "workType");
  const addonSlugs = formData.getAll("addons").map(String);

  const listingRecord = await prisma.listing.findUnique({
    where: { slug: listingSlug },
    include: { equipmentAddons: { include: { equipmentAddon: true } } }
  });
  if (!listingRecord) throw new Error("Listing not found.");

  const addons = await prisma.equipmentAddon.findMany({
    where: { slug: { in: addonSlugs } }
  });
  const quote = calculateBookingQuote({
    listing: toListing(listingRecord),
    durationDays,
    workType,
    addons
  });

  const booking = await prisma.booking.create({
    data: {
      listing: { connect: { slug: listingSlug } },
      user: { connect: { id: "demo-renter" } },
      durationDays,
      workType,
      riskLevel: quote.riskLevel,
      status: "PENDING_HOST",
      rentalTotal: quote.rentalTotal,
      deposit: quote.deposit,
      cleaningFee: quote.cleaningFee,
      addonTotal: quote.addonTotal,
      grandTotal: quote.grandTotal,
      safetyAcceptedAt: new Date(),
      addons: {
        create: addons.map((addon) => ({
          equipmentAddon: { connect: { slug: addon.slug } },
          priceAtBooking: addon.pricePerBooking
        }))
      }
    }
  });

  const verificationUpload = await saveUpload(formData.get("verification") as File | null, "verification");
  if (verificationUpload) {
    await prisma.upload.create({
      data: {
        type: "VERIFICATION",
        originalName: verificationUpload.originalName,
        localPath: verificationUpload.localPath,
        user: { connect: { id: "demo-renter" } },
        booking: { connect: { id: booking.id } }
      }
    });
  }

  revalidatePath("/dashboard/user");
  redirect("/dashboard/user?booking=submitted");
}

export async function updateBookingStatusAction(formData: FormData) {
  const bookingId = requireString(formData, "bookingId");
  const action = requireString(formData, "action") as BookingAction;
  const actorId = formData.get("actorId") ? String(formData.get("actorId")) : "demo-host";

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new Error("Booking not found.");

  const nextStatus = advanceBookingStatus(booking.status, action, booking.riskLevel);
  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: nextStatus }
  });

  if (nextStatus !== booking.status) {
    await prisma.approvalEvent.create({
      data: {
        actor: { connect: { id: actorId } },
        booking: { connect: { id: bookingId } },
        target: "booking",
        decision: nextStatus.includes("REJECTED") ? "REJECTED" : "APPROVED",
        note: `${action.replaceAll("_", " ").toLowerCase()} changed booking to ${nextStatus}.`
      }
    });
  }

  revalidatePath("/dashboard/host");
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/user");
}

export async function confirmPaymentAction(formData: FormData) {
  const bookingId = requireString(formData, "bookingId");
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.status !== "APPROVED_FOR_PAYMENT") {
    throw new Error("Booking must be approved before Stripe checkout.");
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "PAID_CONFIRMED" }
  });

  await prisma.approvalEvent.create({
    data: {
      actor: { connect: { id: "demo-renter" } },
      booking: { connect: { id: bookingId } },
      target: "payment",
      decision: "APPROVED",
      note: "Demo Stripe checkout completed. Rental, deposit, cleaning fee, and add-ons marked paid."
    }
  });

  revalidatePath("/dashboard/user");
  revalidatePath("/dashboard/admin");
}

export async function uploadBookingPhotoAction(formData: FormData) {
  const bookingId = requireString(formData, "bookingId");
  const uploadKind = requireString(formData, "uploadKind") as "CHECK_IN" | "CHECK_OUT";
  const upload = await saveUpload(formData.get("photo") as File | null, uploadKind.toLowerCase());
  if (!upload) throw new Error("Select a photo before uploading.");

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new Error("Booking not found.");

  await prisma.upload.create({
    data: {
      type: uploadKind,
      originalName: upload.originalName,
      localPath: upload.localPath,
      booking: { connect: { id: bookingId } },
      user: { connect: { id: "demo-renter" } }
    }
  });

  const nextStatus =
    uploadKind === "CHECK_IN" && booking.status === "PAID_CONFIRMED"
      ? "CHECKED_IN"
      : uploadKind === "CHECK_OUT" && booking.status === "CHECKED_IN"
        ? "CHECKED_OUT"
        : booking.status;

  if (nextStatus !== booking.status) {
    await prisma.booking.update({ where: { id: bookingId }, data: { status: nextStatus } });
  }

  revalidatePath("/dashboard/user");
  revalidatePath("/dashboard/admin");
}

export async function createAccountAction(formData: FormData) {
  const role = requireString(formData, "role").toUpperCase();
  if (role !== "RENTER" && role !== "HOST") {
    throw new Error("Account type must be renter or host.");
  }

  const email = requireString(formData, "email").toLowerCase();
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role,
      fullName: requireString(formData, "fullName"),
      mobile: requireString(formData, "mobile"),
      companyName: requireString(formData, "companyName"),
      uen: optionalString(formData, "uen") || null,
      workType: requireString(formData, "workType"),
      experienceLevel: null,
      verificationStatus: "PENDING",
      platformSubscriptionStatus: "UNPAID",
      platformSubscriptionReference: null,
      platformSubscriptionPaidAt: null,
      platformSubscriptionPeriodStart: null,
      platformSubscriptionPeriodEnd: null,
      platformSubscriptionNextBilling: null,
      suspended: false
    },
    create: {
      id: buildAccountId(email),
      role,
      fullName: requireString(formData, "fullName"),
      mobile: requireString(formData, "mobile"),
      email,
      companyName: requireString(formData, "companyName"),
      uen: optionalString(formData, "uen") || null,
      workType: requireString(formData, "workType")
    }
  });

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/user");
  revalidatePath("/dashboard/host");
  redirect(user.role === "HOST" ? "/dashboard/host?account=created" : "/dashboard/user?account=created");
}

export async function submitPlatformSubscriptionPaymentAction(formData: FormData) {
  const userId = requireString(formData, "userId");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || (user.role !== "RENTER" && user.role !== "HOST")) {
    throw new Error("Only renter and host accounts can submit platform subscription payments.");
  }
  const stripeSession = await createStripeSubscriptionCheckoutSession({
    id: user.id,
    email: user.email,
    role: user.role
  });
  const checkoutReference =
    optionalString(formData, "stripeCheckoutReference") || stripeSession?.id || buildStripeCheckoutReference(user.email);

  await prisma.user.update({
    where: { id: userId },
    data: {
      platformSubscriptionStatus: "PENDING_ADMIN",
      platformSubscriptionReference: checkoutReference,
      platformSubscriptionPaidAt: null,
      platformSubscriptionPeriodStart: null,
      platformSubscriptionPeriodEnd: null,
      platformSubscriptionNextBilling: null
    }
  });

  revalidatePath("/dashboard/user");
  revalidatePath("/dashboard/host");
  revalidatePath("/dashboard/admin");
  if (stripeSession?.url) {
    redirect(stripeSession.url);
  }
  redirect(user.role === "HOST" ? "/dashboard/host?subscription=submitted" : "/dashboard/user?subscription=submitted");
}

export async function approvePlatformSubscriptionAction(formData: FormData) {
  const userId = requireString(formData, "userId");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || (user.role !== "RENTER" && user.role !== "HOST")) {
    throw new Error("Only renter and host subscriptions can be approved.");
  }

  const period = buildRecurringSubscriptionPeriod(new Date());

  await prisma.user.update({
    where: { id: userId },
    data: {
      platformSubscriptionStatus: "ACTIVE",
      platformSubscriptionPaidAt: period.periodStartAt,
      platformSubscriptionPeriodStart: period.periodStartAt,
      platformSubscriptionPeriodEnd: period.periodEndAt,
      platformSubscriptionNextBilling: period.nextBillingAt
    }
  });

  await prisma.approvalEvent.create({
    data: {
      actor: { connect: { id: "demo-admin" } },
      target: "platform_subscription",
      decision: "APPROVED",
      note: `Admin activated Stripe recurring ${user.role.toLowerCase()} subscription for ${user.email} at ${formatCurrency(period.monthlyAmount)}/month. Next renewal: ${period.nextBillingAt.toISOString().slice(0, 10)}.`
    }
  });

  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/user");
  revalidatePath("/dashboard/host");
}

export async function confirmDealAction(formData: FormData) {
  const bookingId = requireString(formData, "bookingId");
  const role = requireString(formData, "role");
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new Error("Booking not found.");

  const now = new Date();
  const data =
    role === "RENTER"
      ? { renterDealConfirmedAt: booking.renterDealConfirmedAt ?? now }
      : role === "HOST"
        ? { hostDealConfirmedAt: booking.hostDealConfirmedAt ?? now }
        : null;
  if (!data) throw new Error("Deal confirmation role must be renter or host.");

  await prisma.booking.update({
    where: { id: bookingId },
    data
  });

  const status = dealConfirmationStatus(
    role === "RENTER" ? now : booking.renterDealConfirmedAt,
    role === "HOST" ? now : booking.hostDealConfirmedAt
  );

  await prisma.approvalEvent.create({
    data: {
      actor: { connect: { id: role === "HOST" ? "demo-host" : "demo-renter" } },
      booking: { connect: { id: bookingId } },
      target: "deal_confirmation",
      decision: "APPROVED",
      note: `${role.toLowerCase()} confirmed deal on platform. Confirmation status: ${status}. No deal commission charged.`
    }
  });

  revalidatePath("/dashboard/user");
  revalidatePath("/dashboard/host");
  revalidatePath("/dashboard/admin");
}

export async function createAdditionalRequirementAction(formData: FormData) {
  const bookingId = requireString(formData, "bookingId");
  const detail = requireString(formData, "additionalDetail");

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { user: true, listing: true }
  });
  if (!booking || booking.userId !== "demo-renter") {
    throw new Error("Booking not found for this renter.");
  }

  await prisma.additionalRequirement.create({
    data: {
      detail,
      booking: { connect: { id: bookingId } },
      user: { connect: { id: "demo-renter" } }
    }
  });

  revalidatePath("/dashboard/user");
  revalidatePath("/dashboard/host");
  redirect("/dashboard/user?additional=submitted");
}

export async function approveAdditionalRequirementAction(formData: FormData) {
  const requestId = requireString(formData, "requestId");
  const quotedRate = Number(requireString(formData, "quotedRate"));
  if (!Number.isFinite(quotedRate) || quotedRate <= 0) {
    throw new Error("Add-on rate must be greater than zero.");
  }

  const request = await prisma.additionalRequirement.findUnique({
    where: { id: requestId },
    include: {
      user: true,
      booking: {
        include: {
          listing: {
            include: { host: true }
          }
        }
      }
    }
  });
  if (!request) throw new Error("Additional requirement request not found.");

  const nextStatus = advanceAdditionalRequirementStatus(request.status, "HOST_APPROVE");
  if (nextStatus === request.status) {
    throw new Error("Additional requirement is not pending host approval.");
  }

  const contractText = buildAdditionalRequirementContract({
    bookingId: request.booking.id,
    listingTitle: request.booking.listing.title,
    renterName: request.user.fullName,
    renterEmail: request.user.email,
    hostName: request.booking.listing.host?.fullName ?? "Host",
    requirementDetail: request.detail,
    quotedRate
  });

  await prisma.additionalRequirement.update({
    where: { id: requestId },
    data: {
      status: nextStatus,
      quotedRate,
      contractText,
      emailedTo: request.user.email,
      emailedAt: new Date()
    }
  });

  await prisma.approvalEvent.create({
    data: {
      actor: { connect: { id: "demo-host" } },
      booking: { connect: { id: request.bookingId } },
      target: "additional_requirement",
      decision: "APPROVED",
      note: `Host approved additional requirement at ${formatCurrency(quotedRate)}. Contract emailed to ${request.user.email}.`
    }
  });

  revalidatePath("/dashboard/host");
  revalidatePath("/dashboard/user");
  redirect("/dashboard/host?additional=approved");
}

export async function rejectAdditionalRequirementAction(formData: FormData) {
  const requestId = requireString(formData, "requestId");
  const request = await prisma.additionalRequirement.findUnique({ where: { id: requestId } });
  if (!request) throw new Error("Additional requirement request not found.");

  const nextStatus = advanceAdditionalRequirementStatus(request.status, "HOST_REJECT");
  if (nextStatus === request.status) {
    throw new Error("Additional requirement is not pending host approval.");
  }

  await prisma.additionalRequirement.update({
    where: { id: requestId },
    data: { status: nextStatus }
  });

  await prisma.approvalEvent.create({
    data: {
      actor: { connect: { id: "demo-host" } },
      booking: { connect: { id: request.bookingId } },
      target: "additional_requirement",
      decision: "REJECTED",
      note: "Host rejected additional requirement request."
    }
  });

  revalidatePath("/dashboard/host");
  revalidatePath("/dashboard/user");
  redirect("/dashboard/host?additional=rejected");
}

export async function confirmAdditionalRequirementPaymentAction(formData: FormData) {
  const requestId = requireString(formData, "requestId");
  const request = await prisma.additionalRequirement.findUnique({ where: { id: requestId } });
  if (!request || request.userId !== "demo-renter") {
    throw new Error("Additional requirement request not found for this renter.");
  }

  const nextStatus = advanceAdditionalRequirementStatus(request.status, "PAY");
  if (nextStatus === request.status) {
    throw new Error("Additional requirement must be approved before payment.");
  }

  await prisma.additionalRequirement.update({
    where: { id: requestId },
    data: {
      status: nextStatus,
      paidAt: new Date()
    }
  });

  await prisma.approvalEvent.create({
    data: {
      actor: { connect: { id: "demo-renter" } },
      booking: { connect: { id: request.bookingId } },
      target: "additional_requirement_payment",
      decision: "APPROVED",
      note: `Renter completed demo Stripe checkout for approved additional requirement rate of ${formatCurrency(request.quotedRate)}.`
    }
  });

  revalidatePath("/dashboard/user");
  revalidatePath("/dashboard/host");
  redirect("/dashboard/user?additional=paid");
}

export async function createListingAction(formData: FormData) {
  const title = requireString(formData, "title");
  const slug = slugify(`${title}-${Date.now()}`);
  const photoUpload = await saveUpload(formData.get("photo") as File | null, "listing-photo");
  const floorPlanUpload = await saveUpload(formData.get("floorPlan") as File | null, "floor-plan");
  const equipmentSlugs = formData
    .getAll("equipment")
    .map(String)
    .filter((slugValue) => slugValue !== "other");
  const equipmentOther = optionalString(formData, "equipmentOther");
  const factoryTypes = formData
    .getAll("factoryType")
    .map(String)
    .filter((typeValue) => ["OFFICE", "B1", "B2", "OTHER"].includes(typeValue));
  const factoryTypeOther = optionalString(formData, "factoryTypeOther");
  const sizeSqft = Number(requireString(formData, "sizeSqft"));
  const spaceType = inferSpaceTypeFromSize(sizeSqft);
  const amenities = splitList(requireString(formData, "amenities"));
  const declaredType = formatDeclaredType(factoryTypes, factoryTypeOther);
  if (declaredType) {
    amenities.push(declaredType);
  }
  if (equipmentOther) {
    amenities.push(`Other equipment: ${equipmentOther}`);
  }

  const listing = await prisma.listing.create({
    data: {
      slug,
      title,
      address: requireString(formData, "address"),
      location: requireString(formData, "location"),
      sizeSqft,
      spaceType,
      zoning: zoningFromFactoryTypes(factoryTypes),
      status: "PENDING_ADMIN",
      accessHours: requireString(formData, "accessHours"),
      powerType: requireString(formData, "powerType") as PowerType,
      loadingAccessJson: JSON.stringify(splitList(requireString(formData, "loadingAccess"))),
      amenitiesJson: JSON.stringify(amenities),
      permittedWorkJson: JSON.stringify(splitList(requireString(formData, "permittedWork"))),
      prohibitedWorkJson: JSON.stringify(splitList(requireString(formData, "restrictedWork"))),
      safetyRulesJson: JSON.stringify(commonSafetyRules),
      cancellationPolicy: "Host reviews cancellation requests case by case for this pending listing.",
      photoUrlsJson: JSON.stringify([fallbackListingImage(spaceType)]),
      floorPlanUrl: floorPlanUpload?.localPath ?? fallbackFloorPlan(spaceType),
      priceDay: Number(requireString(formData, "priceDay")),
      priceSevenDays: Number(requireString(formData, "priceSevenDays")),
      priceThirtyDays: Number(requireString(formData, "priceThirtyDays")),
      priceSixtyDays: Number(requireString(formData, "priceSixtyDays")),
      depositStandard: Number(requireString(formData, "depositStandard")),
      depositHighRisk: Number(formData.get("depositHighRisk") || 0),
      cleaningFee: Number(requireString(formData, "cleaningFee")),
      landlordApproval: "Not collected in host listing form",
      insuranceStatus: "Not collected in host listing form",
      fireSafety: requireString(formData, "fireSafety"),
      electricalSupply: requireString(formData, "electricalSupply"),
      host: { connect: { id: "demo-host" } },
      equipmentAddons: {
        create: equipmentSlugs.map((slugValue) => ({
          equipmentAddon: { connect: { slug: slugValue } }
        }))
      }
    }
  });

  if (photoUpload) {
    await prisma.upload.create({
      data: {
        type: "LISTING_PHOTO",
        originalName: photoUpload.originalName,
        localPath: photoUpload.localPath,
        listing: { connect: { id: listing.id } }
      }
    });
  }
  if (floorPlanUpload) {
    await prisma.upload.create({
      data: {
        type: "FLOOR_PLAN",
        originalName: floorPlanUpload.originalName,
        localPath: floorPlanUpload.localPath,
        listing: { connect: { id: listing.id } }
      }
    });
  }

  revalidatePath("/dashboard/host");
  revalidatePath("/dashboard/admin");
  redirect("/dashboard/host?listing=submitted");
}

export async function updateListingStatusAction(formData: FormData) {
  const listingId = requireString(formData, "listingId");
  const status = requireString(formData, "status") as "APPROVED" | "REJECTED" | "SUSPENDED";
  await prisma.listing.update({ where: { id: listingId }, data: { status } });
  await prisma.approvalEvent.create({
    data: {
      actor: { connect: { id: "demo-admin" } },
      listing: { connect: { id: listingId } },
      target: "listing",
      decision: status === "APPROVED" ? "APPROVED" : status === "SUSPENDED" ? "SUSPENDED" : "REJECTED",
      note: `Admin changed listing status to ${status}.`
    }
  });
  revalidatePath("/dashboard/admin");
  revalidatePath("/search");
}

export async function updateUserVerificationAction(formData: FormData) {
  const userId = requireString(formData, "userId");
  const verificationStatus = requireString(formData, "verificationStatus") as "APPROVED" | "REJECTED" | "PENDING";
  await prisma.user.update({ where: { id: userId }, data: { verificationStatus } });
  revalidatePath("/dashboard/admin");
}

export async function toggleUserSuspensionAction(formData: FormData) {
  const userId = requireString(formData, "userId");
  const suspended = requireString(formData, "suspended") === "true";
  await prisma.user.update({ where: { id: userId }, data: { suspended } });
  await prisma.approvalEvent.create({
    data: {
      actor: { connect: { id: "demo-admin" } },
      target: "user",
      decision: suspended ? "SUSPENDED" : "APPROVED",
      note: `Admin ${suspended ? "suspended" : "restored"} user ${userId}.`
    }
  });
  revalidatePath("/dashboard/admin");
}

export async function updateEquipmentPriceAction(formData: FormData) {
  const slug = requireString(formData, "slug");
  const pricePerBooking = Number(requireString(formData, "pricePerBooking"));
  await prisma.equipmentAddon.update({ where: { slug }, data: { pricePerBooking } });
  revalidatePath("/dashboard/admin");
  revalidatePath("/checkout");
}

export async function updateListingPricingAction(formData: FormData) {
  const listingId = requireString(formData, "listingId");
  await prisma.listing.update({
    where: { id: listingId },
    data: {
      priceDay: Number(requireString(formData, "priceDay")),
      priceThirtyDays: Number(requireString(formData, "priceThirtyDays")),
      priceSixtyDays: Number(requireString(formData, "priceSixtyDays")),
      depositStandard: Number(requireString(formData, "depositStandard")),
      cleaningFee: Number(requireString(formData, "cleaningFee"))
    }
  });
  revalidatePath("/dashboard/admin");
  revalidatePath("/search");
}

function requireString(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${key} is required.`);
  }
  return value.trim();
}

function optionalString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function parseDuration(value: string): DurationDays {
  const duration = Number(value);
  if (duration === 1 || duration === 7 || duration === 30 || duration === 60) return duration;
  throw new Error("Duration must be 1, 7, 30, or 60 days.");
}

function splitList(value: string): string[] {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function zoningFromFactoryTypes(factoryTypes: string[]): Zoning {
  if (factoryTypes.includes("B2")) return "B2";
  if (factoryTypes.includes("B1")) return "B1";
  return "UNKNOWN";
}

function formatDeclaredType(factoryTypes: string[], otherType: string): string {
  const labels = factoryTypes.map((typeValue) => {
    if (typeValue === "OFFICE") return "Office";
    if (typeValue === "OTHER" && otherType) return `Other: ${otherType}`;
    if (typeValue === "OTHER") return "Other";
    return typeValue;
  });

  if (!labels.length && otherType) {
    labels.push(`Other: ${otherType}`);
  }

  return labels.length ? `Declared type: ${labels.join(", ")}` : "";
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildAccountId(email: string): string {
  return `account-${slugify(email).slice(0, 40)}-${Date.now()}`;
}

function buildStripeCheckoutReference(email: string): string {
  return `stripe_admin_checkout_${slugify(email).slice(0, 30)}_${Date.now()}`;
}

async function createStripeSubscriptionCheckoutSession(user: {
  id: string;
  email: string;
  role: string;
}): Promise<{ id: string; url?: string } | null> {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PLATFORM_SUBSCRIPTION_PRICE_ID;
  if (!secretKey || !priceId) return null;

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
  const dashboardPath = user.role === "HOST" ? "/dashboard/host" : "/dashboard/user";
  const body = new URLSearchParams({
    mode: "subscription",
    success_url: `${appUrl}${dashboardPath}?subscription=stripe-success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}${dashboardPath}?subscription=stripe-cancelled`,
    customer_email: user.email,
    client_reference_id: user.id,
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    "metadata[userId]": user.id,
    "metadata[role]": user.role,
    "metadata[purpose]": "platform_subscription"
  });

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body,
    cache: "no-store"
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Stripe checkout could not be created: ${detail.slice(0, 240)}`);
  }

  return (await response.json()) as { id: string; url?: string };
}

function fallbackListingImage(spaceType: SpaceType): string {
  const assets: Record<SpaceType, string> = {
    MAKER_BENCH: "/assets/maker-bench.png",
    SMALL_BAY: "/assets/small-bay.png",
    MEDIUM_BAY: "/assets/medium-bay.png",
    LARGE_BAY: "/assets/large-bay.png"
  };
  return assets[spaceType];
}

function fallbackFloorPlan(spaceType: SpaceType): string {
  const assets: Record<SpaceType, string> = {
    MAKER_BENCH: "/assets/floor-plan-maker-bench.png",
    SMALL_BAY: "/assets/floor-plan-small-bay.png",
    MEDIUM_BAY: "/assets/floor-plan-medium-bay.png",
    LARGE_BAY: "/assets/floor-plan-large-bay.png"
  };
  return assets[spaceType];
}
