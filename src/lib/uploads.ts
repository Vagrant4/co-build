import type { UploadType } from "@prisma/client";
import { getAppMode } from "./app-mode";

export const DANGEROUS_UPLOAD_EXTENSIONS = new Set([
  "bat", "cmd", "com", "dll", "dmg", "exe", "hta", "html", "js", "jar", "lnk",
  "msi", "php", "ps1", "scr", "sh", "svg", "vbs", "xhtml", "xlsm", "docm", "zip"
]);

export type UploadPolicy = {
  allowedContentTypes: string[];
  allowedExtensions: string[];
  maximumSizeInBytes: number;
  imageOnly?: boolean;
};

const MiB = 1024 * 1024;

const policies: Record<UploadType, UploadPolicy> = {
  VERIFICATION: policy(["application/pdf", "image/jpeg", "image/png"], ["pdf", "jpg", "jpeg", "png"], 10),
  CHECK_IN: imagePolicy(12),
  CHECK_OUT: imagePolicy(12),
  LISTING_PHOTO: imagePolicy(12),
  FLOOR_PLAN: policy(["application/pdf", "image/jpeg", "image/png"], ["pdf", "jpg", "jpeg", "png"], 15),
  PAYMENT_EVIDENCE: policy(["application/pdf", "image/jpeg", "image/png"], ["pdf", "jpg", "jpeg", "png"], 10),
  DISPUTE_EVIDENCE: policy(["application/pdf", "image/jpeg", "image/png"], ["pdf", "jpg", "jpeg", "png"], 10),
  CONTRACT: policy(["application/pdf"], ["pdf"], 10)
};

function policy(allowedContentTypes: string[], allowedExtensions: string[], maximumMiB: number): UploadPolicy {
  return { allowedContentTypes, allowedExtensions, maximumSizeInBytes: maximumMiB * MiB };
}

function imagePolicy(maximumMiB: number): UploadPolicy {
  return { ...policy(["image/jpeg", "image/png", "image/webp"], ["jpg", "jpeg", "png", "webp"], maximumMiB), imageOnly: true };
}

export function getUploadPolicy(type: UploadType, environment: NodeJS.ProcessEnv = process.env): UploadPolicy {
  const configuredMaximum = Number(environment.MAX_UPLOAD_BYTES || Number.MAX_SAFE_INTEGER);
  const scannerMaximum = environment.MALWARE_SCANNER_PROVIDER === "cloudmersive" ? 3.5 * MiB : Number.MAX_SAFE_INTEGER;
  const base = policies[type];
  return { ...base, maximumSizeInBytes: Math.min(base.maximumSizeInBytes, configuredMaximum, scannerMaximum) };
}

export function assertRealUploadsConfigured(environment: NodeJS.ProcessEnv = process.env): void {
  if (environment.REAL_UPLOADS_ENABLED !== "true") {
    throw new Error("Private uploads are disabled until storage and scanning policy are configured.");
  }
  if (!environment.BLOB_READ_WRITE_TOKEN) throw new Error("Private Blob storage is not configured.");
  if (getAppMode(environment) !== "demo" && !environment.BLOB_READ_WRITE_TOKEN) {
    throw new Error("Pilot and production uploads require private Blob storage.");
  }
}

export function uploadsAreEnabled(environment: NodeJS.ProcessEnv = process.env): boolean {
  try {
    assertRealUploadsConfigured(environment);
    return true;
  } catch {
    return false;
  }
}

export function extensionOf(filename: string): string {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts.at(-1)! : "";
}

export function assertSafeUploadDeclaration(
  type: UploadType,
  file: { originalName: string; contentType: string; sizeBytes: number },
  environment: NodeJS.ProcessEnv = process.env
): UploadPolicy {
  const policyValue = getUploadPolicy(type, environment);
  const name = file.originalName.trim();
  if (!name || name.length > 180 || /[\\/\0]/.test(name)) throw new Error("Invalid upload filename.");
  if (!Number.isSafeInteger(file.sizeBytes) || file.sizeBytes <= 0 || file.sizeBytes > policyValue.maximumSizeInBytes) {
    throw new Error("File exceeds the permitted upload size.");
  }
  const extensions = name.toLowerCase().split(".").slice(1);
  const extension = extensionOf(name);
  if (!policyValue.allowedExtensions.includes(extension)) throw new Error("File extension is not permitted for this upload.");
  if (extensions.some((value) => DANGEROUS_UPLOAD_EXTENSIONS.has(value))) throw new Error("Dangerous or disguised file extension rejected.");
  if (!policyValue.allowedContentTypes.includes(file.contentType.toLowerCase())) throw new Error("Declared file type is not permitted.");
  return policyValue;
}

export function buildPrivateObjectKey(type: UploadType, ownerUserId: string, originalName: string): string {
  const extension = extensionOf(originalName);
  return `${getAppMode()}/${type.toLowerCase()}/${ownerUserId}/${crypto.randomUUID()}.${extension}`;
}

export function safeDownloadName(name: string): string {
  const sanitized = name.replace(/[^a-zA-Z0-9._ -]/g, "-").replace(/[\r\n"]/g, "-").trim();
  return sanitized.slice(0, 180) || "download";
}

export function privateDownloadHeaders(input: { originalName: string; contentType: string; sizeBytes: number; requestId: string }): Headers {
  return new Headers({
    "Content-Type": input.contentType || "application/octet-stream",
    "Content-Length": String(input.sizeBytes),
    "Content-Disposition": `attachment; filename="${safeDownloadName(input.originalName)}"`,
    "Cache-Control": "private, no-store, max-age=0",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "X-Content-Type-Options": "nosniff",
    "x-request-id": input.requestId
  });
}
