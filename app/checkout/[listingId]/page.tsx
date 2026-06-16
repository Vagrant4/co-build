import { AlertTriangle, Calculator, FileUp, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { createBookingAction } from "@/app/actions";
import { formatCurrency, getDurationPrice } from "@/src/lib/fabrication";
import { getEquipmentAddons, getListingBySlug } from "@/src/lib/repository";
import { workTypes } from "@/src/lib/seed-data";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ listingId: string }> | { listingId: string };
};

export default async function CheckoutPage({ params }: PageProps) {
  const { listingId } = await params;
  const [listing, addons] = await Promise.all([getListingBySlug(listingId), getEquipmentAddons()]);
  if (!listing) notFound();
  const listingAddons = addons.filter((addon) => listing.equipmentSlugs.includes(addon.slug));

  return (
    <main className="section-shell grid gap-8 py-8 lg:grid-cols-[1fr_390px]">
      <section className="card p-6">
        <p className="text-sm font-black uppercase text-hazard">Booking checkout</p>
        <h1 className="mt-2 text-4xl font-black">{listing.title}</h1>
        <p className="mt-2 font-bold text-steel">{listing.address}</p>

        <form action={createBookingAction} className="mt-8 space-y-6">
          <input type="hidden" name="listingSlug" value={listing.slug} />
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="label">Duration</span>
              <select className="field" name="durationDays" defaultValue="1">
                <option value="1">1 day - {formatCurrency(listing.prices.day)}</option>
                <option value="7">7 days - {formatCurrency(listing.prices.sevenDays)}</option>
                <option value="30">30 days - {formatCurrency(listing.prices.thirtyDays)}</option>
                <option value="60">60 days - {formatCurrency(listing.prices.sixtyDays)}</option>
              </select>
            </label>
            <label>
              <span className="label">Work type</span>
              <select className="field" name="workType" defaultValue="Assembly">
                {workTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div>
            <span className="label">Equipment add-ons</span>
            <div className="grid gap-3 md:grid-cols-2">
              {listingAddons.map((addon) => (
                <label key={addon.slug} className="flex items-center justify-between gap-3 border border-neutral-200 bg-white p-3">
                  <span>
                    <span className="block font-black">{addon.name}</span>
                    <span className="block text-sm font-bold text-steel">{addon.category}</span>
                  </span>
                  <span className="flex items-center gap-2 font-black text-hazard">
                    {formatCurrency(addon.pricePerBooking)}
                    <input type="checkbox" name="addons" value={addon.slug} />
                  </span>
                </label>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="label">Verification document</span>
            <span className="flex items-center gap-3 border border-neutral-300 bg-white p-4">
              <FileUp className="text-hazard" size={22} />
              <input name="verification" type="file" accept="image/*,.pdf" />
            </span>
          </label>

          <label className="flex items-start gap-3 border border-ink bg-smoke p-4">
            <input className="mt-1" type="checkbox" name="safetyAccepted" required />
            <span>
              <span className="block font-black">I accept the safety rules and photo requirements.</span>
              <span className="block text-sm font-bold text-steel">
                PPE, no blocked access, approved-only hot work/spray/chemical activity, waste clearance, and
                check-in/check-out photos are mandatory.
              </span>
            </span>
          </label>

          <button className="button-primary w-full" type="submit">
            Submit booking request
          </button>
        </form>
      </section>

      <aside className="h-fit border border-ink bg-white p-5">
        <h2 className="flex items-center gap-2 text-2xl font-black">
          <Calculator className="text-hazard" size={24} /> Quote preview
        </h2>
        <div className="mt-4 space-y-3">
          {[1, 7, 30, 60].map((duration) => (
            <div key={duration} className="flex justify-between border-b border-neutral-200 pb-2">
              <span className="font-bold text-steel">{duration} day{duration > 1 ? "s" : ""}</span>
              <span className="font-black">{formatCurrency(getDurationPrice(listing, duration as 1 | 7 | 30 | 60))}</span>
            </div>
          ))}
          <div className="flex justify-between border-b border-neutral-200 pb-2">
            <span className="font-bold text-steel">Deposit</span>
            <span className="font-black">{formatCurrency(listing.deposit.standard)}</span>
          </div>
          <div className="flex justify-between border-b border-neutral-200 pb-2">
            <span className="font-bold text-steel">Cleaning fee</span>
            <span className="font-black">{formatCurrency(listing.cleaningFee)}</span>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          <div className="flex gap-3 border border-neutral-200 p-3">
            <ShieldCheck className="text-hazard" size={22} />
            <p className="text-sm font-bold text-steel">Normal work goes to host approval before Stripe checkout.</p>
          </div>
          <div className="flex gap-3 border border-neutral-200 p-3">
            <AlertTriangle className="text-hazard" size={22} />
            <p className="text-sm font-bold text-steel">High-risk work routes through admin approval before Stripe checkout.</p>
          </div>
        </div>
      </aside>
    </main>
  );
}
