import { CreditCard, ExternalLink } from "lucide-react";
import { openStripeBillingPortalAction, startStripeSubscriptionAction } from "@/app/subscription-actions";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, PLATFORM_SUBSCRIPTION_MONTHLY } from "@/src/lib/fabrication";

type Props = {
  title: string;
  email: string;
  status: string;
  provider: string | null;
  reference: string | null;
  nextBillingAt: Date | null;
  periodEndAt: Date | null;
  stripeAvailable: boolean;
  stripeCustomerId: string | null;
};

export function PlatformSubscriptionPanel(props: Props) {
  const nextRenewal = props.nextBillingAt ?? props.periodEndAt;
  const isStripeCustomer = props.provider === "STRIPE" && Boolean(props.stripeCustomerId);

  return (
    <section className="card mb-8 grid gap-4 p-5 premium-panel lg:grid-cols-[1fr_380px]">
      <div>
        <div className="mb-2 flex flex-wrap gap-2">
          <StatusBadge status={props.status} />
          <span className="status-pill">{formatCurrency(PLATFORM_SUBSCRIPTION_MONTHLY)}/month</span>
          <span className="status-pill">No deal commission</span>
        </div>
        <h2 className="text-2xl font-black">{props.title}</h2>
        <p className="mt-2 font-bold text-steel">
          Automatic monthly billing is available through Stripe. Rental payments remain directly between renter and host; SpaceOnCall charges only the platform subscription.
        </p>
        <p className="mt-2 text-sm font-black">Next renewal: {nextRenewal ? formatDate(nextRenewal) : "starts after activation"}</p>
        <p className="mt-2 text-sm font-black">Login email: {props.email}</p>
        {props.reference && <p className="mt-2 text-sm font-bold text-steel">Latest payment reference: {props.reference}</p>}
      </div>

      <div className="payment-card grid content-between gap-3 border border-neutral-200 bg-white p-4">
        {props.stripeAvailable ? (
          <>
            <div>
              <p className="label">Automatic card subscription</p>
              <p className="text-sm font-bold text-steel">Stripe securely manages the card, monthly renewal, receipts, and cancellation.</p>
            </div>
            {isStripeCustomer ? (
              <form action={openStripeBillingPortalAction}>
                <button className="button-primary w-full" type="submit"><ExternalLink size={18} /> Manage billing</button>
              </form>
            ) : (
              <form action={startStripeSubscriptionAction}>
                <button className="button-primary w-full" type="submit"><CreditCard size={18} /> Subscribe with Stripe</button>
              </form>
            )}
          </>
        ) : (
          <p className="text-sm font-bold text-steel">Automatic card billing is temporarily unavailable. Please contact support for assistance.</p>
        )}
      </div>
    </section>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-SG", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}
