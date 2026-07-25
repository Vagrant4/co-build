"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { forbidden, notFound, redirect, unauthorized } from "next/navigation";
import { revalidatePath } from "next/cache";
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
import { registerAccount, updateOwnProfile } from "@/src/lib/account-service";
import { canManageBookingStatus } from "@/src/lib/authorization-policy";
import {
  DEMO_SESSION_COOKIE,
  requireAdmin,
  requireBookingParticipant,
  requireConversationParticipant,
  requireListingOwner,
  requireRole,
  requireUser
} from "@/src/lib/authorization";
import { getAppMode } from "@/src/lib/app-mode";
import { CONTACT_POLICY_MESSAGE, containsRestrictedContactDetail } from "@/src/lib/contact-policy";
import { prisma } from "@/src/lib/db";
import { toListing } from "@/src/lib/repository";
import { commonSafetyRules } from "@/src/lib/seed-data";
import { saveUpload } from "@/src/lib/uploads";

export async function createBookingAction(formData: FormData) {
  const renter = await requireRole("RENTER");
  if (formData.get("safetyAccepted") !== "on") throw new Error("Safety rules must be accepted before submitting a booking request.");

  const listingSlug = requireString(formData, "listingSlug");
  const durationDays = parseDuration(requireString(formData, "durationDays"));
  const workType = requireString(formData, "workType");
  const addonSlugs = formData.getAll("addons").map(String);
  const listing = await prisma.listing.findFirst({
    where: {
      slug: listingSlug,
      status: "APPROVED",
      host: { is: { role: "HOST", suspended: false, verificationStatus: "APPROVED" } }
    },
    include: { equipmentAddons: { include: { equipmentAddon: true } } }
  });
  if (!listing) notFound();

  const addons = await prisma.equipmentAddon.findMany({ where: { slug: { in: addonSlugs } } });
  const quote = calculateBookingQuote({ listing: toListing(listing), durationDays, workType, addons });
  const verificationUpload = await saveUpload(formData.get("verification") as File | null, "verification");

  await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.create({
      data: {
        listingId: listing.id,
        userId: renter.id,
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
        addons: { create: addons.map((addon) => ({ equipmentAddonId: addon.id, priceAtBooking: addon.pricePerBooking })) }
      }
    });
    if (verificationUpload) {
      await tx.upload.create({ data: { type: "VERIFICATION", ...verificationUpload, userId: renter.id, bookingId: booking.id } });
    }
    await tx.approvalEvent.create({
      data: { actorId: renter.id, bookingId: booking.id, target: "booking_request", decision: "APPROVED", note: "Authenticated renter submitted booking request and accepted safety rules." }
    });
  });

  revalidateDashboards();
  redirect("/dashboard/user?booking=submitted");
}

export async function updateBookingStatusAction(formData: FormData) {
  const actor = await requireUser();
  const bookingId = requireString(formData, "bookingId");
  const action = requireString(formData, "action") as BookingAction;
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { listing: { select: { hostId: true } } } });
  if (!booking) notFound();
  if (!canManageBookingStatus(actor, booking.listing.hostId, action)) forbidden();

  const nextStatus = advanceBookingStatus(booking.status, action, booking.riskLevel);
  if (nextStatus === booking.status) throw new Error("This booking transition is not allowed.");
  await prisma.$transaction([
    prisma.booking.update({ where: { id: bookingId }, data: { status: nextStatus } }),
    prisma.approvalEvent.create({
      data: {
        actorId: actor.id,
        bookingId,
        target: "booking",
        decision: nextStatus.includes("REJECTED") ? "REJECTED" : "APPROVED",
        note: `${action.replaceAll("_", " ").toLowerCase()} changed booking to ${nextStatus}.`
      }
    })
  ]);
  revalidateDashboards();
}

export async function confirmPaymentAction(formData: FormData) {
  const renter = await requireRole("RENTER");
  const bookingId = requireString(formData, "bookingId");
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) notFound();
  if (booking.userId !== renter.id) forbidden();
  if (booking.status !== "APPROVED_FOR_PAYMENT") throw new Error("Booking must be approved before payment proof can be submitted.");

  await prisma.$transaction([
    prisma.booking.update({ where: { id: bookingId }, data: { status: "PAID_CONFIRMED" } }),
    prisma.approvalEvent.create({ data: { actorId: renter.id, bookingId, target: "payment", decision: "APPROVED", note: "Authenticated renter submitted company-account payment proof." } })
  ]);
  revalidateDashboards();
}

export async function uploadBookingPhotoAction(formData: FormData) {
  const renter = await requireRole("RENTER");
  const bookingId = requireString(formData, "bookingId");
  const uploadKind = requireString(formData, "uploadKind") as "CHECK_IN" | "CHECK_OUT";
  if (uploadKind !== "CHECK_IN" && uploadKind !== "CHECK_OUT") throw new Error("Invalid booking photo type.");
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) notFound();
  if (booking.userId !== renter.id) forbidden();
  const upload = await saveUpload(formData.get("photo") as File | null, uploadKind.toLowerCase());
  if (!upload) throw new Error("Select a photo before uploading.");
  const nextStatus = uploadKind === "CHECK_IN" && booking.status === "PAID_CONFIRMED" ? "CHECKED_IN" : uploadKind === "CHECK_OUT" && booking.status === "CHECKED_IN" ? "CHECKED_OUT" : booking.status;

  await prisma.$transaction(async (tx) => {
    await tx.upload.create({ data: { type: uploadKind, ...upload, bookingId, userId: renter.id } });
    if (nextStatus !== booking.status) await tx.booking.update({ where: { id: bookingId }, data: { status: nextStatus } });
    await tx.approvalEvent.create({ data: { actorId: renter.id, bookingId, target: uploadKind.toLowerCase(), decision: "APPROVED", note: `Authenticated renter uploaded ${uploadKind.toLowerCase().replace("_", " ")} evidence.` } });
  });
  revalidateDashboards();
}

export async function createAccountAction(formData: FormData) {
  const roleValue = requireString(formData, "role").toUpperCase();
  if (roleValue !== "RENTER" && roleValue !== "HOST") throw new Error("Account type must be renter or host.");
  const mode = getAppMode();
  const id = crypto.randomUUID();
  let email: string;
  let authProviderId: string;

  if (mode === "demo") {
    email = requireString(formData, "email").toLowerCase();
    authProviderId = `demo:${id}`;
  } else {
    const session = await auth();
    if (!session.userId) unauthorized();
    const clerkUser = await currentUser();
    const primaryEmail = clerkUser?.emailAddresses.find((item) => item.id === clerkUser.primaryEmailAddressId)?.emailAddress;
    if (!primaryEmail) throw new Error("Your managed sign-in account must have a verified primary email address.");
    email = primaryEmail.toLowerCase();
    authProviderId = `clerk:${session.userId}`;
  }

  const user = await prisma.$transaction((tx) => registerAccount(tx.user, {
    id,
    authProviderId,
    email,
    role: roleValue,
    fullName: requireString(formData, "fullName"),
    companyName: requireString(formData, "companyName"),
    uen: optionalString(formData, "uen") || null,
    workType: optionalString(formData, "workType") || null
  }));

  if (mode === "demo") {
    (await cookies()).set(DEMO_SESSION_COOKIE, user.id, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 });
  }
  revalidateDashboards();
  redirect(user.role === "HOST" ? "/dashboard/host?created=1" : "/dashboard/user?created=1");
}

export async function updateOwnProfileAction(formData: FormData) {
  const user = await requireUser();
  await updateOwnProfile(prisma.user, user.id, {
    fullName: requireString(formData, "fullName"),
    companyName: requireString(formData, "companyName"),
    uen: optionalString(formData, "uen") || null,
    workType: optionalString(formData, "workType") || null
  });
  revalidateDashboards();
}

export async function submitPlatformSubscriptionPaymentAction(formData: FormData) {
  const user = await requireUser();
  if (user.role !== "RENTER" && user.role !== "HOST") forbidden();
  const paymentReference = optionalString(formData, "paymentReference") || buildCompanyAccountPaymentReference(user.email);
  await prisma.$transaction([
    prisma.user.update({ where: { id: user.id }, data: { platformSubscriptionStatus: "PENDING_ADMIN", platformSubscriptionReference: paymentReference, platformSubscriptionPaidAt: null, platformSubscriptionPeriodStart: null, platformSubscriptionPeriodEnd: null, platformSubscriptionNextBilling: null } }),
    prisma.approvalEvent.create({ data: { actorId: user.id, target: "platform_subscription_submission", decision: "APPROVED", note: "Authenticated account submitted a recurring subscription payment reference for admin review." } })
  ]);
  revalidateDashboards();
  redirect(user.role === "HOST" ? "/dashboard/host?subscription=submitted" : "/dashboard/user?subscription=submitted");
}

export async function approvePlatformSubscriptionAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = requireString(formData, "userId");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || (user.role !== "RENTER" && user.role !== "HOST")) notFound();
  const period = buildRecurringSubscriptionPeriod(new Date());
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { platformSubscriptionStatus: "ACTIVE", platformSubscriptionPaidAt: period.periodStartAt, platformSubscriptionPeriodStart: period.periodStartAt, platformSubscriptionPeriodEnd: period.periodEndAt, platformSubscriptionNextBilling: period.nextBillingAt } }),
    prisma.approvalEvent.create({ data: { actorId: admin.id, target: "platform_subscription", decision: "APPROVED", note: `Admin activated recurring ${user.role.toLowerCase()} subscription at ${formatCurrency(period.monthlyAmount)}/month. Next renewal: ${period.nextBillingAt.toISOString().slice(0, 10)}.` } })
  ]);
  revalidateDashboards();
}

export async function confirmDealAction(formData: FormData) {
  const actor = await requireBookingParticipant(requireString(formData, "bookingId"));
  const bookingId = requireString(formData, "bookingId");
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { listing: { select: { hostId: true } } } });
  if (!booking) notFound();
  const now = new Date();
  const isRenter = booking.userId === actor.id;
  const isHost = booking.listing.hostId === actor.id;
  if (!isRenter && !isHost) forbidden();
  const data = isRenter ? { renterDealConfirmedAt: booking.renterDealConfirmedAt ?? now } : { hostDealConfirmedAt: booking.hostDealConfirmedAt ?? now };
  const status = dealConfirmationStatus(isRenter ? now : booking.renterDealConfirmedAt, isHost ? now : booking.hostDealConfirmedAt);
  await prisma.$transaction([
    prisma.booking.update({ where: { id: bookingId }, data }),
    prisma.approvalEvent.create({ data: { actorId: actor.id, bookingId, target: "deal_confirmation", decision: "APPROVED", note: `${isRenter ? "Renter" : "Host"} confirmed deal on platform. Confirmation status: ${status}.` } })
  ]);
  revalidateDashboards();
}

export async function sendBookingMessageAction(formData: FormData) {
  const bookingId = requireString(formData, "bookingId");
  const sender = await requireBookingParticipant(bookingId);
  const body = validatedMessage(formData);
  await prisma.bookingMessage.create({ data: { bookingId, senderId: sender.id, body } });
  revalidateDashboards();
}

export async function startListingConversationAction(formData: FormData) {
  const renter = await requireRole("RENTER");
  const listingId = requireString(formData, "listingId");
  const body = validatedMessage(formData);
  const listing = await prisma.listing.findFirst({ where: { id: listingId, status: "APPROVED", host: { is: { role: "HOST", suspended: false, verificationStatus: "APPROVED" } } }, select: { id: true, slug: true, hostId: true } });
  if (!listing?.hostId) notFound();
  await prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.upsert({
      where: { listingId_renterId: { listingId, renterId: renter.id } },
      update: { hostId: listing.hostId! },
      create: { listingId, renterId: renter.id, hostId: listing.hostId! }
    });
    await tx.conversationMessage.create({ data: { conversationId: conversation.id, senderId: renter.id, body } });
  });
  revalidatePath(`/listings/${listing.slug}`);
  revalidatePath("/dashboard/host");
}

export async function sendConversationMessageAction(formData: FormData) {
  const conversationId = requireString(formData, "conversationId");
  const sender = await requireConversationParticipant(conversationId);
  const body = validatedMessage(formData);
  await prisma.conversationMessage.create({ data: { conversationId, senderId: sender.id, body } });
  revalidatePath("/dashboard/host");
  revalidatePath("/dashboard/user");
}

export async function createAdditionalRequirementAction(formData: FormData) {
  const renter = await requireRole("RENTER");
  const bookingId = requireString(formData, "bookingId");
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { userId: true } });
  if (!booking) notFound();
  if (booking.userId !== renter.id) forbidden();
  await prisma.additionalRequirement.create({ data: { bookingId, userId: renter.id, detail: requireString(formData, "additionalDetail") } });
  revalidateDashboards();
  redirect("/dashboard/user?additional=submitted");
}

export async function approveAdditionalRequirementAction(formData: FormData) {
  const requestId = requireString(formData, "requestId");
  const quotedRate = Number(requireString(formData, "quotedRate"));
  if (!Number.isFinite(quotedRate) || quotedRate <= 0) throw new Error("Add-on rate must be greater than zero.");
  const request = await prisma.additionalRequirement.findUnique({ where: { id: requestId }, include: { user: true, booking: { include: { listing: { include: { host: true } } } } } });
  if (!request) notFound();
  const host = await requireListingOwner(request.booking.listingId);
  const nextStatus = advanceAdditionalRequirementStatus(request.status, "HOST_APPROVE");
  if (nextStatus === request.status) throw new Error("Additional requirement is not pending host approval.");
  const contractText = buildAdditionalRequirementContract({ bookingId: request.booking.id, listingTitle: request.booking.listing.title, renterName: request.user.fullName, renterEmail: request.user.email, hostName: request.booking.listing.host?.fullName ?? "Host", requirementDetail: request.detail, quotedRate });
  await prisma.$transaction([
    prisma.additionalRequirement.update({ where: { id: requestId }, data: { status: nextStatus, quotedRate, contractText, emailedTo: request.user.email, emailedAt: new Date() } }),
    prisma.approvalEvent.create({ data: { actorId: host.id, bookingId: request.bookingId, target: "additional_requirement", decision: "APPROVED", note: `Host approved additional requirement at ${formatCurrency(quotedRate)}.` } })
  ]);
  revalidateDashboards();
  redirect("/dashboard/host?additional=approved");
}

export async function rejectAdditionalRequirementAction(formData: FormData) {
  const requestId = requireString(formData, "requestId");
  const request = await prisma.additionalRequirement.findUnique({ where: { id: requestId }, include: { booking: { include: { listing: true } } } });
  if (!request) notFound();
  const host = await requireListingOwner(request.booking.listingId);
  const nextStatus = advanceAdditionalRequirementStatus(request.status, "HOST_REJECT");
  if (nextStatus === request.status) throw new Error("Additional requirement is not pending host approval.");
  await prisma.$transaction([
    prisma.additionalRequirement.update({ where: { id: requestId }, data: { status: nextStatus } }),
    prisma.approvalEvent.create({ data: { actorId: host.id, bookingId: request.bookingId, target: "additional_requirement", decision: "REJECTED", note: "Host rejected additional requirement request." } })
  ]);
  revalidateDashboards();
}

export async function confirmAdditionalRequirementPaymentAction(formData: FormData) {
  const renter = await requireRole("RENTER");
  const requestId = requireString(formData, "requestId");
  const request = await prisma.additionalRequirement.findUnique({ where: { id: requestId } });
  if (!request) notFound();
  if (request.userId !== renter.id) forbidden();
  const nextStatus = advanceAdditionalRequirementStatus(request.status, "PAY");
  if (nextStatus === request.status) throw new Error("Additional requirement must be approved before payment.");
  await prisma.$transaction([
    prisma.additionalRequirement.update({ where: { id: requestId }, data: { status: nextStatus, paidAt: new Date() } }),
    prisma.approvalEvent.create({ data: { actorId: renter.id, bookingId: request.bookingId, target: "additional_requirement_payment", decision: "APPROVED", note: `Renter submitted payment proof for ${formatCurrency(request.quotedRate)}.` } })
  ]);
  revalidateDashboards();
}

export async function createListingAction(formData: FormData) {
  const host = await requireRole("HOST");
  const title = requireString(formData, "title");
  const slug = slugify(`${title}-${Date.now()}`);
  const photoUpload = await saveUpload(formData.get("photo") as File | null, "listing-photo");
  const floorPlanUpload = await saveUpload(formData.get("floorPlan") as File | null, "floor-plan");
  const equipmentSlugs = formData.getAll("equipment").map(String).filter((slugValue) => slugValue !== "other");
  const factoryTypes = formData.getAll("factoryType").map(String).filter((value) => ["OFFICE", "B1", "B2", "OTHER"].includes(value));
  const sizeSqft = Number(requireString(formData, "sizeSqft"));
  const spaceType = inferSpaceTypeFromSize(sizeSqft);
  const amenities = splitList(requireString(formData, "amenities"));
  const declaredType = formatDeclaredType(factoryTypes, optionalString(formData, "factoryTypeOther"));
  if (declaredType) amenities.push(declaredType);
  const equipmentOther = optionalString(formData, "equipmentOther");
  if (equipmentOther) amenities.push(`Other equipment: ${equipmentOther}`);

  await prisma.$transaction(async (tx) => {
    const listing = await tx.listing.create({
      data: {
        slug, title, address: requireString(formData, "address"), location: requireString(formData, "location"), sizeSqft, spaceType,
        zoning: zoningFromFactoryTypes(factoryTypes), status: "PENDING_ADMIN", accessHours: requireString(formData, "accessHours"),
        powerType: requireString(formData, "powerType") as PowerType,
        loadingAccessJson: JSON.stringify(splitList(requireString(formData, "loadingAccess"))), amenitiesJson: JSON.stringify(amenities),
        permittedWorkJson: JSON.stringify(splitList(requireString(formData, "permittedWork"))), prohibitedWorkJson: JSON.stringify(splitList(requireString(formData, "restrictedWork"))),
        safetyRulesJson: JSON.stringify(commonSafetyRules), cancellationPolicy: "Host reviews cancellation requests case by case for this pending listing.",
        photoUrlsJson: JSON.stringify([fallbackListingImage(spaceType)]), floorPlanUrl: floorPlanUpload?.localPath ?? fallbackFloorPlan(spaceType),
        priceDay: numberField(formData, "priceDay"), priceSevenDays: numberField(formData, "priceSevenDays"), priceThirtyDays: numberField(formData, "priceThirtyDays"), priceSixtyDays: numberField(formData, "priceSixtyDays"),
        depositStandard: numberField(formData, "depositStandard"), depositHighRisk: Number(formData.get("depositHighRisk") || 0), cleaningFee: numberField(formData, "cleaningFee"),
        landlordApproval: "Not collected", insuranceStatus: "Not collected", fireSafety: requireString(formData, "fireSafety"), electricalSupply: requireString(formData, "electricalSupply"), hostId: host.id,
        equipmentAddons: { create: equipmentSlugs.map((value) => ({ equipmentAddon: { connect: { slug: value } } })) }
      }
    });
    if (photoUpload) await tx.upload.create({ data: { type: "LISTING_PHOTO", ...photoUpload, listingId: listing.id, userId: host.id } });
    if (floorPlanUpload) await tx.upload.create({ data: { type: "FLOOR_PLAN", ...floorPlanUpload, listingId: listing.id, userId: host.id } });
    await tx.approvalEvent.create({ data: { actorId: host.id, listingId: listing.id, target: "listing_submission", decision: "APPROVED", note: "Authenticated host submitted listing for admin review." } });
  });
  revalidateDashboards();
  redirect("/dashboard/host?listing=submitted");
}

export async function updateListingStatusAction(formData: FormData) {
  const admin = await requireAdmin();
  const listingId = requireString(formData, "listingId");
  const status = requireString(formData, "status") as "APPROVED" | "REJECTED" | "SUSPENDED";
  if (!["APPROVED", "REJECTED", "SUSPENDED"].includes(status)) throw new Error("Invalid listing status.");
  await prisma.$transaction([
    prisma.listing.update({ where: { id: listingId }, data: { status } }),
    prisma.approvalEvent.create({ data: { actorId: admin.id, listingId, target: "listing", decision: status === "APPROVED" ? "APPROVED" : status === "SUSPENDED" ? "SUSPENDED" : "REJECTED", note: `Admin changed listing status to ${status}.` } })
  ]);
  revalidatePath("/search"); revalidatePath("/dashboard/admin");
}

export async function updateUserVerificationAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = requireString(formData, "userId");
  const status = requireString(formData, "verificationStatus") as "APPROVED" | "REJECTED" | "PENDING";
  if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) throw new Error("Invalid verification status.");
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { verificationStatus: status } }),
    prisma.approvalEvent.create({ data: { actorId: admin.id, target: `user_verification:${userId}`, decision: status === "APPROVED" ? "APPROVED" : "REJECTED", note: `Admin changed user verification to ${status}.` } })
  ]);
  revalidatePath("/dashboard/admin");
}

export async function toggleUserSuspensionAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = requireString(formData, "userId");
  if (userId === admin.id) throw new Error("Administrators cannot suspend their own active session.");
  const suspended = requireString(formData, "suspended") === "true";
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { suspended } }),
    prisma.approvalEvent.create({ data: { actorId: admin.id, target: `user:${userId}`, decision: suspended ? "SUSPENDED" : "APPROVED", note: `Admin ${suspended ? "suspended" : "restored"} user.` } })
  ]);
  revalidatePath("/dashboard/admin");
}

export async function updateEquipmentPriceAction(formData: FormData) {
  const admin = await requireAdmin();
  const slug = requireString(formData, "slug");
  const pricePerBooking = numberField(formData, "pricePerBooking");
  await prisma.$transaction([
    prisma.equipmentAddon.update({ where: { slug }, data: { pricePerBooking } }),
    prisma.approvalEvent.create({ data: { actorId: admin.id, target: `equipment_price:${slug}`, decision: "APPROVED", note: `Admin updated equipment price to ${formatCurrency(pricePerBooking)}.` } })
  ]);
  revalidatePath("/dashboard/admin"); revalidatePath("/checkout");
}

export async function updateListingPricingAction(formData: FormData) {
  const admin = await requireAdmin();
  const listingId = requireString(formData, "listingId");
  await prisma.$transaction([
    prisma.listing.update({ where: { id: listingId }, data: { priceDay: numberField(formData, "priceDay"), priceThirtyDays: numberField(formData, "priceThirtyDays"), priceSixtyDays: numberField(formData, "priceSixtyDays"), depositStandard: numberField(formData, "depositStandard"), cleaningFee: numberField(formData, "cleaningFee") } }),
    prisma.approvalEvent.create({ data: { actorId: admin.id, listingId, target: "listing_pricing", decision: "APPROVED", note: "Admin updated listing pricing and deposit controls." } })
  ]);
  revalidatePath("/dashboard/admin"); revalidatePath("/search");
}

function validatedMessage(formData: FormData): string {
  const body = requireString(formData, "message").slice(0, 1000);
  if (containsRestrictedContactDetail(body)) throw new Error(CONTACT_POLICY_MESSAGE);
  return body;
}

function revalidateDashboards() { revalidatePath("/dashboard/user"); revalidatePath("/dashboard/host"); revalidatePath("/dashboard/admin"); }
function requireString(formData: FormData, key: string) { const value = formData.get(key); if (typeof value !== "string" || !value.trim()) throw new Error(`${key} is required.`); return value.trim(); }
function optionalString(formData: FormData, key: string) { const value = formData.get(key); return typeof value === "string" ? value.trim() : ""; }
function numberField(formData: FormData, key: string) { const value = Number(requireString(formData, key)); if (!Number.isFinite(value) || value < 0) throw new Error(`${key} must be a valid non-negative number.`); return value; }
function parseDuration(value: string): DurationDays { const duration = Number(value); if (duration === 1 || duration === 7 || duration === 30 || duration === 60) return duration; throw new Error("Duration must be 1, 7, 30, or 60 days."); }
function splitList(value: string) { return value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean); }
function zoningFromFactoryTypes(types: string[]): Zoning { return types.includes("B2") ? "B2" : types.includes("B1") ? "B1" : "UNKNOWN"; }
function formatDeclaredType(types: string[], other: string) { const labels = types.map((value) => value === "OFFICE" ? "Office" : value === "OTHER" ? `Other${other ? `: ${other}` : ""}` : value); if (!labels.length && other) labels.push(`Other: ${other}`); return labels.length ? `Declared type: ${labels.join(", ")}` : ""; }
function slugify(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }
function buildCompanyAccountPaymentReference(email: string) { return `company_account_payment_${slugify(email).slice(0, 30)}_${Date.now()}`; }
function fallbackListingImage(type: SpaceType) { return ({ MAKER_BENCH: "/assets/sample-workshop-photo-bench.png", SMALL_BAY: "/assets/sample-workshop-photo-small-bay.png", MEDIUM_BAY: "/assets/sample-workshop-photo-medium-bay.png", LARGE_BAY: "/assets/sample-workshop-photo-large-bay.png" } as const)[type]; }
function fallbackFloorPlan(type: SpaceType) { return ({ MAKER_BENCH: "/assets/floor-plan-maker-bench.png", SMALL_BAY: "/assets/floor-plan-small-bay.png", MEDIUM_BAY: "/assets/floor-plan-medium-bay.png", LARGE_BAY: "/assets/floor-plan-large-bay.png" } as const)[type]; }
