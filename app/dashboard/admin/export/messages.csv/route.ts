import { csvResponse, toCsv } from "@/src/lib/csv-export";
import { prisma } from "@/src/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const [bookingMessages, listingMessages] = await Promise.all([
    prisma.bookingMessage.findMany({
      include: {
        booking: {
          include: {
            listing: {
              select: {
                title: true
              }
            }
          }
        },
        sender: {
          select: {
            fullName: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.listingMessage.findMany({
      include: {
        listing: {
          select: {
            title: true
          }
        },
        sender: {
          select: {
            fullName: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    })
  ]);

  const rows = [
    ...bookingMessages.map((message) => ({
      body: message.body,
      contextId: message.bookingId,
      contextType: "booking",
      createdAt: message.createdAt,
      listingTitle: message.booking.listing.title,
      messageId: message.id,
      senderName: message.sender.fullName,
      senderRole: message.sender.role
    })),
    ...listingMessages.map((message) => ({
      body: message.body,
      contextId: message.listingId,
      contextType: "listing",
      createdAt: message.createdAt,
      listingTitle: message.listing.title,
      messageId: message.id,
      senderName: message.sender.fullName,
      senderRole: message.sender.role
    }))
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const csv = toCsv(rows, [
    { key: "messageId", header: "Message ID" },
    { key: "contextType", header: "Chat type" },
    { key: "contextId", header: "Chat record ID" },
    { key: "listingTitle", header: "Listing" },
    { key: "senderRole", header: "Sender role" },
    { key: "senderName", header: "Sender" },
    { key: "body", header: "Message" },
    { key: "createdAt", header: "Created" }
  ]);

  return csvResponse("co-build-messages.csv", csv);
}
