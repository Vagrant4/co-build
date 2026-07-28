import type { PutBlobResult } from "@vercel/blob";
import { describe, expect, it, vi } from "vitest";
import type { PrivateStorageAdapter } from "../src/lib/storage";
import { finalizeClientUpload, type PendingUploadRecord, type UploadLifecycleRepository } from "../src/lib/upload-service";

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
