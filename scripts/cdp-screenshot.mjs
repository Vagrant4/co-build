import { spawn } from "node:child_process";
import fs from "node:fs";

const [browserPath, url, outputPath, profileDir, requestedPort] = process.argv.slice(2);
if (!browserPath || !url || !outputPath || !profileDir) {
  console.error("Usage: node cdp-screenshot.mjs <browserPath> <url> <outputPath> <profileDir> [port]");
  process.exit(2);
}

const port = Number(requestedPort || 9225 + Math.floor(Math.random() * 400));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
fs.rmSync(outputPath, { force: true });
fs.mkdirSync(profileDir, { recursive: true });
fs.mkdirSync(outputPath.replace(/[\\/][^\\/]+$/, ""), { recursive: true });

const args = [
  "--headless=new",
  "--disable-gpu",
  "--no-sandbox",
  "--disable-extensions",
  "--disable-background-networking",
  "--disable-sync",
  "--disable-dev-shm-usage",
  "--hide-scrollbars",
  "--run-all-compositor-stages-before-draw",
  "--window-size=1920,1080",
  `--user-data-dir=${profileDir}`,
  `--remote-debugging-port=${port}`,
  "about:blank"
];

const browser = spawn(browserPath, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
let stderr = "";
browser.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

async function killTree() {
  if (browser.exitCode !== null) return;
  await new Promise((resolve) => {
    const killer = spawn("taskkill.exe", ["/PID", String(browser.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
    killer.on("exit", resolve);
    killer.on("error", resolve);
    setTimeout(resolve, 2500);
  });
}

async function fetchJson(endpoint) {
  const response = await fetch(`http://127.0.0.1:${port}${endpoint}`);
  if (!response.ok) throw new Error(`${endpoint} returned ${response.status}`);
  return response.json();
}

async function waitForDebugger() {
  let lastError;
  for (let i = 0; i < 80; i += 1) {
    try {
      return await fetchJson("/json/version");
    } catch (error) {
      lastError = error;
      if (browser.exitCode !== null) break;
      await sleep(250);
    }
  }
  throw lastError || new Error("Browser debugger did not start.");
}

function createCdp(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    const listeners = new Map();
    let id = 1;
    const timeout = setTimeout(() => reject(new Error("CDP WebSocket timeout")), 10000);

    ws.addEventListener("open", () => {
      clearTimeout(timeout);
      resolve({
        send(method, params = {}) {
          return new Promise((sendResolve, sendReject) => {
            const messageId = id++;
            pending.set(messageId, { resolve: sendResolve, reject: sendReject, method });
            ws.send(JSON.stringify({ id: messageId, method, params }));
            setTimeout(() => {
              if (pending.has(messageId)) {
                pending.delete(messageId);
                sendReject(new Error(`${method} timed out`));
              }
            }, 15000);
          });
        },
        once(method) {
          return new Promise((eventResolve) => {
            const queue = listeners.get(method) || [];
            queue.push(eventResolve);
            listeners.set(method, queue);
          });
        },
        close() {
          try { ws.close(); } catch {}
        }
      });
    });

    ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id && pending.has(message.id)) {
        const request = pending.get(message.id);
        pending.delete(message.id);
        if (message.error) request.reject(new Error(`${request.method} failed: ${message.error.message}`));
        else request.resolve(message.result || {});
        return;
      }
      if (message.method && listeners.has(message.method)) {
        const queue = listeners.get(message.method) || [];
        const listener = queue.shift();
        if (queue.length === 0) listeners.delete(message.method);
        if (listener) listener(message.params || {});
      }
    });
    ws.addEventListener("error", () => reject(new Error("CDP WebSocket error")));
  });
}

try {
  await waitForDebugger();
  const targets = await fetchJson("/json/list");
  const pageTarget = targets.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
  if (!pageTarget) throw new Error("No page target was available from Chrome debugger.");
  const cdp = await createCdp(pageTarget.webSocketDebuggerUrl);
  try {
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false
    });
    const loaded = cdp.once("Page.loadEventFired");
    await cdp.send("Page.navigate", { url });
    await Promise.race([loaded, sleep(8000)]);
    await sleep(2500);
    const screenshot = await cdp.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false
    });
    fs.writeFileSync(outputPath, Buffer.from(screenshot.data, "base64"));
    console.log(`SCREENSHOT=${outputPath}`);
  } finally {
    cdp.close();
  }
  await killTree();
  process.exit(0);
} catch (error) {
  await killTree();
  console.error(error.message || error);
  if (stderr.trim()) console.error(stderr.trim().split(/\r?\n/).slice(-20).join("\n"));
  process.exit(1);
}
