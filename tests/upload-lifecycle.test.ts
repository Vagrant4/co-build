import type { PutBlobResult } from "@vercel/blob";
import { describe, expect, it, vi } from "vitest";
import type { PrivateStorageAdapter } from "../src/lib/storage";
import { finalizeClientUpload, remediateLegacyUploads, type LegacyUploadCandidate, type LegacyUploadRemediationRepository, type PendingUploadRecord, type UploadLifecycleRepository } from "../src/lib/upload-service";

const onePixelPng = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"));
const pending: PendingUploadRecord = {
  id: "upload-a", type: "CHECK_IN", originalName: "arrival.png", objectKey: "pilot/check_in/renter-a/file.png",
  contentType: "image/png", sizeBytes: onePixelPng.byteLength, uploadStatus: "PENDING", uploadedByUserId: "renter-a", bookingId: "booking-a", listingId: null
};
const blob = { pathname: pending.objectKey, contentType: "image/png" } as PutBlobResult;

function storage(): PrivateStorageAdapter & { delete: ReturnType<typeof vi.fn> } {
  return {
    get: vi.fn(async () => ({ stream: new Blob([onePixelPng]).stream(), contentType: "image/png", size: onePixelPng.byteLength, etag: "etag" })),
    head: vi.fn(),
    listKeys: vi.fn(async () => []),
    delete: vi.fn(async () => undefined)
  };
}

describe("staged upload lifecycle", () => {
  it("marks a validated private object available", async () => {
    const store = storage();
    const repository: UploadLifecycleRepository = { find: vi.fn(async () => pending), markAvailable: vi.fn(async () => undefined), markRejected: vi.fn(async () => undefined) };
    await finalizeClientUpload(pending.id, blob, store, repository);
    expect(repository.markAvailable).toHaveBeenCalledOnce();
    expect(store.delete).not.toHaveBeenCalled();
  });

  it("deletes the object and never leaves AVAILABLE when database finalization fails", async () => {
    const store = storage();
    const repository: UploadLifecycleRepository = { find: vi.fn(async () => pending), markAvailable: vi.fn(async () => { throw new Error("database unavailable"); }), markRejected: vi.fn(async () => undefined) };
    await expect(finalizeClientUpload(pending.id, blob, store, repository)).rejects.toThrow("database unavailable");
    expect(store.delete).toHaveBeenCalledWith(pending.objectKey);
    expect(repository.markRejected).toHaveBeenCalledWith(pending.id);
  });

  it("deletes a completed object that has no matching pending reservation", async () => {
    const store = storage();
    const repository: UploadLifecycleRepository = { find: vi.fn(async () => null), markAvailable: vi.fn(), markRejected: vi.fn() };
    await expect(finalizeClientUpload(pending.id, blob, store, repository)).rejects.toThrow(/reservation/i);
    expect(store.delete).toHaveBeenCalledWith(pending.objectKey);
    expect(repository.markAvailable).not.toHaveBeenCalled();
  });
});

describe("legacy upload remediation", () => {
  const candidate: LegacyUploadCandidate = { ...pending, uploadStatus: "AVAILABLE", scanStatus: "NOT_REQUIRED", checksumSha256: null };

  it("marks a legacy object safe only after validation and scanning", async () => {
    const store = storage();
    const repository: LegacyUploadRemediationRepository = {
      listCandidates: vi.fn(async () => [candidate]),
      markSafe: vi.fn(async () => undefined),
      markRejected: vi.fn(async () => undefined)
    };
    const result = await remediateLegacyUploads("admin-a", 20, store, repository, vi.fn(async () => "SAFE"));
    expect(result).toEqual({ scanned: 1, rejected: 0, remaining: 0 });
    expect(repository.markSafe).toHaveBeenCalledOnce();
    expect(repository.markRejected).not.toHaveBeenCalled();
  });

  it("deletes and rejects a legacy object when scanning fails", async () => {
    const store = storage();
    const repository: LegacyUploadRemediationRepository = {
      listCandidates: vi.fn(async () => [candidate]),
      markSafe: vi.fn(async () => undefined),
      markRejected: vi.fn(async () => undefined)
    };
    const result = await remediateLegacyUploads("admin-a", 20, store, repository, vi.fn(async () => { throw new Error("unsafe"); }));
    expect(result).toEqual({ scanned: 0, rejected: 1, remaining: 0 });
    expect(store.delete).toHaveBeenCalledWith(candidate.objectKey);
    expect(repository.markRejected).toHaveBeenCalledOnce();
    expect(repository.markSafe).not.toHaveBeenCalled();
  });
});
