import { UploadType } from "@prisma/client";
import { getOptionalUser } from "@/src/lib/authorization";
import { prisma } from "@/src/lib/db";
import { logEvent, requestIdFrom } from "@/src/lib/observability";
import { canReserveForBooking, canReserveForListing, canReserveWithoutResource } from "@/src/lib/upload-authorization";
import { createUploadReservation } from "@/src/lib/upload-service";
import { assertRealUploadsConfigured } from "@/src/lib/uploads";

export async function POST(request: Request) {
  const requestId = requestIdFrom(request);
  try {
    const actor = await getOptionalUser();
    if (!actor) {
      logEvent("warn", "upload_reservation_denied", { requestId, reason: "signed_out" });
      return jsonError("Authentication required.", 401, requestId);
    }
    if (actor.suspended) {
      logEvent("warn", "upload_reservation_denied", { requestId, reason: "suspended" });
      return jsonError("Account is suspended.", 403, requestId);
    }
    assertRealUploadsConfigured();
    const input = await request.json() as Record<string, unknown>;
    if (typeof input.type !== "string" || !Object.values(UploadType).includes(input.type as UploadType)) return jsonError("Invalid upload type.", 400, requestId);
    const type = input.type as UploadType;
    const bookingId = typeof input.bookingId === "string" && input.bookingId ? input.bookingId : undefined;
    const listingId = typeof input.listingId === "string" && input.listingId ? input.listingId : undefined;
    if (bookingId && listingId) return jsonError("Upload may belong to either a booking or listing, not both.", 400, requestId);

    let authorized = false;
    if (bookingId) {
      const booking = await prisma.booking.findUnique({ where: { id: bookingId }, select: { userId: true, status: true, listing: { select: { hostId: true } } } });
      if (!booking) return jsonError("Booking not found.", 404, requestId);
      authorized = canReserveForBooking(actor, type, booking);
    } else if (listingId) {
      const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { hostId: true } });
      if (!listing) return jsonError("Listing not found.", 404, requestId);
      authorized = canReserveForListing(actor, type, listing);
    } else {
      authorized = canReserveWithoutResource(actor, type);
    }
    if (!authorized) {
      logEvent("warn", "upload_reservation_denied", { requestId, reason: "resource_scope", uploadType: type });
      return jsonError("You may not create this upload.", 403, requestId);
    }

    const reservation = await createUploadReservation(actor, {
      type,
      originalName: String(input.originalName || ""),
      contentType: String(input.contentType || ""),
      sizeBytes: Number(input.sizeBytes),
      bookingId,
      listingId
    });
    return Response.json({ uploadId: reservation.id, objectKey: reservation.objectKey }, { status: 201, headers: { "x-request-id": requestId } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Upload reservation failed.", 400, requestId);
  }
}

function jsonError(error: string, status: number, requestId: string) {
  return Response.json({ error, requestId }, { status, headers: { "x-request-id": requestId } });
}
