import { notFound } from "next/navigation";
import { requireBookingParticipant } from "@/src/lib/authorization";
import { loadBookingDocument } from "@/src/lib/booking-document";
import { prisma } from "@/src/lib/db";
import { bookingDocumentFilename, LEGAL_DOCUMENT_REVIEW_STATUS, LEGAL_DOCUMENT_VERSION } from "@/src/lib/legal-documents";
import { renderTextDocumentPdf } from "@/src/lib/pdf-document";
import { bookingDocumentDigest } from "@/src/lib/agreement-acceptance";

type Context = { params: Promise<{ bookingId: string }> };

export async function GET(_request: Request, context: Context) {
  const { bookingId } = await context.params;
  const actor = await requireBookingParticipant(bookingId);
  const record = await loadBookingDocument(bookingId);
  if (!record) notFound();
  const { booking, body } = record;
  const documentHash = bookingDocumentDigest(body);
  const renterAcceptance = booking.agreementAcceptances.find((item) => item.userId === booking.userId && item.documentHash === documentHash);
  const hostAcceptance = booking.listing.hostId ? booking.agreementAcceptances.find((item) => item.userId === booking.listing.hostId && item.documentHash === documentHash) : null;
  const certifiedBody = [body, "", "ACKNOWLEDGEMENT RECORD", `Agreement SHA-256: ${documentHash}`, `Renter acceptance: ${renterAcceptance ? renterAcceptance.acceptedAt.toISOString() : "Pending"}`, `Host acceptance: ${hostAcceptance ? hostAcceptance.acceptedAt.toISOString() : "Pending"}`].join("\n");
  const bytes = await renderTextDocumentPdf({
    title: `Booking record ${booking.id}`,
    body: certifiedBody,
    version: LEGAL_DOCUMENT_VERSION,
    status: LEGAL_DOCUMENT_REVIEW_STATUS
  });

  await prisma.approvalEvent.create({
    data: {
      actorId: actor.id,
      bookingId: booking.id,
      target: "booking_document_download:pilot_summary",
      decision: "APPROVED",
      note: "Authorized participant downloaded the private pilot booking record."
    }
  });

  return new Response(Buffer.from(bytes), {
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${bookingDocumentFilename(booking.id)}"`,
      "Content-Type": "application/pdf",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
