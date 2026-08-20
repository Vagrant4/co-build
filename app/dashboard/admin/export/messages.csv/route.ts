import { requireAdmin } from "@/src/lib/authorization";
import { csvResponse, toCsv } from "@/src/lib/csv-export";
import { prisma } from "@/src/lib/db";
import { enforceRateLimit } from "@/src/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  await enforceRateLimit({ action: "export:messages", identity: admin.id, limit: 3, windowSeconds: 60 * 60 });
  const [bookingMessages, conversationMessages] = await Promise.all([
      prisma.bookingMessage.findMany({
        include: { booking: { select: { listing: { select: { title: true } } } }, sender: { select: { role: true } } },
        orderBy: { createdAt: "desc" }
      }),
      prisma.conversationMessage.findMany({
        include: { conversation: { select: { listing: { select: { title: true } } } }, sender: { select: { role: true } } },
        orderBy: { createdAt: "desc" }
      })
    ]);
  const rows = [
      ...bookingMessages.map((message) => ({ contextId: message.bookingId, contextType: "booking", createdAt: message.createdAt, listingTitle: message.booking.listing.title, messageId: message.id, messageLength: message.body.length, senderRole: message.sender.role })),
      ...conversationMessages.map((message) => ({ contextId: message.conversationId, contextType: "conversation", createdAt: message.createdAt, listingTitle: message.conversation.listing.title, messageId: message.id, messageLength: message.body.length, senderRole: message.sender.role }))
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  await prisma.adminExportEvent.create({ data: { actorId: admin.id, exportType: "messages", rowCount: rows.length } });

  return csvResponse("spaceoncall-messages.csv", toCsv(rows, [
    { key: "messageId", header: "Message ID" },
    { key: "contextType", header: "Chat type" },
    { key: "contextId", header: "Chat record ID" },
    { key: "listingTitle", header: "Listing" },
    { key: "senderRole", header: "Sender role" },
    { key: "messageLength", header: "Message length" },
    { key: "createdAt", header: "Created" }
  ]));
}
