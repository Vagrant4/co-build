const endpoint = required("MALWARE_SCANNER_URL");
const token = required("MALWARE_SCANNER_TOKEN");
const scanner = new URL(endpoint);
if (scanner.protocol !== "https:" && process.env.ALLOW_LOCAL_SCANNER_HTTP !== "true") throw new Error("Scanner verification requires HTTPS unless ALLOW_LOCAL_SCANNER_HTTP=true.");

const clean = await scan(Buffer.from("SpaceOnCall harmless scanner verification."));
if (clean.safe !== true) throw new Error("Scanner rejected the harmless control payload.");

// EICAR is an industry-standard harmless antivirus test string, not executable malware.
const eicar = Buffer.from("X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*");
const detected = await scan(eicar);
if (detected.safe !== false) throw new Error("Scanner did not detect the EICAR antivirus test string.");

console.log(JSON.stringify({ checkedAt: new Date().toISOString(), cleanControlAccepted: true, eicarDetected: true }, null, 2));

async function scan(bytes) {
  const response = await fetch(scanner, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/octet-stream", "Content-Length": String(bytes.length) },
    body: bytes,
    signal: AbortSignal.timeout(30_000)
  });
  if (!response.ok) throw new Error(`Scanner returned HTTP ${response.status}.`);
  return response.json();
}

function required(key) {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`${key} is required.`);
  return value;
}
