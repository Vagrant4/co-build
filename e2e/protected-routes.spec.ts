import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("protected dashboards return 401 without a session", async ({ request }) => {
  for (const path of ["/dashboard/user", "/dashboard/host", "/dashboard/admin", "/dashboard/host/listings/new"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(401);
  }
});

test("private upload APIs reject signed-out requests", async ({ request }) => {
  const reserve = await request.post("/api/uploads/reserve", {
    data: { type: "VERIFICATION", originalName: "identity.pdf", contentType: "application/pdf", sizeBytes: 100 }
  });
  expect(reserve.status()).toBe(401);
  expect((await request.get("/api/uploads/nonexistent")).status()).toBe(401);
});

test("renter cannot open admin exports or a host dashboard", async ({ page }) => {
  await page.goto("/demo/session?user=demo-renter&next=/dashboard/user");
  await expect(page).toHaveURL(/\/dashboard\/user/);
  const exportResponse = await page.request.get("/dashboard/admin/export/users.csv", { maxRedirects: 0 });
  expect(exportResponse.status()).toBe(403);
  const hostResponse = await page.request.get("/dashboard/host", { maxRedirects: 0 });
  expect(hostResponse.status()).toBe(403);
});

test("admin can export and the export is audited", async ({ page }) => {
  await page.goto("/demo/session?user=demo-admin&next=/dashboard/admin");
  const before = await prisma.adminExportEvent.count({ where: { actorId: "demo-admin", exportType: "users" } });
  const response = await page.request.get("/dashboard/admin/export/users.csv");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("text/csv");
  const after = await prisma.adminExportEvent.count({ where: { actorId: "demo-admin", exportType: "users" } });
  expect(after).toBe(before + 1);
});

test("non-approved listings return 404 from detail and checkout", async ({ page }) => {
  const listing = await prisma.listing.findUniqueOrThrow({ where: { slug: "project-hall-tuas-west" }, select: { id: true, status: true } });
  await prisma.listing.update({ where: { id: listing.id }, data: { status: "PENDING_ADMIN" } });
  try {
    expect((await page.request.get("/listings/project-hall-tuas-west")).status()).toBe(404);
    await page.goto("/demo/session?user=demo-renter&next=/search");
    expect((await page.request.get("/checkout/project-hall-tuas-west")).status()).toBe(404);
  } finally {
    await prisma.listing.update({ where: { id: listing.id }, data: { status: listing.status } });
  }
});
