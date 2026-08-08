import { assertRealUploadsConfigured } from "../uploads";
import { createVercelBlobStorage } from "./vercel-blob";

export function privateStorage() {
  assertRealUploadsConfigured();
  return createVercelBlobStorage();
}

export type { PrivateObject, PrivateObjectMetadata, PrivateStorageAdapter } from "./types";
