import type Stripe from "stripe";
import { NextRequest } from "next/server";
import { prisma } from "@/src/lib/db";
import { queueUserNotification } from "@/src/lib/notifications";
import {
  getStripeClient,
  isStripeBillingConfigured,
  mapStripeSubscriptionStatus,
  stripeObjectId,
  stripeSubscriptionPeriod,
  stripeEventModeMatchesKey
} from "@/src/lib/stripe-billing";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isStripeBillingConfigured()) return Response.json({ error: "Stripe Billing is disabled." }, { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing Stripe signature." }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = getStripeClient().webhooks.constructEvent(await request.text(), signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return Response.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }
  if (!stripeEventModeMatchesKey(event.livemode)) return Response.json({ error: "Stripe event mode does not match the configured account." }, { status: 400 });

  try {
    const duplicate = await prisma.stripeWebhookEvent.findUnique({ where: { id: event.id }, select: { id: true } });
    if (duplicate) return Response.json({ received: true, duplicate: true });

    if (event.type === "checkout.session.completed") {
      await processCheckoutCompleted(event);
    } else if (event.type.startsWith("customer.subscription.")) {
      await processSubscriptionEvent(event);
    } else {
      await prisma.stripeWebhookEvent.create({ data: { id: event.id, type: event.type, livemode: event.livemode } });
    }
    return Response.json({ received: true });
  } catch {
    return Response.json({ error: "Stripe event processing failed." }, { status: 500 });
  }
}

async function processCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const userId = session.metadata?.appUserId || session.client_reference_id;
  const customerId = stripeObjectId(session.customer);
  const subscriptionId = stripeObjectId(session.subscription);
  if (!userId || !customerId) throw new Error("Stripe Checkout is missing its SpaceOnCall account mapping.");

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true, role: true } });
    if (!user || (user.role !== "RENTER" && user.role !== "HOST")) throw new Error("Stripe Checkout account is ineligible.");
    await tx.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId, platformSubscriptionProvider: "STRIPE" }
    });
    await tx.approvalEvent.create({ data: { actorId: null, target: "stripe_checkout", decision: "APPROVED", note: `Verified Stripe Checkout event ${event.id}. Subscription activation awaits Stripe status confirmation.` } });
    await tx.stripeWebhookEvent.create({ data: { id: event.id, type: event.type, livemode: event.livemode } });
  });
}

async function processSubscriptionEvent(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const customerId = stripeObjectId(subscription.customer);
  const metadataUserId = subscription.metadata?.appUserId;
  if (!customerId && !metadataUserId) throw new Error("Stripe subscription is missing its SpaceOnCall account mapping.");
  const status = mapStripeSubscriptionStatus(subscription.status);
  const period = stripeSubscriptionPeriod(subscription);

  await prisma.$transaction(async (tx) => {
    const user = metadataUserId
      ? await tx.user.findUnique({ where: { id: metadataUserId }, select: { id: true, role: true, stripeCustomerId: true } })
      : await tx.user.findUnique({ where: { stripeCustomerId: customerId! }, select: { id: true, role: true, stripeCustomerId: true } });
    if (!user || (user.role !== "RENTER" && user.role !== "HOST")) throw new Error("Stripe subscription account is ineligible.");
    if (user.stripeCustomerId && customerId && user.stripeCustomerId !== customerId) throw new Error("Stripe customer mapping does not match the subscription account.");
    await tx.user.update({
      where: { id: user.id },
      data: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        platformSubscriptionProvider: "STRIPE",
        platformSubscriptionStatus: status,
        platformSubscriptionReference: `stripe:${subscription.id}`,
        platformSubscriptionPaidAt: status === "ACTIVE" ? new Date() : undefined,
        platformSubscriptionPeriodStart: period.periodStart,
        platformSubscriptionPeriodEnd: period.periodEnd,
        platformSubscriptionNextBilling: period.periodEnd
      }
    });
    await tx.approvalEvent.create({
      data: {
        actorId: null,
        target: "stripe_subscription",
        decision: status === "ACTIVE" ? "APPROVED" : "SUSPENDED",
        note: `Verified Stripe event ${event.id} set subscription ${subscription.id} to ${status}.`
      }
    });
    await queueUserNotification(tx, {
      userId: user.id,
      type: "STRIPE_SUBSCRIPTION_STATUS",
      title: status === "ACTIVE" ? "Subscription active" : "Subscription needs attention",
      body: status === "ACTIVE" ? "Your recurring SpaceOnCall subscription is active." : `Your recurring SpaceOnCall subscription is ${status.toLowerCase().replace("_", " ")}. Open billing settings to review it.`,
      dedupeKey: `stripe:${event.id}`,
      email: true
    });
    await tx.stripeWebhookEvent.create({ data: { id: event.id, type: event.type, livemode: event.livemode } });
  });
}
