"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/src/lib/authorization";
import { getAppMode } from "@/src/lib/app-mode";
import { prisma } from "@/src/lib/db";
import { enforceRateLimit } from "@/src/lib/rate-limit";
import { assertMonthlyStripePrice, getStripeClient, isStripeBillingConfigured, stripeObjectId } from "@/src/lib/stripe-billing";

function dashboardPath(role: string): "/dashboard/user" | "/dashboard/host" {
  if (role === "RENTER") return "/dashboard/user";
  if (role === "HOST") return "/dashboard/host";
  throw new Error("Platform subscriptions are available only to renter and host accounts.");
}

export async function startStripeSubscriptionAction() {
  const user = await requireUser();
  const returnPath = dashboardPath(user.role);
  if (getAppMode() === "demo" || !isStripeBillingConfigured()) throw new Error("Stripe Billing is not available.");
  if (user.platformSubscriptionStatus === "ACTIVE" && user.stripeSubscriptionId) redirect(`${returnPath}?subscription=active`);
  await enforceRateLimit({ action: "stripe:checkout", identity: user.id, limit: 5, windowSeconds: 60 * 60 });

  const stripe = getStripeClient();
  const price = await stripe.prices.retrieve(process.env.STRIPE_MONTHLY_PRICE_ID!);
  assertMonthlyStripePrice(price);
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.fullName,
      metadata: { appUserId: user.id, role: user.role }
    }, { idempotencyKey: `spaceoncall-customer-${user.id}` });
    customerId = customer.id;
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: user.id }, data: { stripeCustomerId: customerId } });
      await tx.approvalEvent.create({ data: { actorId: user.id, target: "stripe_customer", decision: "APPROVED", note: "Authenticated account created its Stripe customer mapping." } });
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!.replace(/\/$/, "");
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    client_reference_id: user.id,
    line_items: [{ price: process.env.STRIPE_MONTHLY_PRICE_ID!, quantity: 1 }],
    success_url: `${appUrl}${returnPath}?subscription=stripe-success`,
    cancel_url: `${appUrl}${returnPath}?subscription=stripe-cancelled`,
    allow_promotion_codes: false,
    subscription_data: { metadata: { appUserId: user.id, role: user.role } },
    metadata: { appUserId: user.id, role: user.role }
  });
  if (!session.url) throw new Error("Stripe Checkout did not return a secure payment URL.");
  redirect(session.url);
}

export async function openStripeBillingPortalAction() {
  const user = await requireUser();
  const returnPath = dashboardPath(user.role);
  if (!isStripeBillingConfigured() || !user.stripeCustomerId) throw new Error("No Stripe billing account is available.");
  await enforceRateLimit({ action: "stripe:portal", identity: user.id, limit: 10, windowSeconds: 60 * 60 });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!.replace(/\/$/, "");
  const session = await getStripeClient().billingPortal.sessions.create({
    customer: stripeObjectId(user.stripeCustomerId)!,
    return_url: `${appUrl}${returnPath}`
  });
  redirect(session.url);
}
