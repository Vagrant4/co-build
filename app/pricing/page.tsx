import { PricingTable } from "@/components/pricing-table";
import { convenientPaymentMethods, formatCurrency, PLATFORM_SUBSCRIPTION_MONTHLY } from "@/src/lib/fabrication";

export default function PricingPage() {
  return (
    <main className="section-shell py-10">
      <p className="text-sm font-black uppercase text-hazard">Pricing</p>
      <h1 className="mt-2 text-4xl font-black">Fabrication space rates</h1>
      <p className="mt-3 max-w-3xl font-bold text-steel">
        MVP pricing is Singapore-dollar based and combines rental, deposit, cleaning fee, equipment add-ons, and a
        recurring platform subscription.
      </p>
      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <div className="card p-5 premium-panel">
          <p className="text-sm font-black uppercase text-hazard">Platform subscription</p>
          <h2 className="mt-2 text-3xl font-black">{formatCurrency(PLATFORM_SUBSCRIPTION_MONTHLY)}/month platform subscription</h2>
          <p className="mt-2 font-black text-ink">Recurring monthly subscription</p>
          <p className="mt-2 font-bold text-steel">Both user and host pay admin monthly for platform access. Renews every month until cancelled.</p>
        </div>
        <div className="card p-5 premium-panel">
          <p className="text-sm font-black uppercase text-hazard">Payment method</p>
          <h2 className="mt-2 text-2xl font-black">Admin Stripe checkout</h2>
          <p className="mt-2 font-bold text-steel">Renter and host subscriptions are collected by admin through Stripe, then activated from the admin dashboard.</p>
        </div>
        <div className="card p-5 premium-panel">
          <p className="text-sm font-black uppercase text-hazard">Deal fees</p>
          <h2 className="mt-2 text-2xl font-black">No commission on confirmed deals</h2>
          <p className="mt-2 font-bold text-steel">User and host confirm the deal on-platform; admin does not charge both sides for the deal made.</p>
        </div>
      </section>
      <section className="mt-8">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase text-hazard">Payment methods</p>
            <h2 className="text-3xl font-black">Stripe payment methods</h2>
          </div>
          <a className="button-secondary" href="/create-account">
            Create account
          </a>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {convenientPaymentMethods.map((method) => (
            <article key={method.name} className="card p-5 stripe-card">
              <p className="text-sm font-black uppercase text-hazard">{method.bestFor}</p>
              <h3 className="mt-2 text-xl font-black">{method.name}</h3>
              <p className="mt-2 font-bold text-steel">{method.instructions}</p>
              <p className="mt-3 text-xs font-black uppercase text-ink">Collected by admin with Stripe</p>
            </article>
          ))}
        </div>
      </section>
      <div className="mt-8">
        <PricingTable />
      </div>
    </main>
  );
}
