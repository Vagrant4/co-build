import Stripe from "stripe";

export const STRIPE_MONTHLY_AMOUNT_CENTS = 500;
export const STRIPE_CURRENCY = "sgd";

let stripeClient: Stripe | null = null;

export function isStripeBillingEnabled(environment: NodeJS.ProcessEnv = process.env): boolean {
  return environment.STRIPE_BILLING_ENABLED === "true";
}

export function stripeBillingConfigurationIssues(environment: NodeJS.ProcessEnv = process.env): string[] {
  if (!isStripeBillingEnabled(environment)) return [];
  return ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_MONTHLY_PRICE_ID"].filter((key) => !environment[key]?.trim());
}

export function isStripeBillingConfigured(environment: NodeJS.ProcessEnv = process.env): boolean {
  return isStripeBillingEnabled(environment) && stripeBillingConfigurationIssues(environment).length === 0;
}

export function getStripeClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) throw new Error("Stripe Billing is not configured.");
  if (!stripeClient) stripeClient = new Stripe(secretKey, { maxNetworkRetries: 2 });
  return stripeClient;
}

export type AppSubscriptionStatus = "UNPAID" | "ACTIVE" | "PAST_DUE" | "CANCELED";

export function mapStripeSubscriptionStatus(status: Stripe.Subscription.Status): AppSubscriptionStatus {
  if (status === "active" || status === "trialing") return "ACTIVE";
  if (status === "past_due" || status === "unpaid" || status === "incomplete" || status === "paused") return "PAST_DUE";
  return "CANCELED";
}

export function stripeSubscriptionPeriod(subscription: Stripe.Subscription): {
  periodStart: Date | null;
  periodEnd: Date | null;
} {
  const item = subscription.items.data[0];
  return {
    periodStart: item?.current_period_start ? new Date(item.current_period_start * 1000) : null,
    periodEnd: item?.current_period_end ? new Date(item.current_period_end * 1000) : null
  };
}

export function stripeObjectId(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

export function assertMonthlyStripePrice(price: Pick<Stripe.Price, "active" | "currency" | "unit_amount" | "recurring">): void {
  const valid = price.active && price.currency === STRIPE_CURRENCY && price.unit_amount === STRIPE_MONTHLY_AMOUNT_CENTS && price.recurring?.interval === "month";
  if (!valid) throw new Error("Stripe monthly Price must be active, recurring monthly, SGD, and exactly S$5.00.");
}

export function stripeEventModeMatchesKey(livemode: boolean, secretKey = process.env.STRIPE_SECRET_KEY || ""): boolean {
  const mode = livemode ? "live" : "test";
  return secretKey.startsWith(`sk_${mode}_`) || secretKey.startsWith(`rk_${mode}_`);
}
