import { del, get, put } from "@vercel/blob";

export type BlobSmokeResult = { ok: true; durationMs: number } | { ok: false; durationMs: number; errorCode: string };

export async function runPrivateBlobSmoke(): Promise<BlobSmokeResult> {
  if (!process.env.BLOB_READ_WRITE_TOKEN && !process.env.BLOB_STORE_ID) {
    return { ok: false, durationMs: 0, errorCode: "BLOB_NOT_CONFIGURED" };
  }
  const startedAt = Date.now();
  const pathname = `ops-smoke/${crypto.randomUUID()}.txt`;
  const expected = `co-build-private-smoke:${crypto.randomUUID()}`;
  let storedPath: string | undefined;
  try {
    const blob = await put(pathname, Buffer.from(expected), { access: "private", addRandomSuffix: false, contentType: "text/plain" });
    storedPath = blob.pathname;
    const stored = await get(blob.pathname, { access: "private", useCache: false });
    if (!stored || stored.statusCode !== 200) throw new Error("BLOB_READ_FAILED");
    const received = await new Response(stored.stream).text();
    if (received !== expected) throw new Error("BLOB_INTEGRITY_FAILED");
    return { ok: true, durationMs: Date.now() - startedAt };
  } catch (error) {
    return {
      ok: false,
      durationMs: Date.now() - startedAt,
      errorCode: error instanceof Error ? error.message.slice(0, 80) : "BLOB_SMOKE_FAILED"
    };
  } finally {
    if (storedPath) await del(storedPath).catch(() => undefined);
  }
}
