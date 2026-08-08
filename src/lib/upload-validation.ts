import { createHash } from "node:crypto";
import sharp from "sharp";
import type { UploadType } from "@prisma/client";
import { assertSafeUploadDeclaration, extensionOf } from "./uploads";

const MAX_IMAGE_DIMENSION = 20_000;

export type ValidatedUpload = {
  contentType: string;
  sizeBytes: number;
  checksumSha256: string;
};

export async function validateUploadBytes(input: {
  type: UploadType;
  originalName: string;
  declaredContentType: string;
  bytes: Uint8Array;
  environment?: NodeJS.ProcessEnv;
}): Promise<ValidatedUpload> {
  const policy = assertSafeUploadDeclaration(input.type, {
    originalName: input.originalName,
    contentType: input.declaredContentType,
    sizeBytes: input.bytes.byteLength
  }, input.environment);
  const detected = detectContentType(input.bytes);
  if (!detected || !policy.allowedContentTypes.includes(detected)) throw new Error("File contents do not match an allowed format.");
  if (detected !== normalizeDeclaredMime(input.declaredContentType)) throw new Error("Declared file type does not match the file contents.");
  if (!extensionMatchesMime(extensionOf(input.originalName), detected)) throw new Error("File extension does not match the file contents.");

  if (detected.startsWith("image/")) {
    const dimensions = await sharp(input.bytes, { failOn: "error", limitInputPixels: MAX_IMAGE_DIMENSION * MAX_IMAGE_DIMENSION }).metadata();
    if (!dimensions.width || !dimensions.height || dimensions.width > MAX_IMAGE_DIMENSION || dimensions.height > MAX_IMAGE_DIMENSION) {
      throw new Error("Image dimensions are invalid or exceed the safety limit.");
    }
  }

  return {
    contentType: detected,
    sizeBytes: input.bytes.byteLength,
    checksumSha256: createHash("sha256").update(input.bytes).digest("hex")
  };
}

function detectContentType(bytes: Uint8Array): string | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "image/webp";
  if (ascii(bytes, 0, 5) === "%PDF-") return "application/pdf";
  return null;
}

function normalizeDeclaredMime(value: string): string {
  return value.toLowerCase() === "image/jpg" ? "image/jpeg" : value.toLowerCase();
}

function extensionMatchesMime(extension: string, mime: string): boolean {
  if (mime === "image/jpeg") return extension === "jpg" || extension === "jpeg";
  if (mime === "image/png") return extension === "png";
  if (mime === "image/webp") return extension === "webp";
  if (mime === "application/pdf") return extension === "pdf";
  return false;
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return signature.every((value, index) => bytes[index] === value);
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.slice(start, end));
}
