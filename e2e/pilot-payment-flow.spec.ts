import { expect, test, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function switchDemoUser(page: Page, userId: string, nextPath: string) {
  await page.goto(`/demo/session?user=${userId}&next=${encodeURIComponent(nextPath)}`, { waitUntil: "commit" });
  await page.waitForURL(`**${nextPath}`);
}

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("renter and host accept one agreement before admin verifies payment", async ({ page }) => {
  test.setTimeout(90_000);
  const listing = await prisma.listing.findFirstOrThrow({ where: { hostId: "demo-host", status: "APPROVED" } });
  const reference = `e2e-bank-${Date.now()}`;
  const booking = await prisma.booking.create({
    data: {
      listingId: listing.id,
      userId: "demo-renter",
      durationDays: 1,
      startAt: new Date("2030-01-01T16:00:00.000Z"),
      endAt: new Date("2030-01-02T16:00:00.000Z"),
      workType: "Assembly",
      riskLevel: "STANDARD",
      status: "PENDING_HOST",
      rentalTotal: listing.priceDay,
      deposit: listing.depositStandard,
      cleaningFee: listing.cleaningFee,
      addonTotal: 0,
      grandTotal: listing.priceDay + listing.depositStandard + listing.cleaningFee,
      safetyAcceptedAt: new Date()
    }
  });

  try {
    await switchDemoUser(page, "demo-renter", "/dashboard/user");
    let agreementLink = page.locator(`a[href="/dashboard/bookings/${booking.id}/agreement"]`);
    let bookingCard = agreementLink.locator("xpath=ancestor::section[1]");
    await bookingCard.getByPlaceholder(/Ask the host/i).fill("Please confirm the access window and loading arrangements.");
    await bookingCard.getByRole("button", { name: "Send message" }).click();
    await bookingCard.getByRole("button", { name: "Confirm deal as renter" }).click();
    await expect.poll(() => prisma.bookingMessage.count({ where: { bookingId: booking.id, senderId: "demo-renter" } })).toBe(1);
    await expect.poll(async () => Boolean((await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).renterDealConfirmedAt)).toBe(true);

    await switchDemoUser(page, "demo-host", "/dashboard/host");
    bookingCard = page.locator(`a[href="/dashboard/bookings/${booking.id}/agreement"]`).locator("xpath=ancestor::article[1]");
    await bookingCard.getByPlaceholder(/Message the renter/i).fill("Access is confirmed. Please follow the PPE and loading rules.");
    await bookingCard.getByRole("button", { name: "Send message" }).click();
    await bookingCard.getByRole("button", { name: "Confirm deal as host" }).click();
    await bookingCard.getByRole("button", { name: "Approve", exact: true }).click();
    await expect.poll(() => prisma.bookingMessage.count({ where: { bookingId: booking.id, senderId: "demo-host" } })).toBe(1);
    await expect.poll(async () => (await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe("APPROVED_FOR_PAYMENT");
    await expect.poll(async () => Boolean((await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).hostDealConfirmedAt)).toBe(true);

    await switchDemoUser(page, "demo-renter", `/dashboard/bookings/${booking.id}/agreement`);
    await page.getByLabel(/reviewed and accept/i).check();
    await page.getByRole("button", { name: "Accept agreement" }).click();
    await expect.poll(() => prisma.agreementAcceptance.count({ where: { bookingId: booking.id, userId: "demo-renter" } })).toBe(1);
    await page.reload();
    await expect(page.getByText("Your acceptance is recorded.")).toBeVisible();

    await switchDemoUser(page, "demo-host", `/dashboard/bookings/${booking.id}/agreement`);
    await page.getByLabel(/reviewed and accept/i).check();
    await page.getByRole("button", { name: "Accept agreement" }).click();
    await expect.poll(() => prisma.agreementAcceptance.count({ where: { bookingId: booking.id, userId: "demo-host" } })).toBe(1);
    await page.reload();
    await expect(page.getByText("Renter: Accepted")).toBeVisible();
    await expect(page.getByText("Host: Accepted")).toBeVisible();

    await switchDemoUser(page, "demo-renter", "/dashboard/user");
    agreementLink = page.locator(`a[href="/dashboard/bookings/${booking.id}/agreement"]`);
    bookingCard = agreementLink.locator("xpath=ancestor::section[1]");
    await bookingCard.getByPlaceholder("PayNow or bank reference").first().fill(reference);
    await bookingCard.getByRole("button", { name: /Submit payment for verification/i }).click();
    await expect.poll(async () => (await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe("PAYMENT_SUBMITTED");
    await page.reload();
    await expect(bookingCard.getByText(/remains unpaid until admin verifies/i)).toBeVisible();
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe("PAYMENT_SUBMITTED");

    await switchDemoUser(page, "demo-admin", "/dashboard/admin");
    const paymentCard = page.locator("article").filter({ hasText: reference });
    await paymentCard.getByRole("button", { name: "Verify paid" }).click();
    await expect.poll(async () => (await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe("PAID_CONFIRMED");
    await page.reload();
    await expect(paymentCard.getByText("VERIFIED")).toBeVisible();
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe("PAID_CONFIRMED");

    for (const [type, expectedStatus] of [["CHECK_IN", "CHECKED_IN"], ["CHECK_OUT", "CHECKED_OUT"]] as const) {
      const upload = await prisma.upload.create({
        data: {
          booking: { connect: { id: booking.id } },
          ownerUser: { connect: { id: "demo-renter" } },
          uploadedByUser: { connect: { id: "demo-renter" } },
          type,
          originalName: `${type.toLowerCase()}-e2e.png`,
          storageProvider: "LEGACY_LOCAL",
          legacyLocalPath: `uploads/e2e/${booking.id}/${type.toLowerCase()}.png`,
          uploadStatus: "AVAILABLE",
          scanStatus: "NOT_REQUIRED"
        }
      });
      await switchDemoUser(page, "demo-renter", "/dashboard/user");
      bookingCard = page.locator(`a[href="/dashboard/bookings/${booking.id}/agreement"]`).locator("xpath=ancestor::section[1]");
      const form = bookingCard.locator(`form:has(input[name="uploadKind"][value="${type}"])`);
      await form.evaluate((element, uploadId) => {
        element.querySelectorAll('input[type="file"]').forEach((field) => field.removeAttribute("required"));
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = "photoUploadId";
        input.value = uploadId;
        element.appendChild(input);
        (element as HTMLFormElement).requestSubmit();
      }, upload.id);
      await expect.poll(async () => (await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe(expectedStatus);
    }
  } finally {
    const messageIds = (await prisma.bookingMessage.findMany({ where: { bookingId: booking.id }, select: { id: true } })).map(({ id }) => `booking-message:${id}`);
    await prisma.$transaction([
      prisma.notification.deleteMany({ where: { dedupeKey: { in: messageIds } } }),
      prisma.approvalEvent.deleteMany({ where: { bookingId: booking.id } }),
      prisma.paymentRecord.deleteMany({ where: { bookingId: booking.id } }),
      prisma.agreementAcceptance.deleteMany({ where: { bookingId: booking.id } }),
      prisma.bookingMessage.deleteMany({ where: { bookingId: booking.id } }),
      prisma.upload.deleteMany({ where: { bookingId: booking.id } }),
      prisma.booking.delete({ where: { id: booking.id } })
    ]);
  }
});
