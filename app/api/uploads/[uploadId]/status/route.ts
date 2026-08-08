import { getOptionalUser } from "@/src/lib/authorization";
import { prisma } from "@/src/lib/db";
import { canAccessUpload } from "@/src/lib/upload-authorization";

export async function GET(_request: Request, context: { params: Promise<{ uploadId: string }> }) {
  const actor = await getOptionalUser();
  if (!actor) return Response.json({ error: "Authentication required." }, { status: 401 });
  if (actor.suspended) return Response.json({ error: "Forbidden." }, { status: 403 });
  const { uploadId } = await context.params;
  const upload = await prisma.upload.findUnique({
    where: { id: uploadId },
    include: { listing: { select: { hostId: true } }, booking: { select: { userId: true, status: true, listing: { select: { hostId: true } } } } }
  });
  if (!upload) return Response.json({ error: "Upload not found." }, { status: 404 });
  if (!canAccessUpload(actor, upload)) return Response.json({ error: "Forbidden." }, { status: 403 });
  return Response.json({ uploadId: upload.id, uploadStatus: upload.uploadStatus, scanStatus: upload.scanStatus });
}
