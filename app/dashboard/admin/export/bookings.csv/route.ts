import { csvResponse, toCsv } from "@/src/lib/csv-export";
import { prisma } from "@/src/lib/db";
import { requireAdmin } from "@/src/lib/authorization";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  const bookings = await prisma.$transaction(async (tx) => {
    const rows = await tx.booking.findMany({
      include: { listing: { select: { slug: true, title: true } } },
      orderBy: { createdAt: "desc" }
    });
    await tx.adminExportEvent.create({ data: { actorId: admin.id, exportType: "bookings", rowCount: rows.length } });
    return rows;
  });

  const rows = bookings.map((booking) => ({
    addonTotal: booking.addonTotal,
    bookingId: booking.id,
    cleaningFee: booking.cleaningFee,
    createdAt: booking.createdAt,
    deposit: booking.deposit,
    durationDays: booking.durationDays,
    grandTotal: booking.grandTotal,
    hostDealConfirmedAt: booking.hostDealConfirmedAt,
    listingSlug: booking.listing.slug,
    listingTitle: booking.listing.title,
    rentalTotal: booking.rentalTotal,
    renterDealConfirmedAt: booking.renterDealConfirmedAt,
    renterId: booking.userId,
    riskLevel: booking.riskLevel,
    safetyAcceptedAt: booking.safetyAcceptedAt,
    status: booking.status,
    workType: booking.workType
  }));

  const csv = toCsv(rows, [
    { key: "bookingId", header: "Booking ID" },
    { key: "status", header: "Status" },
    { key: "listingTitle", header: "Listing" },
    { key: "listingSlug", header: "Listing slug" },
    { key: "renterId", header: "Renter ID" },
    { key: "durationDays", header: "Duration days" },
    { key: "workType", header: "Work type" },
    { key: "riskLevel", header: "Risk" },
    { key: "rentalTotal", header: "Rental total" },
    { key: "deposit", header: "Deposit" },
    { key: "cleaningFee", header: "Cleaning fee" },
    { key: "addonTotal", header: "Add-on total" },
    { key: "grandTotal", header: "Grand total" },
    { key: "safetyAcceptedAt", header: "Safety accepted" },
    { key: "renterDealConfirmedAt", header: "Renter confirmed" },
    { key: "hostDealConfirmedAt", header: "Host confirmed" },
    { key: "createdAt", header: "Created" }
  ]);

  return csvResponse("co-build-bookings.csv", csv);
}
