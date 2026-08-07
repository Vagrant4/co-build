import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("renter and host accept one agreement before admin verifies payment", async ({ page }) => {
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
      status: "APPROVED_FOR_PAYMENT",
      rentalTotal: listing.priceDay,
      deposit: listing.depositStandard,
      cleaningFee: listing.cleaningFee,
      addonTotal: 0,
      grandTotal: listing.priceDay + listing.depositStandard + listing.cleaningFee,
      safetyAcceptedAt: new Date(),
      renterDealConfirmedAt: new Date(),
      hostDealConfirmedAt: new Date()
    }
  });

  try {
    await page.goto(`/demo/session?user=demo-renter&next=/dashboard/bookings/${booking.id}/agreement`);
    await page.getByLabel(/reviewed and accept/i).check();
    await page.getByRole("button", { name: "Accept agreement" }).click();
    await expect(page.getByText("Your acceptance is recorded.")).toBeVisible();

    await page.goto(`/demo/session?user=demo-host&next=/dashboard/bookings/${booking.id}/agreement`);
    await page.getByLabel(/reviewed and accept/i).check();
    await page.getByRole("button", { name: "Accept agreement" }).click();
    await expect(page.getByText("Renter: Accepted")).toBeVisible();
    await expect(page.getByText("Host: Accepted")).toBeVisible();

    await page.goto("/demo/session?user=demo-renter&next=/dashboard/user");
    const agreementLink = page.locator(`a[href="/dashboard/bookings/${booking.id}/agreement"]`);
    const bookingCard = agreementLink.locator("xpath=ancestor::section[1]");
    await bookingCard.getByPlaceholder("PayNow or bank reference").first().fill(reference);
    await bookingCard.getByRole("button", { name: /Submit payment for verification/i }).click();
    await expect(bookingCard.getByText(/remains unpaid until admin verifies/i)).toBeVisible();
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe("PAYMENT_SUBMITTED");

    await page.goto("/demo/session?user=demo-admin&next=/dashboard/admin");
    const paymentCard = page.locator("article").filter({ hasText: reference });
    await paymentCard.getByRole("button", { name: "Verify paid" }).click();
    await expect(paymentCard.getByText("VERIFIED")).toBeVisible();
    expect((await prisma.booking.findUniqueOrThrow({ where: { id: booking.id } })).status).toBe("PAID_CONFIRMED");
  } finally {
    await prisma.$transaction([
      prisma.approvalEvent.deleteMany({ where: { bookingId: booking.id } }),
      prisma.paymentRecord.deleteMany({ where: { bookingId: booking.id } }),
      prisma.agreementAcceptance.deleteMany({ where: { bookingId: booking.id } }),
      prisma.booking.delete({ where: { id: booking.id } })
    ]);
  }
});
