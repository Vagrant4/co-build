const { mkdirSync } = require("node:fs");
const { chromium } = require("playwright");

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";

async function main() {
  mkdirSync("verification", { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  page.setDefaultTimeout(15000);
  const results = [];

  async function check(name, fn) {
    try {
      await fn();
      results.push({ name, ok: true });
    } catch (error) {
      results.push({ name, ok: false, error: error instanceof Error ? error.message : String(error) });
    }
  }

  await check("homepage hero and CTAs", async () => {
    const consoleErrors = [];
    const collectConsoleError = (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    };
    const collectPageError = (error) => {
      consoleErrors.push(error instanceof Error ? error.message : String(error));
    };
    page.on("console", collectConsoleError);
    page.on("pageerror", collectPageError);
    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: /Rent a fabrication bay/i }).waitFor();
    await page.getByRole("link", { name: /Find a Space/i }).first().waitFor();
    await page.screenshot({ path: "verification/homepage.png", fullPage: true });
    page.off("console", collectConsoleError);
    page.off("pageerror", collectPageError);
    if (consoleErrors.length) {
      throw new Error(`Homepage console errors: ${consoleErrors.join(" | ")}`);
    }
  });

  await check("brand logo uses refined Co-Build SVG identity", async () => {
    for (const path of ["/", "/pricing", "/dashboard/host/listings/new", "/create-account"]) {
      await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
      await page.locator("header").getByText("Co-Build", { exact: true }).waitFor();
      await page.locator(".co-build-logo svg").first().waitFor();
      const body = await page.locator("body").innerText();
      if (body.includes("FabBay SG")) {
        throw new Error(`${path} still shows old FabBay SG brand`);
      }
    }
    await page.locator("main .co-build-logo svg").first().waitFor();
  });

  await check("host listing form uses Co-Build signal sections", async () => {
    await page.goto(`${baseUrl}/dashboard/host/listings/new`, { waitUntil: "networkidle" });
    const sectionNames = [
      ["location", "1", "Location"],
      ["space-access", "2", "Space & Access"],
      ["work-rules", "3", "Work Rules"],
      ["equipment", "4", "Equipment"],
      ["pricing", "5", "Pricing"],
      ["photos", "6", "Photos"]
    ];
    for (const [sectionId, number, title] of sectionNames) {
      const section = page.locator(`[data-form-section="${sectionId}"]`);
      await section.getByText(number, { exact: true }).waitFor();
      await section.getByRole("heading", { name: title, exact: true }).waitFor();
    }
    const sectionCount = await page.locator(".co-build-section").count();
    if (sectionCount < 6) {
      throw new Error(`Expected at least six Co-Build form sections, found ${sectionCount}`);
    }
    await page.locator(".signal-submit").getByRole("button", { name: /Submit for admin approval/i }).waitFor();
  });

  await check("search filters show 320 sqft workspace", async () => {
    await page.goto(
      `${baseUrl}/search?location=Woodlands&sizeBand=UNDER_1000&workType=Furniture%20work&powerType=THREE_PHASE&equipment=cnc-machine&loadingAccess=cargo%20lift&factoryType=B2`,
      { waitUntil: "networkidle" }
    );
    await page.getByRole("heading", { name: /Find a fabrication bay/i }).waitFor();
    await page.getByText("320 sqft B2 project workspace with cargo lift").waitFor();
    const countText = await page.locator("text=/spaces available/").first().textContent();
    if (!countText || !countText.includes("1")) {
      throw new Error(`Expected one result, got ${countText}`);
    }
  });

  await check("equipment search uses checkbox boxes", async () => {
    await page.goto(`${baseUrl}/search`, { waitUntil: "networkidle" });
    const checkboxCount = await page.locator('input[type="checkbox"][name="equipment"]').count();
    const selectCount = await page.locator('select[name="equipment"]').count();
    await page.getByLabel("Other, state:").waitFor();
    if (checkboxCount < 10) {
      throw new Error(`Expected equipment checkboxes, found ${checkboxCount}`);
    }
    if (selectCount !== 0) {
      throw new Error("Equipment still uses a select dropdown");
    }
  });

  await check("search exposes requested size, duration, and factory type options", async () => {
    await page.goto(`${baseUrl}/search`, { waitUntil: "networkidle" });
    const sizeOptions = await page.locator('select[name="sizeBand"] option').evaluateAll((options) =>
      options.map((option) => option.textContent?.trim())
    );
    const durationOptions = await page.locator('select[name="durationDays"] option').evaluateAll((options) =>
      options.map((option) => option.textContent?.trim())
    );
    const factoryOptions = await page.locator('select[name="factoryType"] option').evaluateAll((options) =>
      options.map((option) => option.textContent?.trim())
    );
    for (const text of ["Smaller than 1,000 sqft", "Smaller than 5,000 sqft", "Smaller than 10,000 sqft", "Bigger than 10,000 sqft"]) {
      if (!sizeOptions.includes(text)) throw new Error(`Missing size option: ${text}`);
    }
    if (!durationOptions.includes("Custom")) throw new Error("Missing Custom duration option");
    for (const text of ["Office", "B1", "B2"]) {
      if (!factoryOptions.includes(text)) throw new Error(`Missing factory type option: ${text}`);
    }
    await page.getByText("Factory type", { exact: true }).waitFor();
  });

  await check("listing detail contains required operational sections", async () => {
    await page.goto(`${baseUrl}/listings/medium-bay-woodlands`, { waitUntil: "networkidle" });
    for (const text of [
      "Floor plan",
      "Included amenities",
      "Equipment add-ons",
      "Permitted work",
      "Prohibited work",
      "Safety rules",
      "Cancellation policy"
    ]) {
      await page.getByText(text, { exact: true }).waitFor();
    }
  });

  await check("checkout blocks without safety acceptance", async () => {
    await page.goto(`${baseUrl}/checkout/medium-bay-woodlands`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: /Submit booking request/i }).click();
    const valid = await page.locator('input[name="safetyAccepted"]').evaluate((element) => {
      return element instanceof HTMLInputElement ? element.checkValidity() : true;
    });
    if (valid) {
      throw new Error("Safety checkbox unexpectedly valid before acceptance");
    }
  });

  await check("dashboards and static pages render", async () => {
    for (const path of [
      "/dashboard/user",
      "/dashboard/host",
      "/dashboard/admin",
      "/dashboard/host/listings/new",
      "/pricing",
      "/create-account",
      "/safety",
      "/faq",
      "/contact"
    ]) {
      await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle" });
      const body = await page.locator("body").innerText();
      if (body.length < 200) {
        throw new Error(`${path} rendered too little text`);
      }
    }
  });

  await check("host listing form removes landlord and insurance and has other equipment state", async () => {
    await page.goto(`${baseUrl}/dashboard/host/listings/new`, { waitUntil: "networkidle" });
    const body = await page.locator("body").innerText();
    if (body.includes("Landlord approval status")) {
      throw new Error("Landlord approval status is still visible");
    }
    if (body.includes("Insurance status")) {
      throw new Error("Insurance status is still visible");
    }
    await page.locator('input[type="checkbox"][name="equipment"][value="other"]').waitFor();
    await page.locator('input[name="equipmentOther"]').waitFor();
  });

  await check("host listing form shows location map preview", async () => {
    await page.goto(`${baseUrl}/dashboard/host/listings/new`, { waitUntil: "networkidle" });
    await page.getByText("Location map", { exact: true }).waitFor();
    await page.getByText("Map preview", { exact: true }).waitFor();
    await page.getByText("Kranji Industrial Estate", { exact: false }).first().waitFor();
  });

  await check("host listing form uses type checkboxes with other state", async () => {
    await page.goto(`${baseUrl}/dashboard/host/listings/new`, { waitUntil: "networkidle" });
    const body = await page.locator("body").innerText();
    if (body.includes("Zoning")) {
      throw new Error("Host listing form should say Type instead of Zoning");
    }
    const zoningSelectCount = await page.locator('select[name="zoning"]').count();
    if (zoningSelectCount !== 0) {
      throw new Error("Type is still using the old zoning dropdown");
    }
    const typeGroup = page.getByRole("group", { name: "Type" });
    for (const label of ["Office", "B1", "B2", "Other"]) {
      await typeGroup.getByLabel(label, { exact: true }).waitFor();
    }
    await typeGroup.getByLabel("Other type, state:").waitFor();
  });

  await check("host dashboard labels additional listing for multi-listing host", async () => {
    await page.goto(`${baseUrl}/dashboard/host`, { waitUntil: "networkidle" });
    await page.getByRole("link", { name: /Additional listing/i }).waitFor();
  });

  await check("additional requirement request gets rate approval contract email and payment", async () => {
    const detail = `Need extra compressor support ${Date.now()}`;
    await page.goto(`${baseUrl}/dashboard/user`, { waitUntil: "networkidle" });
    await page.getByLabel("Additional requirement details").first().fill(detail);
    await page.getByRole("button", { name: /Submit additional requirement/i }).first().click();
    await page.waitForURL(/dashboard\/user/);
    await page.getByText(detail).waitFor();

    await page.goto(`${baseUrl}/dashboard/host`, { waitUntil: "networkidle" });
    const hostRequest = page.locator("[data-additional-request]").filter({ hasText: detail }).first();
    await hostRequest.getByLabel("Add-on rate").fill("275");
    await hostRequest.getByRole("button", { name: /Approve add-on/i }).click();
    await page
      .locator("[data-additional-request]")
      .filter({ hasText: detail })
      .first()
      .getByText("Contract emailed to renter@example.com")
      .waitFor();

    await page.goto(`${baseUrl}/dashboard/user`, { waitUntil: "networkidle" });
    const userRequest = page.locator("[data-additional-request]").filter({ hasText: detail }).first();
    await userRequest.getByText(/Generated contract/i).waitFor();
    await userRequest.getByText("Contract emailed to renter@example.com").waitFor();
    await userRequest.getByText("S$275").first().waitFor();
    await userRequest.getByRole("button", { name: /Pay add-on with Stripe/i }).click();
    await page.locator("[data-additional-request]").filter({ hasText: detail }).first().getByText("PAID CONFIRMED").waitFor();
  });

  await check("subscription model is Stripe-admin monthly payment with no deal commission", async () => {
    await page.goto(`${baseUrl}/pricing`, { waitUntil: "networkidle" });
    await page.getByText("S$5/month platform subscription").waitFor();
    await page.getByText("Recurring monthly subscription", { exact: true }).waitFor();
    await page.getByText("Renews every month until cancelled.").waitFor();
    await page.getByText("Stripe payment methods", { exact: true }).waitFor();
    await page.getByText("Stripe Checkout", { exact: true }).waitFor();
    await page.getByText("Stripe recurring subscription", { exact: true }).waitFor();
    await page.getByText("Stripe invoice link", { exact: true }).waitFor();
    await page.getByText("Admin Stripe checkout").waitFor();
    await page.getByText("No commission on confirmed deals").waitFor();
    const pricingBody = await page.locator("body").innerText();
    if (/PayNow|FAST bank transfer|Direct payment to company account/i.test(pricingBody)) {
      throw new Error("Pricing page still mentions direct transfer payment methods");
    }

    await page.goto(`${baseUrl}/dashboard/user`, { waitUntil: "networkidle" });
    await page.getByText("Renter platform subscription").waitFor();
    await page.getByText("Stripe recurring plan", { exact: true }).waitFor();
    await page.getByText("Next renewal").first().waitFor();
    await page.getByText("Renter Stripe checkout").waitFor();
    await page.getByRole("button", { name: /Start Stripe checkout/i }).first().waitFor();
    await page.getByRole("button", { name: /Confirm deal as renter/i }).first().waitFor();

    await page.goto(`${baseUrl}/dashboard/host`, { waitUntil: "networkidle" });
    await page.getByText("Host platform subscription").waitFor();
    await page.getByText("Stripe recurring plan", { exact: true }).waitFor();
    await page.getByText("Next renewal").first().waitFor();
    await page.getByText("Host Stripe checkout").waitFor();
    await page.getByRole("button", { name: /Start Stripe checkout/i }).first().waitFor();
    await page.getByRole("button", { name: /Confirm deal as host/i }).first().waitFor();

    await page.goto(`${baseUrl}/dashboard/admin`, { waitUntil: "networkidle" });
    await page.getByText("Stripe subscription revenue", { exact: true }).waitFor();
    await page.getByText("Stripe recurring subscription revenue").waitFor();
    await page.getByText("No deal commission", { exact: true }).waitFor();
    await page.getByText("Admin charges only S$5/month to each active renter and host.", { exact: true }).waitFor();
  });

  await check("public navigation has create account tab and form", async () => {
    await page.goto(`${baseUrl}/pricing`, { waitUntil: "networkidle" });
    await page.locator("header").getByRole("link", { name: /Create Account/i }).click();
    await page.waitForURL(/\/create-account/);
    await page.getByRole("heading", { name: "Create account" }).waitFor();
    await page.getByRole("tab", { name: "Renter account" }).waitFor();
    await page.getByRole("tab", { name: "Host account" }).waitFor();
    await page.getByLabel("Full name").fill("Verification Tester");
    await page.getByLabel("Mobile").fill("+65 9000 0000");
    await page.getByLabel("Email").fill(`tester-${Date.now()}@example.com`);
    await page.getByLabel("Company name").fill("Verifier Pte Ltd");
    await page.getByLabel("Work type").fill("Assembly");
    const experienceLevelCount = await page.getByLabel("Experience level").count();
    if (experienceLevelCount !== 0) {
      throw new Error("Create account form should not ask for experience level");
    }
    await page.getByRole("button", { name: /Create account/i }).click();
    await page.waitForURL(/dashboard\/user\?account=created/);
  });

  await check("dashboard header scopes navigation by role", async () => {
    await page.goto(`${baseUrl}/dashboard/host`, { waitUntil: "networkidle" });
    const hostHeader = page.locator("header");
    for (const label of ["Admin", "Find a Space", "Renter"]) {
      const count = await hostHeader.getByRole("link", { name: new RegExp(`^${label}$`) }).count();
      if (count !== 0) {
        throw new Error(`Host header should not show ${label}`);
      }
    }
    await hostHeader.getByRole("link", { name: /Host Dashboard/i }).waitFor();
    await hostHeader.getByRole("link", { name: /List Your Space/i }).waitFor();

    await page.goto(`${baseUrl}/dashboard/user`, { waitUntil: "networkidle" });
    const userHeader = page.locator("header");
    for (const label of ["Admin", "Host"]) {
      const count = await userHeader.getByRole("link", { name: new RegExp(`^${label}$`) }).count();
      if (count !== 0) {
        throw new Error(`User header should not show ${label}`);
      }
    }
    await userHeader.getByRole("link", { name: /Find a Space/i }).waitFor();
    await userHeader.getByRole("link", { name: /My Bookings/i }).waitFor();
  });

  await check("account switcher moves between host and user accounts", async () => {
    await page.goto(`${baseUrl}/dashboard/host/listings/new`, { waitUntil: "networkidle" });
    await page.getByLabel("Switch to User account").click();
    await page.getByRole("heading", { name: "User dashboard" }).waitFor();
    await page.getByLabel("Switch to Host account").click();
    await page.getByRole("heading", { name: "Host dashboard" }).waitFor();
  });

  await check("mobile homepage has no horizontal overflow", async () => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    if (overflow) {
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      throw new Error(`scrollWidth ${scrollWidth} exceeds viewport`);
    }
    await page.screenshot({ path: "verification/mobile-homepage.png", fullPage: true });
  });

  await browser.close();

  console.log(JSON.stringify(results, null, 2));
  if (results.some((result) => !result.ok)) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
