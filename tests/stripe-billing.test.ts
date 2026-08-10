import { describe, expect, it } from "vitest";
import {
  assertMonthlyStripePrice,
  isStripeBillingConfigured,
  mapStripeSubscriptionStatus,
  stripeBillingConfigurationIssues,
  stripeEventModeMatchesKey,
  stripeSubscriptionPeriod
} from "../src/lib/stripe-billing";
import type Stripe from "stripe";

describe("Stripe recurring billing", () => {
  it("fails closed when enabled configuration is incomplete", () => {
    const environment = { STRIPE_BILLING_ENABLED: "true", STRIPE_SECRET_KEY: "sk_test" } as unknown as NodeJS.ProcessEnv;
    expect(isStripeBillingConfigured(environment)).toBe(false);
    expect(stripeBillingConfigurationIssues(environment)).toEqual(["STRIPE_WEBHOOK_SECRET", "STRIPE_MONTHLY_PRICE_ID"]);
  });

  it("stays disabled unless explicitly enabled", () => {
    const environment = {
      STRIPE_SECRET_KEY: "sk_test",
      STRIPE_WEBHOOK_SECRET: "whsec_test",
      STRIPE_MONTHLY_PRICE_ID: "price_test"
    } as unknown as NodeJS.ProcessEnv;
    expect(isStripeBillingConfigured(environment)).toBe(false);
  });

  it("maps Stripe lifecycle statuses to access states", () => {
    expect(mapStripeSubscriptionStatus("active")).toBe("ACTIVE");
    expect(mapStripeSubscriptionStatus("trialing")).toBe("ACTIVE");
    expect(mapStripeSubscriptionStatus("past_due")).toBe("PAST_DUE");
    expect(mapStripeSubscriptionStatus("unpaid")).toBe("PAST_DUE");
    expect(mapStripeSubscriptionStatus("canceled")).toBe("CANCELED");
  });

  it("uses Stripe's subscription-item billing period", () => {
    const subscription = {
      items: { data: [{ current_period_start: 1_786_387_200, current_period_end: 1_789_066_800 }] }
    } as unknown as Stripe.Subscription;
    const period = stripeSubscriptionPeriod(subscription);
    expect(period.periodStart?.toISOString()).toBe("2026-08-10T18:40:00.000Z");
    expect(period.periodEnd?.getTime()).toBeGreaterThan(period.periodStart!.getTime());
  });

  it("accepts only the configured S$5 monthly recurring Price", () => {
    expect(() => assertMonthlyStripePrice({ active: true, currency: "sgd", unit_amount: 500, recurring: { interval: "month" } as Stripe.Price.Recurring })).not.toThrow();
    expect(() => assertMonthlyStripePrice({ active: true, currency: "sgd", unit_amount: 5000, recurring: { interval: "month" } as Stripe.Price.Recurring })).toThrow(/S\$5\.00/);
    expect(() => assertMonthlyStripePrice({ active: true, currency: "usd", unit_amount: 500, recurring: { interval: "month" } as Stripe.Price.Recurring })).toThrow();
  });

  it("rejects test/live webhook mode mismatches", () => {
    expect(stripeEventModeMatchesKey(false, "sk_test_example")).toBe(true);
    expect(stripeEventModeMatchesKey(true, "sk_live_example")).toBe(true);
    expect(stripeEventModeMatchesKey(true, "sk_test_example")).toBe(false);
  });
});
