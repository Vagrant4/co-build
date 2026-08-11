"use server";

import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
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
  inferSpaceTypeFromSize,
  PLATFORM_SUBSCRIPTION_MONTHLY
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
import { bookingDocumentDigest, hasCurrentAgreementAcceptance } from "@/src/lib/agreement-acceptance";
import { canCreateBooking, canHostOperate } from "@/src/lib/booking-eligibility";
import { ACTIVE_BOOKING_STATUSES, parseSingaporeBookingWindow } from "@/src/lib/booking-window";
import { loadBookingDocument } from "@/src/lib/booking-document";
import { CONTACT_POLICY_MESSAGE, containsRestrictedContactDetail } from "@/src/lib/contact-policy";
import { prisma } from "@/src/lib/db";
import { LEGAL_DOCUMENT_VERSION } from "@/src/lib/legal-documents";
import { nextPaymentState } from "@/src/lib/payment-workflow";
import { queueAdminNotifications, queueUserNotification } from "@/src/lib/notifications";
import { enforceRateLimit } from "@/src/lib/rate-limit";
import { toListing } from "@/src/lib/repository";
import { commonSafetyRules } from "@/src/lib/seed-data";

export async function createBookingAction(formData: FormData) {
  const renter = await requireRole("RENTER");
  await enforceRateLimit({ action: "booking:create", identity: renter.id, limit: 5, windowSeconds: 60 * 60 });
  if (!canCreateBooking(renter)) throw new Error("An approved, active renter subscription is required before requesting a booking.");
  if (formData.get("safetyAccepted") !== "on") throw new Error("Safety rules must be accepted before submitting a booking request.");

  const listingSlug = requireString(formData, "listingSlug");
  const durationDays = parseDuration(requireString(formData, "durationDays"));
  const bookingWindow = parseSingaporeBookingWindow(requireString(formData, "startDate"), durationDays);
  const workType = requireString(formData, "workType");
  const addonSlugs = formData.getAll("addons").map(String);
  const listing = await prisma.listing.findFirst({
    where: {
      slug: listingSlug,
      status: "APPROVED",
      host: { is: { role: "HOST", suspended: false, verificationStatus: "APPROVED", platformSubscriptionStatus: "ACTIVE" } }
    },
    include: { equipmentAddons: { include: { equipmentAddon: true } } }
  });
  if (!listing) notFound();

  const addons = await prisma.equipmentAddon.findMany({ where: { slug: { in: addonSlugs } } });
  const quote = calculateBookingQuote({ listing: toListing(listing), durationDays, workType, addons });
  const verificationUploadId = optionalString(formData, "verificationUploadId");

  await prisma.$transaction(async (tx) => {
    const conflictingBooking = await tx.booking.findFirst({
      where: {
        listingId: listing.id,
        status: { in: ACTIVE_BOOKING_STATUSES },
        startAt: { lt: bookingWindow.endAt },
        endAt: { gt: bookingWindow.startAt }
      },
      select: { id: true }
    });
    if (conflictingBooking) throw new Error("This space is no longer available for the selected dates. Choose another start date.");
    const booking = await tx.booking.create({
      data: {
        listingId: listing.id,
        userId: renter.id,
        durationDays,
        startAt: bookingWindow.startAt,
        endAt: bookingWindow.endAt,
        bookingTimeZone: bookingWindow.timeZone,
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
    if (verificationUploadId) {
      const result = await tx.upload.updateMany({
        where: { id: verificationUploadId, type: "VERIFICATION", ownerUserId: renter.id, uploadedByUserId: renter.id, bookingId: null, uploadStatus: "AVAILABLE" },
        data: { bookingId: booking.id }
      });
      if (result.count !== 1) throw new Error("Verification upload is unavailable or does not belong to this account.");
    }
    await tx.approvalEvent.create({
      data: { actorId: renter.id, bookingId: booking.id, target: "booking_request", decision: "APPROVED", note: "Authenticated renter submitted booking request and accepted safety rules." }
    });
    if (listing.hostId) await queueUserNotification(tx, { userId: listing.hostId, type: "BOOKING_REQUEST", title: "New booking request", body: `${listing.title} has a new booking request awaiting your review.`, dedupeKey: `booking:${booking.id}:host-request`, email: true });
  }, { isolationLevel: "Serializable" });

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
  if (actor.role === "HOST" && !canHostOperate(actor)) throw new Error("An approved, active host subscription is required to manage bookings.");

  const nextStatus = advanceBookingStatus(booking.status, action, booking.riskLevel);
  if (nextStatus === booking.status) throw new Error("This booking transition is not allowed.");
  await prisma.$transaction(async (tx) => {
    await tx.booking.update({ where: { id: bookingId }, data: { status: nextStatus } });
    await tx.approvalEvent.create({
      data: {
        actorId: actor.id,
        bookingId,
        target: "booking",
        decision: nextStatus.includes("REJECTED") ? "REJECTED" : "APPROVED",
        note: `${action.replaceAll("_", " ").toLowerCase()} changed booking to ${nextStatus}.`
      }
    });
    await queueUserNotification(tx, { userId: booking.userId, type: "BOOKING_STATUS", title: "Booking status updated", body: `Your booking is now ${nextStatus.replaceAll("_", " ").toLowerCase()}.`, dedupeKey: `booking:${bookingId}:status:${nextStatus}`, email: true });
  });
  revalidateDashboards();
}

export async function confirmPaymentAction(formData: FormData) {
  const renter = await requireRole("RENTER");
  await enforceRateLimit({ action: "payment:booking-submit", identity: renter.id, limit: 6, windowSeconds: 60 * 60 });
  const bookingId = requireString(formData, "bookingId");
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, include: { listing: { select: { hostId: true } }, agreementAcceptances: true } });
  if (!booking) notFound();
  if (booking.userId !== renter.id) forbidden();
  if (booking.status !== "APPROVED_FOR_PAYMENT") throw new Error("Booking must be approved before payment proof can be submitted.");
  if (!booking.renterDealConfirmedAt || !booking.hostDealConfirmedAt) throw new Error("Renter and host must both confirm the deal before payment proof is submitted.");
  if (!booking.listing.hostId) throw new Error("Booking host is unavailable.");
  const document = await loadBookingDocument(bookingId);
  if (!document) notFound();
  const documentHash = bookingDocumentDigest(document.body);
  if (!hasCurrentAgreementAcceptance(booking.agreementAcceptances, [booking.userId, booking.listing.hostId], documentHash)) {
    throw new Error("Both renter and host must accept the current booking agreement before payment proof is submitted.");
  }
  const paymentReference = requireString(formData, "paymentReference").slice(0, 120);
  const proofUploadId = optionalString(formData, "paymentProofUploadId");
  if (getAppMode() !== "demo" && !proofUploadId) throw new Error("Payment proof is required for pilot and production bookings.");
  const nextStatus = nextPaymentState(booking.status, "SUBMIT_PROOF");

  await prisma.$transaction(async (tx) => {
    if (proofUploadId) {
      const proof = await tx.upload.findFirst({
        where: { id: proofUploadId, type: "PAYMENT_EVIDENCE", ownerUserId: renter.id, uploadedByUserId: renter.id, bookingId, uploadStatus: "AVAILABLE" },
        select: { id: true }
      });
      if (!proof) throw new Error("Payment proof is unavailable or does not belong to this booking.");
    }
    await tx.paymentRecord.create({
      data: {
        payerId: renter.id,
        bookingId,
        proofUploadId: proofUploadId || null,
        kind: "BOOKING_TOTAL",
        amount: booking.grandTotal,
        reference: paymentReference,
        idempotencyKey: `booking:${bookingId}:${paymentReference.toLowerCase()}`
      }
    });
    await tx.booking.update({ where: { id: bookingId }, data: { status: nextStatus } });
    await tx.approvalEvent.create({ data: { actorId: renter.id, bookingId, target: "payment_submission", decision: "APPROVED", note: "Authenticated renter submitted company-account payment proof for admin reconciliation." } });
    await queueAdminNotifications(tx, { type: "PAYMENT_REVIEW", title: "Payment proof needs review", body: `Booking ${bookingId} has a submitted company-account payment reference.`, dedupeKey: `booking:${bookingId}:payment-review`, email: true });
  });
  revalidateDashboards();
}

export async function reviewBookingPaymentAction(formData: FormData) {
  const admin = await requireAdmin();
  const paymentId = requireString(formData, "paymentId");
  const decision = requireString(formData, "decision") as "verify" | "reject";
  if (decision !== "verify" && decision !== "reject") throw new Error("Invalid payment decision.");
  const payment = await prisma.paymentRecord.findUnique({ where: { id: paymentId }, include: { booking: true } });
  if (!payment?.booking || payment.kind !== "BOOKING_TOTAL" || payment.status !== "SUBMITTED") notFound();
  const paidBooking = payment.booking;
  const bookingStatus = nextPaymentState(paidBooking.status as "PAYMENT_SUBMITTED", decision === "verify" ? "ADMIN_VERIFY" : "ADMIN_REJECT");
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.paymentRecord.update({ where: { id: payment.id }, data: { status: decision === "verify" ? "VERIFIED" : "REJECTED", reviewerId: admin.id, reviewedAt: now, reviewNote: optionalString(formData, "reviewNote") || null } });
    await tx.booking.update({ where: { id: paidBooking.id }, data: { status: bookingStatus } });
    await tx.approvalEvent.create({ data: { actorId: admin.id, bookingId: paidBooking.id, target: "payment_reconciliation", decision: decision === "verify" ? "APPROVED" : "REJECTED", note: `Admin ${decision === "verify" ? "verified" : "rejected"} company-account payment reference.` } });
    await queueUserNotification(tx, { userId: payment.payerId, type: "PAYMENT_RESULT", title: decision === "verify" ? "Payment verified" : "Payment proof rejected", body: decision === "verify" ? "Your booking payment was verified." : "Your payment proof was rejected. Review the admin note and submit a valid reference.", dedupeKey: `payment:${payment.id}:result`, email: true });
  });
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
  const uploadId = requireString(formData, "photoUploadId");
  const nextStatus = uploadKind === "CHECK_IN" && booking.status === "PAID_CONFIRMED" ? "CHECKED_IN" : uploadKind === "CHECK_OUT" && booking.status === "CHECKED_IN" ? "CHECKED_OUT" : booking.status;

  await prisma.$transaction(async (tx) => {
    const result = await tx.upload.updateMany({
      where: { id: uploadId, type: uploadKind, bookingId, ownerUserId: renter.id, uploadedByUserId: renter.id, uploadStatus: "AVAILABLE" },
      data: { verifiedAt: new Date() }
    });
    if (result.count !== 1) throw new Error("Booking photo is unavailable or does not belong to this booking.");
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
  await enforceRateLimit({ action: "account:register", identity: authProviderId, limit: 3, windowSeconds: 24 * 60 * 60 });

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
  if (user.platformSubscriptionProvider === "STRIPE" && user.stripeSubscriptionId && user.platformSubscriptionStatus === "ACTIVE") {
    throw new Error("Manage your active recurring subscription through Stripe Billing.");
  }
  await enforceRateLimit({ action: "payment:subscription-submit", identity: user.id, limit: 4, windowSeconds: 60 * 60 });
  const paymentReference = optionalString(formData, "paymentReference") || buildCompanyAccountPaymentReference(user.email);
  await prisma.$transaction(async (tx) => {
    await tx.paymentRecord.create({ data: { payerId: user.id, kind: "SUBSCRIPTION", amount: PLATFORM_SUBSCRIPTION_MONTHLY, reference: paymentReference, idempotencyKey: `subscription:${user.id}:${paymentReference.toLowerCase()}` } });
    await tx.user.update({ where: { id: user.id }, data: { platformSubscriptionProvider: "BANK_TRANSFER", platformSubscriptionStatus: "PENDING_ADMIN", platformSubscriptionReference: paymentReference, platformSubscriptionPaidAt: null, platformSubscriptionPeriodStart: null, platformSubscriptionPeriodEnd: null, platformSubscriptionNextBilling: null } });
    await tx.approvalEvent.create({ data: { actorId: user.id, target: "platform_subscription_submission", decision: "APPROVED", note: "Authenticated account submitted a recurring subscription payment reference for admin review." } });
    await queueAdminNotifications(tx, { type: "SUBSCRIPTION_REVIEW", title: "Subscription payment needs review", body: `${user.role.toLowerCase()} subscription payment reference is awaiting reconciliation.`, dedupeKey: `subscription:${user.id}:${paymentReference.toLowerCase()}:review`, email: true });
  });
  revalidateDashboards();
  redirect(user.role === "HOST" ? "/dashboard/host?subscription=submitted" : "/dashboard/user?subscription=submitted");
}

export async function approvePlatformSubscriptionAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = requireString(formData, "userId");
  const decision = optionalString(formData, "decision") || "verify";
  if (decision !== "verify" && decision !== "reject") throw new Error("Invalid subscription payment decision.");
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || (user.role !== "RENTER" && user.role !== "HOST")) notFound();
  if (user.platformSubscriptionProvider === "STRIPE") throw new Error("Stripe subscription status can be changed only by a verified Stripe webhook.");
  const payment = await prisma.paymentRecord.findFirst({ where: { payerId: userId, kind: "SUBSCRIPTION", status: "SUBMITTED" }, orderBy: { submittedAt: "desc" } });
  if (!payment) throw new Error("No submitted subscription payment is available to verify.");
  const period = buildRecurringSubscriptionPeriod(new Date());
  await prisma.$transaction(async (tx) => {
    await tx.paymentRecord.update({ where: { id: payment.id }, data: { status: decision === "verify" ? "VERIFIED" : "REJECTED", reviewerId: admin.id, reviewedAt: new Date() } });
    await tx.user.update({ where: { id: userId }, data: decision === "verify"
      ? { platformSubscriptionProvider: "BANK_TRANSFER" as const, platformSubscriptionStatus: "ACTIVE" as const, platformSubscriptionPaidAt: period.periodStartAt, platformSubscriptionPeriodStart: period.periodStartAt, platformSubscriptionPeriodEnd: period.periodEndAt, platformSubscriptionNextBilling: period.nextBillingAt }
      : { platformSubscriptionProvider: "BANK_TRANSFER" as const, platformSubscriptionStatus: "UNPAID" as const, platformSubscriptionPaidAt: null, platformSubscriptionPeriodStart: null, platformSubscriptionPeriodEnd: null, platformSubscriptionNextBilling: null }
    });
    await tx.approvalEvent.create({ data: { actorId: admin.id, target: "platform_subscription", decision: decision === "verify" ? "APPROVED" : "REJECTED", note: decision === "verify" ? `Admin activated recurring ${user.role.toLowerCase()} subscription at ${formatCurrency(period.monthlyAmount)}/month. Next renewal: ${period.nextBillingAt.toISOString().slice(0, 10)}.` : "Admin rejected the submitted subscription payment reference." } });
    await queueUserNotification(tx, { userId, type: "SUBSCRIPTION_RESULT", title: decision === "verify" ? "Subscription activated" : "Subscription proof rejected", body: decision === "verify" ? `Your subscription is active until ${period.periodEndAt.toISOString().slice(0, 10)}.` : "Your subscription payment proof was rejected.", dedupeKey: `subscription:${payment.id}:result`, email: true });
  });
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

export async function acceptBookingAgreementAction(formData: FormData) {
  const bookingId = requireString(formData, "bookingId");
  const actor = await requireBookingParticipant(bookingId);
  if (actor.role !== "RENTER" && actor.role !== "HOST") forbidden();
  await enforceRateLimit({ action: `agreement:accept:${bookingId}`, identity: actor.id, limit: 3, windowSeconds: 60 * 60 });
  const document = await loadBookingDocument(bookingId);
  if (!document) notFound();
  const isRenter = document.booking.userId === actor.id;
  const isHost = document.booking.listing.hostId === actor.id;
  if (!isRenter && !isHost) forbidden();
  const documentHash = bookingDocumentDigest(document.body);
  await prisma.$transaction(async (tx) => {
    await tx.agreementAcceptance.upsert({
      where: { bookingId_userId_documentVersion_documentHash: { bookingId, userId: actor.id, documentVersion: LEGAL_DOCUMENT_VERSION, documentHash } },
      update: {},
      create: { bookingId, userId: actor.id, role: actor.role, documentVersion: LEGAL_DOCUMENT_VERSION, documentHash }
    });
    await tx.approvalEvent.create({ data: { actorId: actor.id, bookingId, target: `agreement_acceptance:${LEGAL_DOCUMENT_VERSION}:${documentHash.slice(0, 12)}`, decision: "APPROVED", note: `${actor.role === "RENTER" ? "Renter" : "Host"} accepted the current booking agreement record.` } });
  });
  revalidateDashboards();
  revalidatePath(`/dashboard/bookings/${bookingId}/agreement`);
  redirect(`/dashboard/bookings/${bookingId}/agreement`);
}

export async function submitPrivacyRequestAction(formData: FormData) {
  const user = await requireUser();
  await enforceRateLimit({ action: "privacy:request", identity: user.id, limit: 3, windowSeconds: 24 * 60 * 60 });
  const type = requireString(formData, "privacyRequestType") as "ACCESS" | "CORRECTION" | "DELETION";
  if (!(["ACCESS", "CORRECTION", "DELETION"] as const).includes(type)) throw new Error("Invalid privacy request type.");
  const detail = requireString(formData, "privacyRequestDetail").slice(0, 2000);
  await prisma.$transaction(async (tx) => {
    const request = await tx.privacyRequest.create({ data: { userId: user.id, type, detail } });
    await tx.approvalEvent.create({ data: { actorId: user.id, target: `privacy_request:${request.id}`, decision: "APPROVED", note: `Authenticated user submitted a ${type.toLowerCase()} privacy request.` } });
    await queueAdminNotifications(tx, { type: "PRIVACY_REQUEST", title: "Privacy request submitted", body: `A ${type.toLowerCase()} request requires administrator review.`, dedupeKey: `privacy:${request.id}:review`, email: true });
  });
  revalidateDashboards();
}

export async function resolvePrivacyRequestAction(formData: FormData) {
  const admin = await requireAdmin();
  const requestId = requireString(formData, "requestId");
  const status = requireString(formData, "status") as "COMPLETED" | "REJECTED";
  if (status !== "COMPLETED" && status !== "REJECTED") throw new Error("Invalid privacy request decision.");
  const privacyRequest = await prisma.privacyRequest.findUnique({ where: { id: requestId }, select: { userId: true, type: true } });
  if (!privacyRequest) notFound();
  if (privacyRequest.type === "DELETION" && status === "COMPLETED") throw new Error("Use the verified account deletion action for deletion requests.");
  await prisma.$transaction(async (tx) => {
    await tx.privacyRequest.update({ where: { id: requestId }, data: { status, resolution: requireString(formData, "resolution").slice(0, 2000), completedAt: new Date() } });
    await tx.approvalEvent.create({ data: { actorId: admin.id, target: `privacy_request:${requestId}`, decision: status === "COMPLETED" ? "APPROVED" : "REJECTED", note: `Admin closed privacy request as ${status}.` } });
    await queueUserNotification(tx, { userId: privacyRequest.userId, type: "PRIVACY_RESULT", title: "Privacy request updated", body: `Your privacy request was ${status.toLowerCase()}.`, dedupeKey: `privacy:${requestId}:result`, email: true });
  });
  revalidateDashboards();
}

export async function executeAccountDeletionAction(formData: FormData) {
  const admin = await requireAdmin();
  const requestId = requireString(formData, "requestId");
  const request = await prisma.privacyRequest.findUnique({ where: { id: requestId }, include: { user: true } });
  if (!request || request.type !== "DELETION" || !["SUBMITTED", "IN_REVIEW"].includes(request.status)) notFound();
  if (request.user.role === "ADMIN") throw new Error("Administrator deletion requires a separate break-glass procedure.");
  const activeStatuses = [...ACTIVE_BOOKING_STATUSES];
  const [renterObligations, hostObligations] = await Promise.all([
    prisma.booking.count({ where: { userId: request.userId, status: { in: activeStatuses } } }),
    prisma.booking.count({ where: { listing: { hostId: request.userId }, status: { in: activeStatuses } } })
  ]);
  if (renterObligations || hostObligations) throw new Error("Account deletion is blocked while active booking, payment, deposit, or dispute obligations remain.");

  const providerId = request.user.authProviderId?.startsWith("clerk:") ? request.user.authProviderId.slice("clerk:".length) : null;
  if (getAppMode() !== "demo") {
    if (!providerId) throw new Error("Managed authentication identity is missing; investigate before deleting the database account.");
    const client = await clerkClient();
    await client.users.deleteUser(providerId);
  }
  const anonymizedEmail = `deleted+${request.userId}@deleted.invalid`;
  await prisma.$transaction(async (tx) => {
    await tx.user.update({ where: { id: request.userId }, data: { authProviderId: null, fullName: "Deleted account", mobile: "", email: anonymizedEmail, companyName: "Deleted", uen: null, workType: null, verificationStatus: "REJECTED", platformSubscriptionProvider: null, platformSubscriptionStatus: "UNPAID", platformSubscriptionReference: null, platformSubscriptionPaidAt: null, platformSubscriptionPeriodStart: null, platformSubscriptionPeriodEnd: null, platformSubscriptionNextBilling: null, stripeCustomerId: null, stripeSubscriptionId: null, suspended: true } });
    await tx.privacyRequest.update({ where: { id: requestId }, data: { status: "COMPLETED", resolution: "Managed identity deleted and marketplace profile anonymized after active-obligation check.", completedAt: new Date() } });
    await tx.approvalEvent.create({ data: { actorId: admin.id, target: `account_deletion:${requestId}`, decision: "APPROVED", note: "Administrator completed a verified deletion request and anonymized the marketplace account." } });
  });
  revalidateDashboards();
}

export async function sendBookingMessageAction(formData: FormData) {
  const bookingId = requireString(formData, "bookingId");
  const sender = await requireBookingParticipant(bookingId);
  await enforceRateLimit({ action: "chat:booking", identity: sender.id, limit: 30, windowSeconds: 60 });
  const body = await validatedMessageForActor(formData, sender.id, "BOOKING", bookingId);
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { userId: true, listing: { select: { hostId: true, title: true } } } });
  if (!booking) notFound();
  await prisma.$transaction(async (tx) => {
    const message = await tx.bookingMessage.create({ data: { bookingId, senderId: sender.id, body } });
    const recipients = [booking.userId, booking.listing.hostId].filter((id): id is string => Boolean(id && id !== sender.id));
    for (const userId of recipients) await queueUserNotification(tx, { userId, type: "BOOKING_MESSAGE", title: "New booking message", body: `${booking.listing.title} has a new message in SpaceOnCall chat.`, dedupeKey: `booking-message:${message.id}`, email: true });
  });
  revalidateDashboards();
}

export async function startListingConversationAction(formData: FormData) {
  const renter = await requireRole("RENTER");
  await enforceRateLimit({ action: "chat:listing", identity: renter.id, limit: 20, windowSeconds: 60 });
  const listingId = requireString(formData, "listingId");
  const body = await validatedMessageForActor(formData, renter.id, "LISTING", listingId);
  const listing = await prisma.listing.findFirst({ where: { id: listingId, status: "APPROVED", host: { is: { role: "HOST", suspended: false, verificationStatus: "APPROVED", platformSubscriptionStatus: "ACTIVE" } } }, select: { id: true, slug: true, hostId: true } });
  if (!listing?.hostId) notFound();
  await prisma.$transaction(async (tx) => {
    const conversation = await tx.conversation.upsert({
      where: { listingId_renterId: { listingId, renterId: renter.id } },
      update: { hostId: listing.hostId! },
      create: { listingId, renterId: renter.id, hostId: listing.hostId! }
    });
    const message = await tx.conversationMessage.create({ data: { conversationId: conversation.id, senderId: renter.id, body } });
    await queueUserNotification(tx, { userId: listing.hostId!, type: "LISTING_MESSAGE", title: "New listing enquiry", body: "A renter sent a question through the private listing chat.", dedupeKey: `conversation-message:${message.id}`, email: true });
  });
  revalidatePath(`/listings/${listing.slug}`);
  revalidatePath("/dashboard/host");
}

export async function sendConversationMessageAction(formData: FormData) {
  const conversationId = requireString(formData, "conversationId");
  const sender = await requireConversationParticipant(conversationId);
  await enforceRateLimit({ action: "chat:conversation", identity: sender.id, limit: 30, windowSeconds: 60 });
  const body = await validatedMessageForActor(formData, sender.id, "CONVERSATION", conversationId);
  const conversation = await prisma.conversation.findUnique({ where: { id: conversationId }, select: { renterId: true, hostId: true } });
  if (!conversation) notFound();
  await prisma.$transaction(async (tx) => {
    const message = await tx.conversationMessage.create({ data: { conversationId, senderId: sender.id, body } });
    const recipientId = sender.id === conversation.renterId ? conversation.hostId : conversation.renterId;
    await queueUserNotification(tx, { userId: recipientId, type: "LISTING_MESSAGE", title: "New listing chat message", body: "You received a new message in a private SpaceOnCall listing conversation.", dedupeKey: `conversation-message:${message.id}`, email: true });
  });
  revalidatePath("/dashboard/host");
  revalidatePath("/dashboard/user");
}

export async function createAdditionalRequirementAction(formData: FormData) {
  const renter = await requireRole("RENTER");
  const bookingId = requireString(formData, "bookingId");
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { userId: true, listing: { select: { hostId: true } } } });
  if (!booking) notFound();
  if (booking.userId !== renter.id) forbidden();
  const detail = requireString(formData, "additionalDetail");
  assertNoRestrictedContact(detail);
  await prisma.$transaction(async (tx) => {
    const request = await tx.additionalRequirement.create({ data: { bookingId, userId: renter.id, detail } });
    if (booking.listing.hostId) await queueUserNotification(tx, { userId: booking.listing.hostId, type: "ADDITIONAL_REQUIREMENT", title: "Additional requirement submitted", body: "A renter submitted an additional requirement for your approval and quotation.", dedupeKey: `additional:${request.id}:host-review`, email: true });
  });
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
  const contractText = buildAdditionalRequirementContract({ bookingId: request.booking.id, listingTitle: request.booking.listing.title, renterName: request.user.fullName, hostName: request.booking.listing.host?.fullName ?? "Host", requirementDetail: request.detail, quotedRate });
  await prisma.$transaction([
    prisma.additionalRequirement.update({ where: { id: requestId }, data: { status: nextStatus, quotedRate, contractText, emailedTo: null, emailedAt: null } }),
    prisma.approvalEvent.create({ data: { actorId: host.id, bookingId: request.bookingId, target: "additional_requirement", decision: "APPROVED", note: `Host approved additional requirement at ${formatCurrency(quotedRate)}.` } }),
    prisma.notification.create({ data: { userId: request.userId, type: "ADDITIONAL_REQUIREMENT_RESULT", title: "Additional requirement quoted", body: `The host quoted ${formatCurrency(quotedRate)}. Review the add-on before submitting payment.`, channel: "IN_APP", dedupeKey: `additional:${requestId}:quote:in-app` } })
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
  await prisma.$transaction(async (tx) => {
    await tx.additionalRequirement.update({ where: { id: requestId }, data: { status: nextStatus } });
    await tx.approvalEvent.create({ data: { actorId: host.id, bookingId: request.bookingId, target: "additional_requirement", decision: "REJECTED", note: "Host rejected additional requirement request." } });
    await queueUserNotification(tx, { userId: request.booking.userId, type: "ADDITIONAL_REQUIREMENT_RESULT", title: "Additional requirement declined", body: "The host declined your additional requirement. Continue the discussion in booking chat if needed.", dedupeKey: `additional:${requestId}:rejected`, email: true });
  });
  revalidateDashboards();
}

export async function confirmAdditionalRequirementPaymentAction(formData: FormData) {
  const renter = await requireRole("RENTER");
  const requestId = requireString(formData, "requestId");
  const request = await prisma.additionalRequirement.findUnique({ where: { id: requestId } });
  if (!request) notFound();
  if (request.userId !== renter.id) forbidden();
  await enforceRateLimit({ action: "payment:additional-submit", identity: renter.id, limit: 6, windowSeconds: 60 * 60 });
  const nextStatus = advanceAdditionalRequirementStatus(request.status, "PAY");
  if (nextStatus === request.status) throw new Error("Additional requirement must be approved before payment.");
  const paymentReference = requireString(formData, "paymentReference").slice(0, 120);
  await prisma.$transaction([
    prisma.paymentRecord.create({ data: { payerId: renter.id, bookingId: request.bookingId, additionalRequirementId: request.id, kind: "ADDITIONAL_REQUIREMENT", amount: request.quotedRate, reference: paymentReference, idempotencyKey: `additional:${request.id}:${paymentReference.toLowerCase()}` } }),
    prisma.additionalRequirement.update({ where: { id: requestId }, data: { status: nextStatus, paidAt: null } }),
    prisma.approvalEvent.create({ data: { actorId: renter.id, bookingId: request.bookingId, target: "additional_requirement_payment", decision: "APPROVED", note: `Renter submitted payment proof for ${formatCurrency(request.quotedRate)}.` } })
  ]);
  revalidateDashboards();
}

export async function reviewAdditionalRequirementPaymentAction(formData: FormData) {
  const admin = await requireAdmin();
  const paymentId = requireString(formData, "paymentId");
  const decision = requireString(formData, "decision") as "verify" | "reject";
  if (decision !== "verify" && decision !== "reject") throw new Error("Invalid payment decision.");
  const payment = await prisma.paymentRecord.findUnique({ where: { id: paymentId }, include: { additionalRequirement: true } });
  if (!payment?.additionalRequirement || payment.kind !== "ADDITIONAL_REQUIREMENT" || payment.status !== "SUBMITTED") notFound();
  const nextStatus = decision === "verify" ? "PAID_CONFIRMED" : "APPROVED_FOR_PAYMENT";
  await prisma.$transaction(async (tx) => {
    await tx.paymentRecord.update({ where: { id: payment.id }, data: { status: decision === "verify" ? "VERIFIED" : "REJECTED", reviewerId: admin.id, reviewedAt: new Date() } });
    await tx.additionalRequirement.update({ where: { id: payment.additionalRequirement!.id }, data: { status: nextStatus, paidAt: decision === "verify" ? new Date() : null } });
    await tx.approvalEvent.create({ data: { actorId: admin.id, bookingId: payment.additionalRequirement!.bookingId, target: "additional_requirement_payment_reconciliation", decision: decision === "verify" ? "APPROVED" : "REJECTED", note: `Admin ${decision === "verify" ? "verified" : "rejected"} additional requirement payment.` } });
    await queueUserNotification(tx, { userId: payment.payerId, type: "ADDITIONAL_PAYMENT_RESULT", title: decision === "verify" ? "Add-on payment verified" : "Add-on payment rejected", body: decision === "verify" ? "Your additional requirement payment was verified." : "Your add-on payment reference was rejected.", dedupeKey: `additional-payment:${payment.id}:result`, email: true });
  });
  revalidateDashboards();
}

export async function createListingAction(formData: FormData) {
  const host = await requireRole("HOST");
  if (!canHostOperate(host)) throw new Error("An approved, active host subscription is required before submitting a listing.");
  const title = requireString(formData, "title");
  assertNoRestrictedContact(title, requireString(formData, "amenities"), requireString(formData, "permittedWork"), requireString(formData, "restrictedWork"), optionalString(formData, "factoryTypeOther"), optionalString(formData, "equipmentOther"));
  const slug = slugify(`${title}-${Date.now()}`);
  const photoUploadId = optionalString(formData, "photoUploadId");
  const floorPlanUploadId = optionalString(formData, "floorPlanUploadId");
  const equipmentSlugs = formData.getAll("equipment").map(String).filter((slugValue) => slugValue !== "other");
  const factoryTypes = formData.getAll("factoryType").map(String).filter((value) => ["OFFICE", "B1", "B2", "OTHER"].includes(value));
  const sizeSqft = Number(requireString(formData, "sizeSqft"));
  const spaceType = inferSpaceTypeFromSize(sizeSqft);
  const amenities = splitList(requireString(formData, "amenities"));
  const declaredType = formatDeclaredType(factoryTypes, optionalString(formData, "factoryTypeOther"));
  if (declaredType) amenities.push(declaredType);
  const equipmentOther = optionalString(formData, "equipmentOther");
  if (equipmentOther) amenities.push(...splitList(equipmentOther).map((item) => `Equipment: ${item}`));

  await prisma.$transaction(async (tx) => {
    const listing = await tx.listing.create({
      data: {
        slug, title, address: requireString(formData, "address"), location: requireString(formData, "location"), sizeSqft, spaceType,
        factoryType: zoningFromFactoryTypes(factoryTypes), status: "PENDING_ADMIN", accessHours: requireString(formData, "accessHours"),
        powerType: requireString(formData, "powerType") as PowerType,
        loadingAccessJson: JSON.stringify(splitList(requireString(formData, "loadingAccess"))), amenitiesJson: JSON.stringify(amenities),
        permittedWorkJson: JSON.stringify(splitList(requireString(formData, "permittedWork"))), prohibitedWorkJson: JSON.stringify(splitList(requireString(formData, "restrictedWork"))),
        safetyRulesJson: JSON.stringify(commonSafetyRules), cancellationPolicy: "Host reviews cancellation requests case by case for this pending listing.",
        photoUrlsJson: JSON.stringify([fallbackListingImage(spaceType)]), floorPlanUrl: fallbackFloorPlan(spaceType),
        priceDay: numberField(formData, "priceDay"), priceSevenDays: numberField(formData, "priceSevenDays"), priceThirtyDays: numberField(formData, "priceThirtyDays"), priceSixtyDays: numberField(formData, "priceSixtyDays"),
        depositStandard: numberField(formData, "depositStandard"), depositHighRisk: Number(formData.get("depositHighRisk") || 0), cleaningFee: numberField(formData, "cleaningFee"),
        fireSafety: optionalString(formData, "fireSafety") || "Not provided", electricalSupply: optionalString(formData, "electricalSupply") || "Not provided", hostId: host.id,
        equipmentAddons: { create: equipmentSlugs.map((value) => ({ equipmentAddon: { connect: { slug: value } } })) }
      }
    });
    for (const [uploadId, type] of [[photoUploadId, "LISTING_PHOTO"], [floorPlanUploadId, "FLOOR_PLAN"]] as const) {
      if (!uploadId) continue;
      const result = await tx.upload.updateMany({
        where: { id: uploadId, type, listingId: null, ownerUserId: host.id, uploadedByUserId: host.id, uploadStatus: "AVAILABLE" },
        data: { listingId: listing.id }
      });
      if (result.count !== 1) throw new Error(`${type.toLowerCase().replace("_", " ")} is unavailable or does not belong to this host.`);
    }
    await tx.approvalEvent.create({ data: { actorId: host.id, listingId: listing.id, target: "listing_submission", decision: "APPROVED", note: "Authenticated host submitted listing for admin review." } });
    await queueAdminNotifications(tx, { type: "LISTING_REVIEW", title: "Listing needs approval", body: `${title} was submitted for administrator review.`, dedupeKey: `listing:${listing.id}:admin-review`, email: true });
  });
  revalidateDashboards();
  redirect("/dashboard/host?listing=submitted");
}

export async function updateListingStatusAction(formData: FormData) {
  const admin = await requireAdmin();
  const listingId = requireString(formData, "listingId");
  const status = requireString(formData, "status") as "APPROVED" | "REJECTED" | "SUSPENDED";
  if (!["APPROVED", "REJECTED", "SUSPENDED"].includes(status)) throw new Error("Invalid listing status.");
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { hostId: true, title: true } });
  if (!listing) notFound();
  await prisma.$transaction(async (tx) => {
    await tx.listing.update({ where: { id: listingId }, data: { status } });
    await tx.approvalEvent.create({ data: { actorId: admin.id, listingId, target: "listing", decision: status === "APPROVED" ? "APPROVED" : status === "SUSPENDED" ? "SUSPENDED" : "REJECTED", note: `Admin changed listing status to ${status}.` } });
    if (listing.hostId) await queueUserNotification(tx, { userId: listing.hostId, type: "LISTING_STATUS", title: "Listing status updated", body: `${listing.title} is now ${status.toLowerCase()}.`, dedupeKey: `listing:${listingId}:status:${status}`, email: true });
  });
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

export async function updateDepositStatusAction(formData: FormData) {
  const admin = await requireAdmin();
  const bookingId = requireString(formData, "bookingId");
  const status = requireString(formData, "depositStatus") as "HELD" | "RELEASED" | "PARTIALLY_RETAINED" | "RETAINED" | "DISPUTED";
  if (!(["HELD", "RELEASED", "PARTIALLY_RETAINED", "RETAINED", "DISPUTED"] as const).includes(status)) throw new Error("Invalid deposit status.");
  const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { deposit: true } });
  if (!booking) notFound();
  let depositReturned = 0;
  let depositRetained = 0;
  if (status === "RELEASED") depositReturned = booking.deposit;
  if (status === "RETAINED") depositRetained = booking.deposit;
  if (status === "PARTIALLY_RETAINED") {
    depositReturned = numberField(formData, "depositReturned");
    depositRetained = numberField(formData, "depositRetained");
    if (depositReturned <= 0 || depositRetained <= 0 || depositReturned + depositRetained !== booking.deposit) {
      throw new Error("Returned and retained deposit amounts must both be positive and equal the booked deposit total.");
    }
  }
  const note = requireString(formData, "depositNote").slice(0, 1000);
  await prisma.$transaction([
    prisma.booking.update({ where: { id: bookingId }, data: { depositStatus: status, depositReturned, depositRetained } }),
    prisma.approvalEvent.create({ data: { actorId: admin.id, bookingId, target: "deposit_ledger", decision: status === "DISPUTED" || status === "RETAINED" ? "REJECTED" : "APPROVED", note: `${status}: returned ${formatCurrency(depositReturned)}, retained ${formatCurrency(depositRetained)}. ${note}` } })
  ]);
  revalidateDashboards();
}

export async function markNotificationReadAction(formData: FormData) {
  const user = await requireUser();
  const notificationId = requireString(formData, "notificationId");
  await prisma.notification.updateMany({
    where: { id: notificationId, userId: user.id, channel: "IN_APP" },
    data: { status: "READ", readAt: new Date() }
  });
  revalidateDashboards();
}

export async function reportMessageAction(formData: FormData) {
  const actor = await requireUser();
  await enforceRateLimit({ action: "moderation:report", identity: actor.id, limit: 8, windowSeconds: 24 * 60 * 60 });
  const messageKind = requireString(formData, "messageKind");
  const messageId = requireString(formData, "messageId");
  const reason = requireString(formData, "reason");
  if (!("CONTACT_SHARING HARASSMENT UNSAFE_REQUEST SPAM OTHER".split(" ")).includes(reason)) throw new Error("Invalid report reason.");

  let contextType: "BOOKING" | "CONVERSATION";
  let contextId: string;
  let reportedUserId: string;
  if (messageKind === "BOOKING") {
    const message = await prisma.bookingMessage.findUnique({ where: { id: messageId }, select: { senderId: true, bookingId: true } });
    if (!message) notFound();
    await requireBookingParticipant(message.bookingId);
    contextType = "BOOKING";
    contextId = message.bookingId;
    reportedUserId = message.senderId;
  } else if (messageKind === "CONVERSATION") {
    const message = await prisma.conversationMessage.findUnique({ where: { id: messageId }, select: { senderId: true, conversationId: true } });
    if (!message) notFound();
    await requireConversationParticipant(message.conversationId);
    contextType = "CONVERSATION";
    contextId = message.conversationId;
    reportedUserId = message.senderId;
  } else {
    throw new Error("Invalid message type.");
  }
  if (reportedUserId === actor.id) throw new Error("You cannot report your own message.");

  await prisma.$transaction(async (tx) => {
    const report = await tx.moderationReport.create({ data: { reporterId: actor.id, reportedUserId, contextType, contextId, messageId, reason, detail: optionalString(formData, "detail").slice(0, 1000) || null } });
    await tx.approvalEvent.create({ data: { actorId: actor.id, target: `moderation_report:${report.id}`, decision: "REJECTED", note: `Authenticated participant reported a ${contextType.toLowerCase()} message for ${reason.toLowerCase().replaceAll("_", " ")}.` } });
    await queueAdminNotifications(tx, { type: "MODERATION_REPORT", title: "Chat report requires review", body: `A ${reason.toLowerCase().replaceAll("_", " ")} report was submitted.`, dedupeKey: `moderation:${report.id}:admin`, email: true });
  });
  revalidateDashboards();
}

export async function reviewModerationReportAction(formData: FormData) {
  const admin = await requireAdmin();
  const reportId = requireString(formData, "reportId");
  const status = requireString(formData, "status") as "RESOLVED" | "DISMISSED";
  if (status !== "RESOLVED" && status !== "DISMISSED") throw new Error("Invalid moderation decision.");
  const report = await prisma.moderationReport.findUnique({ where: { id: reportId }, select: { reporterId: true } });
  if (!report) notFound();
  const resolution = requireString(formData, "resolution").slice(0, 1000);
  await prisma.$transaction(async (tx) => {
    await tx.moderationReport.update({ where: { id: reportId }, data: { status, resolution, reviewerId: admin.id, reviewedAt: new Date() } });
    await tx.approvalEvent.create({ data: { actorId: admin.id, target: `moderation_report:${reportId}`, decision: status === "RESOLVED" ? "APPROVED" : "REJECTED", note: `Admin closed moderation report as ${status}.` } });
    await queueUserNotification(tx, { userId: report.reporterId, type: "MODERATION_RESULT", title: "Chat report reviewed", body: `Your report was ${status.toLowerCase()}.`, dedupeKey: `moderation:${reportId}:result`, email: true });
  });
  revalidatePath("/dashboard/admin");
}

async function validatedMessageForActor(formData: FormData, actorId: string, contextType: string, contextId: string): Promise<string> {
  const body = requireString(formData, "message").slice(0, 1000);
  if (containsRestrictedContactDetail(body)) {
    await prisma.$transaction(async (tx) => {
      const report = await tx.moderationReport.create({ data: { reporterId: actorId, reportedUserId: actorId, contextType, contextId, reason: "CONTACT_SHARING_ATTEMPT", detail: "Restricted contact detail was blocked before the message was stored." } });
      await tx.approvalEvent.create({ data: { actorId, target: `contact_policy_violation:${report.id}`, decision: "REJECTED", note: "A contact-sharing attempt was blocked. The submitted message body was not retained." } });
      await queueAdminNotifications(tx, { type: "CONTACT_POLICY", title: "Contact-sharing attempt blocked", body: "A user attempted to submit restricted contact details. The message was blocked and not stored.", dedupeKey: `contact-policy:${report.id}:admin` });
    });
    throw new Error(CONTACT_POLICY_MESSAGE);
  }
  return body;
}

function assertNoRestrictedContact(...values: string[]) {
  if (values.some(containsRestrictedContactDetail)) throw new Error(CONTACT_POLICY_MESSAGE);
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
