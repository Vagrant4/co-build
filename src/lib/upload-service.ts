import type { PutBlobResult } from "@vercel/blob";
import type { UploadType, User } from "@prisma/client";
import { prisma } from "./db";
import { logEvent } from "./observability";
import type { PrivateStorageAdapter } from "./storage";
import { privateStorage } from "./storage";
import { validateUploadBytes } from "./upload-validation";
import { assertSafeUploadDeclaration, buildPrivateObjectKey } from "./uploads";

export type UploadReservationInput = {
  type: UploadType;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  bookingId?: string;
  listingId?: string;
};

export type PendingUploadRecord = {
  id: string;
  type: UploadType;
  originalName: string;
  objectKey: string | null;
  contentType: string | null;
  sizeBytes: number | null;
  uploadStatus: string;
  uploadedByUserId: string | null;
  bookingId: string | null;
  listingId: string | null;
};

export interface UploadLifecycleRepository {
  find(uploadId: string): Promise<PendingUploadRecord | null>;
  markAvailable(upload: PendingUploadRecord, validated: { contentType: string; sizeBytes: number; checksumSha256: string }, scanStatus: "PENDING" | "NOT_REQUIRED"): Promise<void>;
  markRejected(uploadId: string): Promise<void>;
}

export async function createUploadReservation(actor: User, input: UploadReservationInput) {
  assertSafeUploadDeclaration(input.type, input);
  const objectKey = buildPrivateObjectKey(input.type, actor.id, input.originalName);
  return prisma.upload.create({
    data: {
      type: input.type,
      originalName: input.originalName,
      storageProvider: "VERCEL_BLOB",
      objectKey,
      contentType: input.contentType,
      sizeBytes: input.sizeBytes,
      uploadStatus: "PENDING",
      scanStatus: "PENDING",
      uploadedByUserId: actor.id,
      ownerUserId: actor.id,
      bookingId: input.bookingId,
      listingId: input.listingId
    }
  });
}

export async function finalizeClientUpload(
  uploadId: string,
  blob: PutBlobResult,
  storage: PrivateStorageAdapter = privateStorage(),
  repository: UploadLifecycleRepository = prismaUploadLifecycleRepository
): Promise<void> {
  const upload = await repository.find(uploadId);
  if (!upload || upload.uploadStatus !== "PENDING" || !upload.objectKey || upload.objectKey !== blob.pathname) {
    await storage.delete(blob.pathname).catch((error) => logEvent("error", "upload_orphan_delete_failed", { uploadId, errorName: error instanceof Error ? error.name : "Unknown" }));
    throw new Error("Upload reservation is missing, expired, or does not match the stored object.");
  }

  try {
    const object = await storage.get(upload.objectKey);
    if (!object) throw new Error("Uploaded object could not be read back from private storage.");
    const bytes = await readStreamWithLimit(object.stream, Math.max((upload.sizeBytes || 0) + 1, 16 * 1024 * 1024 + 1));
    const validated = validateUploadBytes({
      type: upload.type,
      originalName: upload.originalName,
      declaredContentType: upload.contentType || blob.contentType,
      bytes
    });
    const scanStatus = process.env.ALLOW_UNSCANNED_UPLOADS === "true" ? "NOT_REQUIRED" : "PENDING";
    await repository.markAvailable(upload, validated, scanStatus);
  } catch (error) {
    await storage.delete(upload.objectKey).catch((deleteError) => logEvent("error", "upload_rejected_delete_failed", { uploadId, errorName: deleteError instanceof Error ? deleteError.name : "Unknown" }));
    await repository.markRejected(upload.id).catch(() => undefined);
    logEvent("warn", "upload_validation_rejected", { uploadId, type: upload.type, errorName: error instanceof Error ? error.name : "Unknown" });
    throw error;
  }
}

const prismaUploadLifecycleRepository: UploadLifecycleRepository = {
  find(uploadId) {
    return prisma.upload.findUnique({ where: { id: uploadId } });
  },
  async markAvailable(upload, validated, scanStatus) {
    await prisma.$transaction([
      prisma.upload.update({ where: { id: upload.id }, data: { ...validated, uploadStatus: "AVAILABLE", scanStatus, verifiedAt: new Date() } }),
      prisma.approvalEvent.create({
        data: {
          actorId: upload.uploadedByUserId,
          bookingId: upload.bookingId,
          listingId: upload.listingId,
          target: `upload:${upload.id}`,
          decision: "APPROVED",
          note: "Private upload completed and server-side file validation passed."
        }
      })
    ]);
  },
  async markRejected(uploadId) {
    await prisma.upload.update({ where: { id: uploadId }, data: { uploadStatus: "REJECTED", scanStatus: "FAILED", deletedAt: new Date() } });
  }
};

async function readStreamWithLimit(stream: ReadableStream<Uint8Array>, maximumBytes: number): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximumBytes) {
      await reader.cancel();
      throw new Error("Stored object exceeds the reserved size.");
    }
    chunks.push(value);
  }
  const output = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return output;
}
