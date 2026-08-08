import { prisma } from "@/src/lib/db";
import { logEvent, requestIdFrom } from "@/src/lib/observability";
import { privateStorage } from "@/src/lib/storage";

type Context = { params: Promise<{ listingId: string; uploadId: string }> };

export async function GET(request: Request, context: Context) {
  const requestId = requestIdFrom(request);
  const { listingId, uploadId } = await context.params;
  const upload = await prisma.upload.findFirst({
    where: {
      id: uploadId,
      listingId,
      type: "LISTING_PHOTO",
      uploadStatus: "AVAILABLE",
      scanStatus: { in: ["SAFE", "NOT_REQUIRED"] },
      listing: { status: "APPROVED", host: { is: { role: "HOST", suspended: false, verificationStatus: "APPROVED", platformSubscriptionStatus: "ACTIVE" } } }
    },
    select: { id: true, objectKey: true, storageProvider: true, contentType: true }
  });
  if (!upload?.objectKey || upload.storageProvider !== "VERCEL_BLOB") return Response.json({ error: "Photo not found." }, { status: 404 });
  try {
    const object = await privateStorage().get(upload.objectKey);
    if (!object) return Response.json({ error: "Photo not found." }, { status: 404 });
    return new Response(object.stream, { headers: { "Content-Type": upload.contentType || object.contentType, "Content-Length": String(object.size), "Cache-Control": "public, max-age=300, s-maxage=3600", "X-Content-Type-Options": "nosniff", "x-request-id": requestId } });
  } catch (error) {
    logEvent("error", "public_listing_photo_read_failed", { requestId, uploadId, errorName: error instanceof Error ? error.name : "Unknown" });
    return Response.json({ error: "Photo is temporarily unavailable." }, { status: 503 });
  }
}
