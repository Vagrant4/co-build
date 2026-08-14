import { createServer } from "node:http";
import { createConnection } from "node:net";
import { timingSafeEqual } from "node:crypto";

const PORT = positiveInteger(process.env.PORT, 8080);
const MAX_SCAN_BYTES = Math.min(positiveInteger(process.env.MAX_SCAN_BYTES, 16 * 1024 * 1024), 25 * 1024 * 1024);
const SCAN_TIMEOUT_MS = Math.min(positiveInteger(process.env.SCAN_TIMEOUT_MS, 15_000), 30_000);

export function parseClamResponse(response) {
  const normalized = String(response).replaceAll("\0", "").trim();
  if (/: OK$/i.test(normalized) || normalized === "OK") return { safe: true, signature: null };
  const infected = normalized.match(/:\s*(.+)\s+FOUND$/i);
  if (infected) return { safe: false, signature: infected[1].slice(0, 120) };
  throw new Error("ClamAV returned an invalid or incomplete scan result.");
}

export function isAuthorized(header, expectedToken) {
  if (!expectedToken || !header?.startsWith("Bearer ")) return false;
  const provided = Buffer.from(header.slice(7));
  const expected = Buffer.from(expectedToken);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export async function scanBytes(bytes, options = {}) {
  const host = options.host || process.env.CLAMD_HOST || "127.0.0.1";
  const port = options.port || positiveInteger(process.env.CLAMD_PORT, 3310);
  const timeoutMs = options.timeoutMs || SCAN_TIMEOUT_MS;
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host, port });
    const responses = [];
    const fail = (error) => {
      socket.destroy();
      reject(error instanceof Error ? error : new Error("ClamAV connection failed."));
    };
    socket.setTimeout(timeoutMs, () => fail(new Error("ClamAV scan timed out.")));
    socket.on("error", fail);
    socket.on("data", (chunk) => responses.push(chunk));
    socket.on("end", () => {
      try {
        resolve(parseClamResponse(Buffer.concat(responses).toString("utf8")));
      } catch (error) {
        reject(error);
      }
    });
    socket.on("connect", () => {
      socket.write("zINSTREAM\0");
      for (let offset = 0; offset < bytes.length; offset += 64 * 1024) {
        const chunk = bytes.subarray(offset, Math.min(offset + 64 * 1024, bytes.length));
        const length = Buffer.allocUnsafe(4);
        length.writeUInt32BE(chunk.length);
        socket.write(length);
        socket.write(chunk);
      }
      socket.end(Buffer.alloc(4));
    });
  });
}

export async function clamPing(options = {}) {
  const host = options.host || process.env.CLAMD_HOST || "127.0.0.1";
  const port = options.port || positiveInteger(process.env.CLAMD_PORT, 3310);
  return new Promise((resolve) => {
    const socket = createConnection({ host, port });
    let response = "";
    const finish = (value) => {
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(2_000, () => finish(false));
    socket.on("error", () => finish(false));
    socket.on("data", (chunk) => { response += String(chunk); });
    socket.on("end", () => finish(response.replaceAll("\0", "").trim() === "PONG"));
    socket.on("connect", () => socket.end("zPING\0"));
  });
}

export function createScannerServer(options = {}) {
  const token = options.token ?? process.env.SCANNER_TOKEN;
  const scanner = options.scanner || scanBytes;
  return createServer(async (request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    if (request.method === "GET" && request.url === "/health") {
      const healthy = await (options.healthCheck || clamPing)();
      return json(response, healthy ? 200 : 503, { status: healthy ? "ok" : "degraded" });
    }
    if (request.method !== "POST" || request.url !== "/scan") return json(response, 404, { error: "Not found." });
    if (!isAuthorized(request.headers.authorization, token)) return json(response, 401, { error: "Unauthorized." });
    const declaredLength = Number(request.headers["content-length"] || "0");
    if (!Number.isSafeInteger(declaredLength) || declaredLength < 1 || declaredLength > MAX_SCAN_BYTES) return json(response, 413, { error: "File exceeds the scan limit." });
    try {
      const bytes = await readBoundedBody(request, MAX_SCAN_BYTES);
      const result = await scanner(bytes);
      return json(response, 200, result.safe ? { safe: true } : { safe: false, threat: result.signature || "MALWARE_DETECTED" });
    } catch (error) {
      console.error(JSON.stringify({ level: "error", event: "scan_failed", errorName: error instanceof Error ? error.name : "Unknown" }));
      return json(response, 503, { error: "Scanning is temporarily unavailable." });
    }
  });
}

async function readBoundedBody(request, maximumBytes) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > maximumBytes) throw new Error("Scan body exceeded the configured limit.");
    chunks.push(chunk);
  }
  if (!total) throw new Error("Scan body is empty.");
  return Buffer.concat(chunks, total);
}

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function json(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

if (process.argv[1] && new URL(import.meta.url).pathname.endsWith(process.argv[1].replaceAll("\\", "/"))) {
  if (!process.env.SCANNER_TOKEN || process.env.SCANNER_TOKEN.length < 32) throw new Error("SCANNER_TOKEN must contain at least 32 characters.");
  const server = createScannerServer();
  server.requestTimeout = 35_000;
  server.headersTimeout = 10_000;
  server.listen(PORT, "0.0.0.0", () => console.log(JSON.stringify({ level: "info", event: "scanner_ready", port: PORT, maximumBytes: MAX_SCAN_BYTES })));
}
