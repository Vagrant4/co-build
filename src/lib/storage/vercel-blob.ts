import { BlobNotFoundError, del, get, head, list } from "@vercel/blob";
import type { PrivateStorageAdapter } from "./types";

export function createVercelBlobStorage(token = process.env.BLOB_READ_WRITE_TOKEN): PrivateStorageAdapter {
  if (!token) throw new Error("BLOB_READ_WRITE_TOKEN is required for private storage.");
  return {
    async get(objectKey) {
      const result = await get(objectKey, { access: "private", token, useCache: false });
      if (!result || result.statusCode !== 200) return null;
      return {
        stream: result.stream,
        contentType: result.blob.contentType,
        size: result.blob.size,
        etag: result.blob.etag
      };
    },
    async head(objectKey) {
      try {
        const result = await head(objectKey, { token });
        return { contentType: result.contentType, size: result.size, etag: result.etag };
      } catch (error) {
        if (error instanceof BlobNotFoundError) return null;
        throw error;
      }
    },
    async delete(objectKey) {
      await del(objectKey, { token });
    },
    async listKeys(prefix) {
      const keys: string[] = [];
      let cursor: string | undefined;
      do {
        const page = await list({ token, prefix, cursor, limit: 1000 });
        keys.push(...page.blobs.map((blob) => blob.pathname));
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
      return keys;
    }
  };
}
