import { prisma } from "./db";
import { buildBookingDocument } from "./legal-documents";

export async function loadBookingDocument(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      user: true,
      listing: { include: { host: true } },
      addons: { include: { equipmentAddon: true } },
      additionalRequirements: { orderBy: { createdAt: "asc" } },
      agreementAcceptances: { orderBy: { acceptedAt: "asc" } }
    }
  });
  if (!booking) return null;

  const body = buildBookingDocument({
    bookingId: booking.id,
    createdAt: booking.createdAt,
    listingTitle: booking.listing.title,
    listingAddress: booking.listing.address,
    hostName: booking.listing.host?.fullName ?? "Host account unavailable",
    hostCompanyName: booking.listing.host?.companyName ?? "Not recorded",
    renterName: booking.user.fullName,
    renterCompanyName: booking.user.companyName,
    durationDays: booking.durationDays,
    startAt: booking.startAt,
    endAt: booking.endAt,
    workType: booking.workType,
    riskLevel: booking.riskLevel,
    status: booking.status,
    rentalTotal: booking.rentalTotal,
    deposit: booking.deposit,
    cleaningFee: booking.cleaningFee,
    addonTotal: booking.addonTotal,
    grandTotal: booking.grandTotal,
    safetyAcceptedAt: booking.safetyAcceptedAt,
    renterDealConfirmedAt: booking.renterDealConfirmedAt,
    hostDealConfirmedAt: booking.hostDealConfirmedAt,
    cancellationPolicy: booking.listing.cancellationPolicy,
    addons: booking.addons.map((addon) => ({ name: addon.equipmentAddon.name, price: addon.priceAtBooking })),
    additionalRequirements: booking.additionalRequirements.map((requirement) => ({
      detail: requirement.detail,
      status: requirement.status,
      quotedRate: requirement.quotedRate
    }))
  });

  return { booking, body };
}
