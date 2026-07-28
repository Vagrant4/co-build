import { getOptionalUser } from "@/src/lib/authorization";
import { prisma } from "@/src/lib/db";
import { logEvent, requestIdFrom } from "@/src/lib/observability";
import { privateStorage } from "@/src/lib/storage";
import { canAccessUpload, canDeleteUpload, isUploadDownloadable } from "@/src/lib/upload-authorization";
import { privateDownloadHeaders } from "@/src/lib/uploads";

type Context = { params: Promise<{ uploadId: string }> };

export async function GET(request: Request, context: Context) {
  const requestId = requestIdFrom(request);
  const result = await loadAuthorizedUpload(context, false);
  if (result instanceof Response) {
    if (result.status === 401 || result.status === 403) logEvent("warn", "private_upload_access_denied", { requestId, status: result.status });
    return result;
  }
  const { actor, upload } = result;
  if (!isUploadDownloadable(upload)) {
    const status = upload.scanStatus === "PENDING" ? 423 : 404;
    return Response.json({ error: status === 423 ? "Upload is awaiting safety review." : "Upload is unavailable." }, { status });
  }
  const objectKey = upload.objectKey!;

  try {
    const object = await privateStorage().get(objectKey);
    if (!object) return Response.json({ error: "Upload is unavailable." }, { status: 404 });
    if (actor.role === "ADMIN") {
      await prisma.approvalEvent.create({ data: { actorId: actor.id, bookingId: upload.bookingId, listingId: upload.listingId, target: `upload_download:${upload.id}`, decision: "APPROVED", note: "Administrator accessed a private upload." } });
    }
    return new Response(object.stream, {
      headers: privateDownloadHeaders({ originalName: upload.originalName, contentType: upload.contentType || object.contentType, sizeBytes: object.size, requestId })
    });
  } catch (error) {
    logEvent("error", "private_upload_read_failed", { requestId, uploadId: upload.id, errorName: error instanceof Error ? error.name : "Unknown" });
    return Response.json({ error: "Upload is temporarily unavailable.", requestId }, { status: 503 });
  }
}

export async function DELETE(request: Request, context: Context) {
  const requestId = requestIdFrom(request);
  const result = await loadAuthorizedUpload(context, true);
  if (result instanceof Response) {
    if (result.status === 401 || result.status === 403) logEvent("warn", "private_upload_delete_denied", { requestId, status: result.status });
    return result;
  }
  const { actor, upload } = result;
  if (upload.uploadStatus === "DELETED") return new Response(null, { status: 204 });
  await prisma.$transaction([
    prisma.upload.update({ where: { id: upload.id }, data: { uploadStatus: "DELETED", deletedAt: new Date() } }),
    prisma.approvalEvent.create({ data: { actorId: actor.id, bookingId: upload.bookingId, listingId: upload.listingId, target: `upload_delete:${upload.id}`, decision: "APPROVED", note: "Authorized user deleted a private upload." } })
  ]);
  if (upload.storageProvider === "VERCEL_BLOB" && upload.objectKey) {
    try {
      await privateStorage().delete(upload.objectKey);
    } catch (error) {
      logEvent("error", "private_upload_delete_failed", { requestId, uploadId: upload.id, errorName: error instanceof Error ? error.name : "Unknown" });
      return Response.json({ error: "Metadata was deleted; object cleanup will be retried.", requestId }, { status: 202 });
    }
  }
  return new Response(null, { status: 204, headers: { "x-request-id": requestId } });
}

async function loadAuthorizedUpload(context: Context, deleting: boolean) {
  const actor = await getOptionalUser();
  if (!actor) return Response.json({ error: "Authentication required." }, { status: 401 });
  if (actor.suspended) return Response.json({ error: "Forbidden." }, { status: 403 });
  const { uploadId } = await context.params;
  const upload = await prisma.upload.findUnique({
    where: { id: uploadId },
    include: { listing: { select: { hostId: true } }, booking: { select: { userId: true, status: true, listing: { select: { hostId: true } } } } }
  });
  if (!upload) return Response.json({ error: "Upload not found." }, { status: 404 });
  const allowed = deleting ? canDeleteUpload(actor, upload) : canAccessUpload(actor, upload);
  if (!allowed) return Response.json({ error: "Forbidden." }, { status: 403 });
  return { actor, upload };
}
