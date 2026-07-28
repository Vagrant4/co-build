import { del, get, put } from "@vercel/blob";

const pathname = `ci-smoke/${crypto.randomUUID()}.txt`;
const contents = Buffer.from("co-build-private-smoke");

async function main() {
  const blob = await put(pathname, contents, { access: "private", addRandomSuffix: false, contentType: "text/plain" });
  try {
    const stored = await get(blob.pathname, { access: "private", useCache: false });
    if (!stored || stored.statusCode !== 200) throw new Error("Private Blob smoke read failed.");
    const received = new Uint8Array(await new Response(stored.stream).arrayBuffer());
    if (new TextDecoder().decode(received) !== "co-build-private-smoke") throw new Error("Private Blob smoke integrity check failed.");
    console.log("Private Blob upload/read verification passed.");
  } finally {
    await del(blob.pathname);
  }
}

main();
