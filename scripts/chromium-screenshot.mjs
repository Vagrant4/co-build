import { spawn } from "node:child_process";
import fs from "node:fs";

const [chromePath, url, outputPath, profileDir] = process.argv.slice(2);
if (!chromePath || !url || !outputPath || !profileDir) {
  console.error("Usage: node chromium-screenshot.mjs <chromePath> <url> <outputPath> <profileDir>");
  process.exit(2);
}

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
  `--screenshot=${outputPath}`,
  url
];

const child = spawn(chromePath, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
let stdout = "";
let stderr = "";
child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

const startedAt = Date.now();
let exitCode = null;
child.on("exit", (code) => { exitCode = code; });

function hasScreenshot() {
  try {
    return fs.statSync(outputPath).size > 10_000;
  } catch {
    return false;
  }
}

async function killTree() {
  if (exitCode !== null) return;
  await new Promise((resolve) => {
    const killer = spawn("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
    killer.on("exit", resolve);
    killer.on("error", resolve);
    setTimeout(resolve, 3000);
  });
}

while (Date.now() - startedAt < 25_000) {
  if (hasScreenshot()) {
    await killTree();
    console.log(`SCREENSHOT=${outputPath}`);
    process.exit(0);
  }
  if (exitCode !== null) break;
  await new Promise((resolve) => setTimeout(resolve, 250));
}

if (hasScreenshot()) {
  console.log(`SCREENSHOT=${outputPath}`);
  process.exit(0);
}

await killTree();
console.error(stdout.trim());
console.error(stderr.trim());
console.error(`Screenshot was not created: ${outputPath}`);
process.exit(1);
