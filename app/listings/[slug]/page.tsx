import { ArrowRight, Bolt, CalendarDays, Check, ClipboardList, Ruler, ShieldAlert, Truck, X, type LucideIcon } from "lucide-react";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, sizeRequirementLabel } from "@/src/lib/fabrication";
import { getEquipmentAddons, getListingBySlug } from "@/src/lib/repository";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }> | { slug: string };
};

export default async function ListingDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [listing, addons] = await Promise.all([getListingBySlug(slug), getEquipmentAddons()]);
  if (!listing) notFound();

  const listingAddons = addons.filter((addon) => listing.equipmentSlugs.includes(addon.slug));

  return (
    <main>
      <section className="bg-ink text-white">
        <div className="section-shell grid gap-8 py-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <img src={listing.photoUrls[0]} alt="" className="h-[460px] w-full border border-white/20 object-cover" />
          </div>
          <div className="flex flex-col justify-between gap-6">
            <div>
              <div className="mb-3 flex flex-wrap gap-2">
                <StatusBadge status={listing.status} />
                <span className="status-pill bg-safety text-ink">{listing.zoning}</span>
              </div>
              <p className="text-sm font-black uppercase text-safety">{sizeRequirementLabel(listing.sizeSqft)}</p>
              <h1 className="mt-2 text-4xl font-black md:text-5xl">{listing.title}</h1>
              <p className="mt-4 text-lg font-bold text-neutral-300">{listing.address}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Spec icon={Ruler} label="Size" value={`${listing.sizeSqft} sqft`} />
              <Spec icon={Bolt} label="Power" value={listing.powerType === "THREE_PHASE" ? "Three-phase" : "Single-phase"} />
              <Spec icon={Truck} label="Loading" value={listing.loadingAccess.join(", ")} />
              <Spec icon={CalendarDays} label="Access" value={listing.accessHours} />
            </div>
            <a href={`/checkout/${listing.slug}`} className="button-primary">
              Request booking <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </section>

      <section className="section-shell grid gap-8 py-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <Panel title="Floor plan">
            <img src={listing.floorPlanUrl} alt="" className="h-72 w-full border border-neutral-300 bg-white object-cover" />
          </Panel>
          <Panel title="Included amenities">
            <TagList items={listing.includedAmenities} icon="check" />
          </Panel>
          <Panel title="Equipment add-ons">
            <div className="grid gap-3 md:grid-cols-2">
              {listingAddons.map((addon) => (
                <div key={addon.slug} className="flex items-center justify-between border border-neutral-200 p-3">
                  <span className="font-bold">{addon.name}</span>
                  <span className="font-black text-hazard">{formatCurrency(addon.pricePerBooking)}</span>
                </div>
              ))}
            </div>
          </Panel>
          <div className="grid gap-8 md:grid-cols-2">
            <Panel title="Permitted work">
              <TagList items={listing.permittedWork} icon="check" />
            </Panel>
            <Panel title="Prohibited work">
              <TagList items={listing.prohibitedWork} icon="x" />
            </Panel>
          </div>
          <Panel title="Safety rules">
            <TagList items={listing.safetyRules} icon="alert" />
          </Panel>
          <Panel title="Cancellation policy">
            <p className="font-bold text-steel">{listing.cancellationPolicy}</p>
          </Panel>
        </div>
        <aside className="h-fit border border-ink bg-white p-5">
          <p className="text-sm font-black uppercase text-hazard">Booking cost</p>
          <div className="mt-4 space-y-3">
            {[
              ["1 day", listing.prices.day],
              ["7 days", listing.prices.sevenDays],
              ["30 days", listing.prices.thirtyDays],
              ["60 days", listing.prices.sixtyDays],
              ["Cleaning fee", listing.cleaningFee],
              ["Deposit", listing.deposit.standard]
            ].map(([label, value]) => (
              <div key={String(label)} className="flex justify-between border-b border-neutral-200 pb-2">
                <span className="font-bold text-steel">{String(label)}</span>
                <span className="font-black">{formatCurrency(Number(value))}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm font-bold text-steel">Welding/hot work adds an extra deposit where available.</p>
          <a className="button-dark mt-5 w-full" href={`/checkout/${listing.slug}`}>
            Continue to checkout
          </a>
        </aside>
      </section>
    </main>
  );
}

function Spec({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="border border-white/20 p-3">
      <Icon className="mb-2 text-safety" size={20} aria-hidden="true" />
      <p className="text-xs font-black uppercase text-neutral-400">{label}</p>
      <p className="font-black">{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-neutral-300 bg-white p-5">
      <h2 className="mb-4 flex items-center gap-2 text-2xl font-black">
        <ClipboardList className="text-hazard" size={22} /> {title}
      </h2>
      {children}
    </section>
  );
}

function TagList({ items, icon }: { items: string[]; icon: "check" | "x" | "alert" }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => {
        const Icon = icon === "check" ? Check : icon === "x" ? X : ShieldAlert;
        return (
          <span key={item} className="inline-flex items-center gap-2 border border-neutral-200 bg-smoke px-3 py-2 text-sm font-bold">
            <Icon className={icon === "x" ? "text-red-700" : "text-hazard"} size={16} />
            {item}
          </span>
        );
      })}
    </div>
  );
}
