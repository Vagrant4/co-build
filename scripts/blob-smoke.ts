import { runPrivateBlobSmoke } from "../src/lib/blob-smoke";

async function main() {
  const result = await runPrivateBlobSmoke();
  if (!result.ok) throw new Error(`Private Blob smoke failed: ${result.errorCode}`);
  console.log(JSON.stringify({ status: "ok", durationMs: result.durationMs }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Private Blob smoke failed.");
  process.exitCode = 1;
});
