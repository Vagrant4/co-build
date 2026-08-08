import { expect, test } from "@playwright/test";

for (const route of ["/", "/search", "/create-account", "/pricing", "/legal"] as const) {
  test(`${route} has a visible heading and no horizontal page overflow`, async ({ page }) => {
    await page.goto(route);
    await expect(page.locator("h1").first()).toBeVisible();
    const dimensions = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  });
}

test("listing images provide useful alternative text", async ({ page }) => {
  await page.goto("/search");
  const images = page.locator("main img");
  const count = await images.count();
  expect(count).toBeGreaterThan(0);
  for (let index = 0; index < count; index += 1) await expect(images.nth(index)).toHaveAttribute("alt", /\S+/);
});

test("the application publishes installable web metadata", async ({ request }) => {
  const manifest = await request.get("/manifest.webmanifest");
  expect(manifest.ok()).toBeTruthy();
  expect((await manifest.json()).display).toBe("standalone");
  expect((await request.get("/sw.js")).ok()).toBeTruthy();
});
