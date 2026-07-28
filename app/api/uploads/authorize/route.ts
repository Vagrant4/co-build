import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getOptionalUser } from "@/src/lib/authorization";
import { prisma } from "@/src/lib/db";
import { logEvent, requestIdFrom } from "@/src/lib/observability";
import { canReserveForBooking, canReserveForListing, canReserveWithoutResource } from "@/src/lib/upload-authorization";
import { finalizeClientUpload } from "@/src/lib/upload-service";
import { assertRealUploadsConfigured, getUploadPolicy } from "@/src/lib/uploads";

export async function POST(request: Request) {
  const requestId = requestIdFrom(request);
  try {
    assertRealUploadsConfigured();
    const body = await request.json() as HandleUploadBody;
    const response = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const actor = await getOptionalUser();
        if (!actor || actor.suspended) throw new Error("Authentication required.");
        const payload = parsePayload(clientPayload);
        const upload = await prisma.upload.findUnique({
          where: { id: payload.uploadId },
          include: { listing: { select: { hostId: true } }, booking: { select: { userId: true, status: true, listing: { select: { hostId: true } } } } }
        });
        if (!upload || upload.uploadStatus !== "PENDING" || upload.uploadedByUserId !== actor.id || !upload.objectKey || upload.objectKey !== pathname) {
          throw new Error("Upload reservation is not authorized.");
        }
        const stillAuthorized = upload.booking
          ? canReserveForBooking(actor, upload.type, upload.booking)
          : upload.listing
            ? canReserveForListing(actor, upload.type, upload.listing)
            : canReserveWithoutResource(actor, upload.type);
        if (!stillAuthorized) throw new Error("Upload reservation no longer has permission for its resource.");
        const policy = getUploadPolicy(upload.type);
        return {
          allowedContentTypes: policy.allowedContentTypes,
          maximumSizeInBytes: Math.min(policy.maximumSizeInBytes, upload.sizeBytes || policy.maximumSizeInBytes),
          validUntil: Date.now() + 5 * 60 * 1000,
          addRandomSuffix: false,
          allowOverwrite: false,
          cacheControlMaxAge: 0,
          tokenPayload: JSON.stringify({ uploadId: upload.id, objectKey: upload.objectKey })
        };
      },
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const payload = parsePayload(tokenPayload);
        if (payload.objectKey !== blob.pathname) throw new Error("Completed object does not match its reservation.");
        await finalizeClientUpload(payload.uploadId, blob);
      }
    });
    return Response.json(response, { headers: { "x-request-id": requestId } });
  } catch (error) {
    logEvent("warn", "upload_authorization_failed", { requestId, errorName: error instanceof Error ? error.name : "Unknown" });
    return Response.json({ error: "Upload could not be authorized.", requestId }, { status: 400, headers: { "x-request-id": requestId } });
  }
}

function parsePayload(value: string | null | undefined): { uploadId: string; objectKey?: string } {
  if (!value) throw new Error("Upload payload is missing.");
  const parsed = JSON.parse(value) as Record<string, unknown>;
  if (typeof parsed.uploadId !== "string" || !parsed.uploadId) throw new Error("Upload id is missing.");
  return { uploadId: parsed.uploadId, objectKey: typeof parsed.objectKey === "string" ? parsed.objectKey : undefined };
}
