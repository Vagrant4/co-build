import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const [baseUrl, framesDir, summaryPath] = process.argv.slice(2);
if (!baseUrl || !framesDir || !summaryPath) {
  console.error("Usage: node record-real-deal-flow.mjs <baseUrl> <framesDir> <summaryPath>");
  process.exit(2);
}

const prisma = new PrismaClient();
const root = process.cwd();
const browserPath = path.join(process.env.LOCALAPPDATA || "", "ms-playwright", "chromium-1223", "chrome-win64", "chrome.exe");
const profileDir = path.join(framesDir, "..", "browser-profile-real-flow");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const frameLog = [];
let frameIndex = 1;
let browser;
let cdp;

const hostEmail = "live.host.flow@example.com";
const renterEmail = "live.renter.flow@example.com";
const flowTitle = `Live Flow Bay ${Date.now()}`;
const demoPng = path.join(framesDir, "..", "demo-upload.png");

function ensureDirs() {
  fs.mkdirSync(framesDir, { recursive: true });
  fs.rmSync(profileDir, { recursive: true, force: true });
  fs.mkdirSync(profileDir, { recursive: true });
  if (!fs.existsSync(demoPng)) {
    fs.writeFileSync(
      demoPng,
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
        "base64"
      )
    );
  }
}

async function cleanupFlowData() {
  const users = await prisma.user.findMany({ where: { email: { in: [hostEmail, renterEmail] } }, select: { id: true } });
  const userIds = users.map((user) => user.id);
  const listings = await prisma.listing.findMany({ where: { OR: [{ title: { startsWith: "Live Flow Bay" } }, { hostId: { in: userIds } }] }, select: { id: true } });
  const listingIds = listings.map((listing) => listing.id);
  const bookings = await prisma.booking.findMany({ where: { OR: [{ userId: { in: userIds } }, { listingId: { in: listingIds } }] }, select: { id: true } });
  const bookingIds = bookings.map((booking) => booking.id);

  await prisma.approvalEvent.deleteMany({ where: { OR: [{ actorId: { in: userIds } }, { listingId: { in: listingIds } }, { bookingId: { in: bookingIds } }] } });
  await prisma.bookingMessage.deleteMany({ where: { OR: [{ senderId: { in: userIds } }, { bookingId: { in: bookingIds } }] } });
  await prisma.listingMessage.deleteMany({ where: { OR: [{ senderId: { in: userIds } }, { listingId: { in: listingIds } }] } });
  await prisma.additionalRequirement.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { bookingId: { in: bookingIds } }] } });
  await prisma.bookingAddon.deleteMany({ where: { bookingId: { in: bookingIds } } });
  await prisma.upload.deleteMany({ where: { OR: [{ userId: { in: userIds } }, { bookingId: { in: bookingIds } }, { listingId: { in: listingIds } }] } });
  await prisma.booking.deleteMany({ where: { id: { in: bookingIds } } });
  await prisma.listingEquipment.deleteMany({ where: { listingId: { in: listingIds } } });
  await prisma.listing.deleteMany({ where: { id: { in: listingIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}

async function launchBrowser() {
  if (!fs.existsSync(browserPath)) throw new Error(`Chromium was not found at ${browserPath}`);
  const port = 9600 + Math.floor(Math.random() * 300);
  browser = spawn(browserPath, [
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
  ], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });

  browser.stderr.on("data", () => {});
  await waitForDebugger(port);
  const targets = await fetchJson(port, "/json/list");
  const pageTarget = targets.find((target) => target.type === "page" && target.webSocketDebuggerUrl);
  if (!pageTarget) throw new Error("No page target was available from Chrome debugger.");
  cdp = await createCdp(pageTarget.webSocketDebuggerUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");
  await cdp.send("DOM.enable");
  await cdp.send("Emulation.setDeviceMetricsOverride", { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
}

async function waitForDebugger(port) {
  let lastError;
  for (let i = 0; i < 80; i++) {
    try { return await fetchJson(port, "/json/version"); }
    catch (error) { lastError = error; await sleep(250); }
  }
  throw lastError || new Error("Browser debugger did not start.");
}

async function fetchJson(port, endpoint) {
  const response = await fetch(`http://127.0.0.1:${port}${endpoint}`);
  if (!response.ok) throw new Error(`${endpoint} returned ${response.status}`);
  return response.json();
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
        close() { try { ws.close(); } catch {} }
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

async function navigate(url) {
  const loaded = cdp.once("Page.loadEventFired");
  await cdp.send("Page.navigate", { url });
  await Promise.race([loaded, sleep(10000)]);
  await settle();
}

async function settle() {
  await sleep(1000);
  await evaluate(`window.scrollTo(0, 0);`);
  await sleep(350);
}

async function evaluate(expression) {
  const result = await cdp.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text || JSON.stringify(result.exceptionDetails));
  }
  return result.result?.value;
}

async function submitAndWait(expression, waitMs = 1800) {
  await evaluate(expression);
  await sleep(waitMs);
  await settle();
}

async function capture(label, urlPath = null, duration = 4) {
  if (urlPath) await navigate(`${baseUrl}${urlPath}`);
  await settle();
  const screenshot = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
  const framePath = path.join(framesDir, `frame-${String(frameIndex).padStart(2, "0")}.png`);
  fs.writeFileSync(framePath, Buffer.from(screenshot.data, "base64"));
  const visual = await imageLooksVisual(framePath);
  if (!visual.ok) throw new Error(`Frame is blank for ${label}: ${JSON.stringify(visual)}`);
  frameLog.push({ index: frameIndex, label, framePath, duration, avg: visual.avg, bright: visual.bright });
  console.log(`FRAME ${String(frameIndex).padStart(2, "0")} ${label} avg=${visual.avg.toFixed(2)} bright=${visual.bright}`);
  frameIndex += 1;
}

async function imageLooksVisual(filePath) {
  const ps = `Add-Type -AssemblyName System.Drawing; $p=${JSON.stringify(filePath)}; $s=[System.IO.File]::Open($p,[System.IO.FileMode]::Open,[System.IO.FileAccess]::Read,[System.IO.FileShare]::ReadWrite); try { $b=[System.Drawing.Bitmap]::FromStream($s); try { $sum=0; $bright=0; $count=0; for($x=0;$x -lt $b.Width;$x += [Math]::Max(1,[int]($b.Width/24))){ for($y=0;$y -lt $b.Height;$y += [Math]::Max(1,[int]($b.Height/24))){$px=$b.GetPixel($x,$y);$v=($px.R+$px.G+$px.B)/3;$sum+=$v;if($v -gt 12){$bright++};$count++ }}; $avg=$sum/[Math]::Max(1,$count); Write-Output (([string][Math]::Round($avg,2)) + ',' + $bright + ',' + $count) } finally { $b.Dispose() } } finally { $s.Dispose() }`;
  const out = await runCommand("powershell", ["-NoProfile", "-Command", ps]);
  const [avgText, brightText, countText] = out.trim().split(",");
  const avg = Number(avgText);
  const bright = Number(brightText);
  const count = Number(countText);
  return { ok: avg > 8 && bright > 20, avg, bright, count };
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("exit", (code) => code === 0 ? resolve(stdout) : reject(new Error(stderr || stdout || `${command} exited ${code}`)));
  });
}

async function formFillAndSubmit(selector, values) {
  await submitAndWait(`(() => {
    const form = document.querySelector(${JSON.stringify(selector)});
    if (!form) throw new Error('Form not found: ${selector}');
    const values = ${JSON.stringify(values)};
    for (const [name, value] of Object.entries(values)) {
      const field = form.querySelector('[name="' + name + '"]');
      if (!field) throw new Error('Field not found: ' + name);
      if (field.type === 'checkbox') field.checked = Boolean(value);
      else field.value = value;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
    }
    form.requestSubmit();
  })()`);
}

async function registerAccount(role, values) {
  await navigate(`${baseUrl}/create-account?role=${role.toLowerCase()}`);
  await capture(`${role} registration form`, null, 3);
  await formFillAndSubmit('form', values);
  const user = await prisma.user.findUniqueOrThrow({ where: { email: values.email.toLowerCase() } });
  await capture(`${role} registered dashboard`, `/${role === "HOST" ? "dashboard/host" : "dashboard/user"}?account=${user.id}&created=1`, 4);
  return user;
}

async function submitSubscription(role, userId) {
  const pathPrefix = role === "HOST" ? "dashboard/host" : "dashboard/user";
  await navigate(`${baseUrl}/${pathPrefix}?account=${userId}`);
  await submitAndWait(`(() => {
    const form = [...document.forms].find((candidate) => candidate.querySelector('input[name="userId"][value="${userId}"]') && candidate.textContent.includes('Start Stripe checkout'));
    if (!form) throw new Error('Subscription form not found for ${userId}');
    form.requestSubmit();
  })()`);
  await capture(`${role} submitted S$5 recurring subscription`, `/${pathPrefix}?account=${userId}&subscription=submitted`, 4);
}

async function adminActivateUser(userId, label) {
  await capture(`Admin reviews ${label}`, `/dashboard/admin`, 4);
  await submitAndWait(`(() => {
    const form = [...document.forms].find((candidate) => candidate.querySelector('input[name="userId"][value="${userId}"]') && candidate.textContent.includes('Activate Stripe'));
    if (!form) throw new Error('Activate subscription form not found for ${userId}');
    form.requestSubmit();
  })()`);
  await submitAndWait(`(() => {
    const forms = [...document.forms].filter((candidate) => candidate.querySelector('input[name="userId"][value="${userId}"]') && candidate.querySelector('select[name="verificationStatus"]'));
    const form = forms[0];
    if (!form) throw new Error('Verification form not found for ${userId}');
    form.querySelector('select[name="verificationStatus"]').value = 'APPROVED';
    form.requestSubmit();
  })()`);
  await capture(`Admin activated and verified ${label}`, `/dashboard/admin`, 4);
}

async function hostCreatesListing(hostId) {
  await navigate(`${baseUrl}/dashboard/host/listings/new?account=${hostId}`);
  await capture("Host listing form selected to new host", null, 4);
  await submitAndWait(`(() => {
    const form = document.querySelector('form.co-build-form');
    if (!form) throw new Error('Listing form not found');
    const set = (name, value) => {
      const field = form.querySelector('[name="' + name + '"]');
      if (!field) throw new Error('Missing field ' + name);
      field.value = value;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
    };
    set('title', ${JSON.stringify(flowTitle)});
    set('sizeSqft', '420');
    set('location', 'Kranji');
    set('address', 'Kranji Industrial Estate, Singapore');
    set('electricalSupply', 'Three-phase ready outlets and isolated bench sockets');
    set('powerType', 'THREE_PHASE');
    set('accessHours', '7am-11pm daily by booking slot');
    set('fireSafety', 'Extinguishers, spill kit, and marked exit path');
    set('loadingAccess', 'ramp\\nlorry access\\ncargo lift');
    set('amenities', 'Workbench\\nWi-Fi\\nWaste bins\\nPallet staging area');
    set('permittedWork', 'Assembly\\nPacking\\nLight fabrication\\nElectronics\\nStorage + work area');
    set('restrictedWork', 'Welding\\nSpray painting, approval-only\\nChemical work, approval-only');
    set('priceDay', '180');
    set('priceSevenDays', '980');
    set('priceThirtyDays', '2200');
    set('priceSixtyDays', '4100');
    set('depositStandard', '900');
    set('depositHighRisk', '500');
    set('cleaningFee', '140');
    for (const checkbox of form.querySelectorAll('input[type="checkbox"]')) checkbox.checked = false;
    for (const value of ['B1', 'workbench', 'power-tools', 'drill', 'material-storage']) {
      const checkbox = form.querySelector('input[value="' + value + '"]');
      if (checkbox) checkbox.checked = true;
    }
    form.requestSubmit();
  })()`, 2500);
  const listing = await prisma.listing.findFirstOrThrow({ where: { title: flowTitle, hostId }, orderBy: { createdAt: "desc" } });
  await capture("Host submitted listing pending admin approval", `/dashboard/host?account=${hostId}&listing=submitted`, 4);
  return listing;
}

async function adminApproveListing(listingId) {
  await capture("Admin sees host listing pending", "/dashboard/admin", 4);
  await submitAndWait(`(() => {
    const form = [...document.forms].find((candidate) => candidate.querySelector('input[name="listingId"][value="${listingId}"]') && candidate.querySelector('input[name="status"][value="APPROVED"]'));
    if (!form) throw new Error('Approve listing form not found');
    form.requestSubmit();
  })()`);
  await capture("Admin approved listing", "/dashboard/admin", 4);
}

async function listingPreDealChat(slug, renterId, hostId) {
  await navigate(`${baseUrl}/listings/${slug}?account=${renterId}`);
  await capture("Renter opens approved listing and pre-deal chat", null, 4);
  await submitAndWait(`(() => {
    const form = document.querySelector('[data-listing-chat] form');
    if (!form) throw new Error('Listing chat form not found');
    form.querySelector('textarea[name="message"]').value = 'Can I use the bay tomorrow for assembly and packing? I need ramp loading and power tools.';
    form.requestSubmit();
  })()`);
  await capture("Renter sent pre-deal chat without contact details", `/listings/${slug}?account=${renterId}`, 4);
  await navigate(`${baseUrl}/dashboard/host?account=${hostId}`);
  await submitAndWait(`(() => {
    const chat = document.querySelector('[data-listing-chat]');
    const details = chat?.querySelector('details');
    if (details) details.open = true;
    const form = chat?.querySelector('form');
    if (!form) throw new Error('Host listing reply form not found');
    form.querySelector('textarea[name="message"]').value = 'Yes, the slot is available. Ramp loading and power tools are ready; please submit the booking request on-platform.';
    form.requestSubmit();
  })()`);
  await capture("Host replied in listing chat", `/dashboard/host?account=${hostId}`, 4);
}

async function renterBooks(slug, renterId) {
  await navigate(`${baseUrl}/checkout/${slug}?account=${renterId}`);
  await capture("Renter opens checkout", null, 4);
  await submitAndWait(`(() => {
    const form = document.querySelector('form');
    if (!form) throw new Error('Checkout form not found');
    form.querySelector('select[name="durationDays"]').value = '7';
    form.querySelector('select[name="workType"]').value = 'Assembly';
    const workbench = form.querySelector('input[name="addons"][value="workbench"]');
    if (workbench) workbench.checked = true;
    const drill = form.querySelector('input[name="addons"][value="drill"]');
    if (drill) drill.checked = true;
    form.querySelector('input[name="safetyAccepted"]').checked = true;
    form.requestSubmit();
  })()`, 2500);
  const booking = await prisma.booking.findFirstOrThrow({ where: { userId: renterId, listing: { slug } }, orderBy: { createdAt: "desc" } });
  await capture("Renter submitted booking request", `/dashboard/user?account=${renterId}&booking=submitted`, 4);
  return booking;
}

async function bookingChatAndApproval(bookingId, renterId, hostId) {
  await submitAndWait(`(() => {
    const form = [...document.forms].find((candidate) => candidate.querySelector('input[name="bookingId"][value="${bookingId}"]') && candidate.querySelector('input[name="senderRole"][value="RENTER"]') && candidate.querySelector('textarea[name="message"]'));
    if (!form) throw new Error('Renter booking chat form not found');
    form.querySelector('textarea[name="message"]').value = 'Booking submitted. Please confirm access window and deposit/payment steps here.';
    form.requestSubmit();
  })()`);
  await capture("Renter sent booking chat", `/dashboard/user?account=${renterId}`, 4);
  await navigate(`${baseUrl}/dashboard/host?account=${hostId}`);
  await submitAndWait(`(() => {
    const form = [...document.forms].find((candidate) => candidate.querySelector('input[name="bookingId"][value="${bookingId}"]') && candidate.querySelector('input[name="senderRole"][value="HOST"]') && candidate.querySelector('textarea[name="message"]'));
    if (!form) throw new Error('Host booking chat form not found');
    form.querySelector('textarea[name="message"]').value = 'Access approved for 7am-11pm. Keep PPE on and upload check-in/out photos after payment.';
    form.requestSubmit();
  })()`);
  await submitAndWait(`(() => {
    const form = [...document.forms].find((candidate) => candidate.querySelector('input[name="bookingId"][value="${bookingId}"]') && candidate.querySelector('input[name="action"][value="HOST_APPROVE"]'));
    if (!form) throw new Error('Host approve booking form not found');
    form.requestSubmit();
  })()`);
  await capture("Host approved booking for payment", `/dashboard/host?account=${hostId}`, 4);
}

async function paymentAndAddOn(bookingId, renterId, hostId) {
  await navigate(`${baseUrl}/dashboard/user?account=${renterId}`);
  await submitAndWait(`(() => {
    const form = [...document.forms].find((candidate) => candidate.querySelector('input[name="bookingId"][value="${bookingId}"]') && candidate.textContent.includes('Pay with Stripe'));
    if (!form) throw new Error('Payment form not found');
    form.requestSubmit();
  })()`);
  await capture("Renter paid rental, deposit, cleaning fee, and add-ons", `/dashboard/user?account=${renterId}`, 4);
  await submitAndWait(`(() => {
    const form = [...document.forms].find((candidate) => candidate.querySelector('input[name="bookingId"][value="${bookingId}"]') && candidate.querySelector('textarea[name="additionalDetail"]'));
    if (!form) throw new Error('Additional requirement form not found');
    form.querySelector('textarea[name="additionalDetail"]').value = 'Need two extra evening hours and temporary material storage for packed goods.';
    form.requestSubmit();
  })()`, 2000);
  const request = await prisma.additionalRequirement.findFirstOrThrow({ where: { bookingId }, orderBy: { createdAt: "desc" } });
  await capture("Renter requested additional requirement", `/dashboard/user?account=${renterId}&additional=submitted`, 4);
  await navigate(`${baseUrl}/dashboard/host?account=${hostId}`);
  await submitAndWait(`(() => {
    const form = [...document.forms].find((candidate) => candidate.querySelector('input[name="requestId"][value="${request.id}"]') && candidate.querySelector('input[name="quotedRate"]'));
    if (!form) throw new Error('Approve add-on form not found');
    form.querySelector('input[name="quotedRate"]').value = '220';
    form.requestSubmit();
  })()`, 2000);
  await capture("Host approved additional rate and generated contract", `/dashboard/host?account=${hostId}&additional=approved`, 4);
  await navigate(`${baseUrl}/dashboard/user?account=${renterId}`);
  await submitAndWait(`(() => {
    const form = [...document.forms].find((candidate) => candidate.querySelector('input[name="requestId"][value="${request.id}"]') && candidate.textContent.includes('Pay add-on'));
    if (!form) throw new Error('Pay add-on form not found');
    form.requestSubmit();
  })()`, 2000);
  await capture("Renter paid additional requirement contract", `/dashboard/user?account=${renterId}&additional=paid`, 4);
}

async function confirmAndClose(bookingId, renterId, hostId) {
  await navigate(`${baseUrl}/dashboard/user?account=${renterId}`);
  await submitAndWait(`(() => {
    const form = [...document.forms].find((candidate) => candidate.querySelector('input[name="bookingId"][value="${bookingId}"]') && candidate.querySelector('input[name="role"][value="RENTER"]'));
    if (!form) throw new Error('Renter confirm deal form not found');
    form.requestSubmit();
  })()`);
  await capture("Renter confirmed deal on-platform", `/dashboard/user?account=${renterId}`, 4);
  await navigate(`${baseUrl}/dashboard/host?account=${hostId}`);
  await submitAndWait(`(() => {
    const form = [...document.forms].find((candidate) => candidate.querySelector('input[name="bookingId"][value="${bookingId}"]') && candidate.querySelector('input[name="role"][value="HOST"]'));
    if (!form) throw new Error('Host confirm deal form not found');
    form.requestSubmit();
  })()`);
  await capture("Host confirmed deal - deal closed", `/dashboard/host?account=${hostId}`, 5);
  await capture("Admin sees confirmed paid deal and event log", "/dashboard/admin", 5);
}

async function buildSummary(finalState) {
  const lines = [
    "# Co-Build Real Live Deal Flow",
    "",
    "This recording was generated by driving the real Next.js UI in a browser session from registration to a closed deal.",
    "",
    `Host: ${finalState.host.fullName} (${finalState.host.email})`,
    `Renter: ${finalState.renter.fullName} (${finalState.renter.email})`,
    `Listing: ${finalState.listing.title} (${finalState.listing.slug})`,
    `Booking: ${finalState.booking.id} - ${finalState.booking.status}`,
    `Deal status: renter=${Boolean(finalState.booking.renterDealConfirmedAt)}, host=${Boolean(finalState.booking.hostDealConfirmedAt)}`,
    "",
    "## Frames",
    ...frameLog.map((frame) => `${String(frame.index).padStart(2, "0")}. ${frame.label} (${frame.duration}s, avg=${frame.avg.toFixed(2)}, bright=${frame.bright})`)
  ];
  fs.writeFileSync(summaryPath, `${lines.join("\n")}\n`);
}

async function killBrowser() {
  if (!browser || browser.exitCode !== null) return;
  await new Promise((resolve) => {
    const killer = spawn("taskkill.exe", ["/PID", String(browser.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" });
    killer.on("exit", resolve);
    killer.on("error", resolve);
    setTimeout(resolve, 2500);
  });
}

async function main() {
  ensureDirs();
  await cleanupFlowData();
  await launchBrowser();

  const host = await registerAccount("HOST", {
    role: "HOST",
    fullName: "Avery Host Flow",
    mobile: "+65 8000 7001",
    email: hostEmail,
    companyName: "Avery Industrial Spaces",
    uen: "202670001H",
    workType: "Workspace operations"
  });
  await submitSubscription("HOST", host.id);

  const renter = await registerAccount("RENTER", {
    role: "RENTER",
    fullName: "Mira Renter Flow",
    mobile: "+65 8000 7002",
    email: renterEmail,
    companyName: "Mira Product Build Team",
    uen: "202670002R",
    workType: "Assembly"
  });
  await submitSubscription("RENTER", renter.id);

  await adminActivateUser(host.id, "host subscription and verification");
  await adminActivateUser(renter.id, "renter subscription and verification");

  const listing = await hostCreatesListing(host.id);
  await adminApproveListing(listing.id);
  await listingPreDealChat(listing.slug, renter.id, host.id);
  const booking = await renterBooks(listing.slug, renter.id);
  await bookingChatAndApproval(booking.id, renter.id, host.id);
  await paymentAndAddOn(booking.id, renter.id, host.id);
  await confirmAndClose(booking.id, renter.id, host.id);

  const finalBooking = await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } });
  const finalListing = await prisma.listing.findUniqueOrThrow({ where: { id: listing.id } });
  await buildSummary({ host, renter, listing: finalListing, booking: finalBooking });
  console.log(`SUMMARY=${summaryPath}`);
}

main()
  .catch((error) => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { cdp?.close(); } catch {}
    await killBrowser();
    await prisma.$disconnect();
    if (!process.exitCode) process.exit(0);
  });
