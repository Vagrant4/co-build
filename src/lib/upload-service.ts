import type { PutBlobResult } from "@vercel/blob";
import type { UploadType, User } from "@prisma/client";
import { prisma } from "./db";
import { logEvent } from "./observability";
import type { PrivateStorageAdapter } from "./storage";
import { privateStorage } from "./storage";
import { validateUploadBytes } from "./upload-validation";
import { assertSafeUploadDeclaration, buildPrivateObjectKey } from "./uploads";
import { scanUploadBytes, type MalwareScanStatus } from "./malware-scanner";

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
  markAvailable(upload: PendingUploadRecord, validated: { contentType: string; sizeBytes: number; checksumSha256: string }, scanStatus: MalwareScanStatus): Promise<void>;
  markRejected(uploadId: string): Promise<void>;
}

export type LegacyUploadCandidate = PendingUploadRecord & {
  checksumSha256: string | null;
  scanStatus: string;
};

export interface LegacyUploadRemediationRepository {
  listCandidates(limit: number): Promise<LegacyUploadCandidate[]>;
  markSafe(upload: LegacyUploadCandidate, actorId: string, validated: { contentType: string; sizeBytes: number; checksumSha256: string }): Promise<void>;
  markRejected(upload: LegacyUploadCandidate, actorId: string, reason: string): Promise<void>;
}

export type LegacyUploadRemediationResult = { scanned: number; rejected: number; remaining: number };

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
  repository: UploadLifecycleRepository = prismaUploadLifecycleRepository,
  scanner: typeof scanUploadBytes = scanUploadBytes
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
    const validated = await validateUploadBytes({
      type: upload.type,
      originalName: upload.originalName,
      declaredContentType: upload.contentType || blob.contentType,
      bytes
    });
    const scanStatus = await scanner({ bytes, contentType: validated.contentType, originalName: upload.originalName, type: upload.type });
    await repository.markAvailable(upload, validated, scanStatus);
  } catch (error) {
    await storage.delete(upload.objectKey).catch((deleteError) => logEvent("error", "upload_rejected_delete_failed", { uploadId, errorName: deleteError instanceof Error ? deleteError.name : "Unknown" }));
    await repository.markRejected(upload.id).catch(() => undefined);
    logEvent("warn", "upload_validation_rejected", { uploadId, type: upload.type, errorName: error instanceof Error ? error.name : "Unknown" });
    throw error;
  }
}

export async function remediateLegacyUploads(
  actorId: string,
  limit = 20,
  storage: PrivateStorageAdapter = privateStorage(),
  repository: LegacyUploadRemediationRepository = prismaLegacyUploadRemediationRepository,
  scanner: typeof scanUploadBytes = scanUploadBytes
): Promise<LegacyUploadRemediationResult> {
  const candidates = await repository.listCandidates(limit);
  let scanned = 0;
  let rejected = 0;

  for (const upload of candidates) {
    if (!upload.objectKey) {
      await repository.markRejected(upload, actorId, "Private object key is missing.");
      rejected += 1;
      continue;
    }
    try {
      const object = await storage.get(upload.objectKey);
      if (!object) throw new Error("Private object is missing.");
      const bytes = await readStreamWithLimit(object.stream, 16 * 1024 * 1024 + 1);
      const validated = await validateUploadBytes({
        type: upload.type,
        originalName: upload.originalName,
        declaredContentType: upload.contentType || object.contentType,
        bytes
      });
      const scanStatus = await scanner({ bytes, contentType: validated.contentType, originalName: upload.originalName, type: upload.type });
      if (scanStatus !== "SAFE") throw new Error("Malware scanner did not return SAFE.");
      await repository.markSafe(upload, actorId, validated);
      scanned += 1;
    } catch (error) {
      await storage.delete(upload.objectKey).catch((deleteError) => logEvent("error", "legacy_upload_delete_failed", { uploadId: upload.id, errorName: deleteError instanceof Error ? deleteError.name : "Unknown" }));
      await repository.markRejected(upload, actorId, error instanceof Error ? error.message : "Validation or scanning failed.");
      rejected += 1;
    }
  }

  return { scanned, rejected, remaining: Math.max(0, candidates.length === limit ? 1 : 0) };
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

const prismaLegacyUploadRemediationRepository: LegacyUploadRemediationRepository = {
  listCandidates(limit) {
    return prisma.upload.findMany({
      where: {
        storageProvider: "VERCEL_BLOB",
        uploadStatus: "AVAILABLE",
        OR: [{ scanStatus: { in: ["PENDING", "NOT_REQUIRED"] } }, { checksumSha256: null }, { verifiedAt: null }]
      },
      orderBy: { createdAt: "asc" },
      take: limit
    });
  },
  async markSafe(upload, actorId, validated) {
    await prisma.$transaction([
      prisma.upload.update({ where: { id: upload.id }, data: { ...validated, scanStatus: "SAFE", uploadStatus: "AVAILABLE", verifiedAt: new Date(), deletedAt: null } }),
      prisma.approvalEvent.create({ data: { actorId, bookingId: upload.bookingId, listingId: upload.listingId, target: `upload:${upload.id}`, decision: "APPROVED", note: "Administrator remediated a legacy private upload; validation, integrity hashing, and malware scanning passed." } })
    ]);
  },
  async markRejected(upload, actorId, reason) {
    await prisma.$transaction([
      prisma.upload.update({ where: { id: upload.id }, data: { uploadStatus: "REJECTED", scanStatus: "FAILED", deletedAt: new Date() } }),
      prisma.approvalEvent.create({ data: { actorId, bookingId: upload.bookingId, listingId: upload.listingId, target: `upload:${upload.id}`, decision: "REJECTED", note: `Administrator remediated a legacy private upload. The object was rejected: ${reason.slice(0, 300)}` } })
    ]);
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
