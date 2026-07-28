import { describe, expect, it } from "vitest";
import { validateUploadBytes } from "../src/lib/upload-validation";
import { assertRealUploadsConfigured, assertSafeUploadDeclaration, privateDownloadHeaders } from "../src/lib/uploads";

const onePixelPng = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64"));

describe("private upload validation", () => {
  it("accepts a real image and records a SHA-256 checksum", () => {
    const result = validateUploadBytes({ type: "CHECK_IN", originalName: "arrival.png", declaredContentType: "image/png", bytes: onePixelPng });
    expect(result.contentType).toBe("image/png");
    expect(result.checksumSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects content-type spoofing and disguised dangerous extensions", () => {
    expect(() => validateUploadBytes({ type: "VERIFICATION", originalName: "identity.pdf", declaredContentType: "application/pdf", bytes: onePixelPng })).toThrow(/contents/i);
    expect(() => assertSafeUploadDeclaration("VERIFICATION", { originalName: "identity.exe.pdf", contentType: "application/pdf", sizeBytes: 100 })).toThrow(/dangerous/i);
  });

  it("rejects oversized declarations before issuing an upload reservation", () => {
    expect(() => assertSafeUploadDeclaration("CHECK_IN", { originalName: "arrival.png", contentType: "image/png", sizeBytes: 13 * 1024 * 1024 })).toThrow(/size/i);
  });

  it("fails closed when private storage is not explicitly enabled", () => {
    expect(() => assertRealUploadsConfigured({ APP_MODE: "pilot", REAL_UPLOADS_ENABLED: "false", BLOB_READ_WRITE_TOKEN: "" } as NodeJS.ProcessEnv)).toThrow(/disabled/i);
  });

  it("builds private, non-sniffable attachment download headers", () => {
    const headers = privateDownloadHeaders({ originalName: "evidence.pdf", contentType: "application/pdf", sizeBytes: 100, requestId: "request-a" });
    expect(headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(headers.get("x-content-type-options")).toBe("nosniff");
    expect(headers.get("content-disposition")).toContain("attachment");
  });
});
