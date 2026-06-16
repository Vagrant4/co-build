import { ArrowRight, BadgeCheck, Bolt, Factory, Forklift, HardHat, PackageCheck, ShieldCheck, Wrench } from "lucide-react";
import { ListingCard } from "@/components/listing-card";
import { PricingTable } from "@/components/pricing-table";
import { SearchForm } from "@/components/search-form";
import { getApprovedListings } from "@/src/lib/repository";
import { seedEquipmentAddons } from "@/src/lib/seed-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const listings = (await getApprovedListings()).slice(0, 3);
  const spaceCards = [
    {
      icon: Wrench,
      title: "Smaller than 100 sqft",
      body: "Compact benches and short-use work areas for assembly, packing, electronics, repairs, and prototyping."
    },
    {
      icon: PackageCheck,
      title: "100-250 sqft",
      body: "Short project spaces for light fabrication, storage plus work area, and small contractor jobs."
    },
    {
      icon: Bolt,
      title: "250-1,000 sqft",
      body: "Larger fabrication spaces with stronger power, loading access, and project staging."
    },
    {
      icon: Forklift,
      title: "Bigger than 1,000 sqft",
      body: "Custom-sized project areas for oversized work, lorry access, and deeper admin review."
    }
  ];
  const safetyCards = [
    {
      icon: ShieldCheck,
      text: "PPE, waste clearance, no blocked access, and photo records are required."
    },
    {
      icon: BadgeCheck,
      text: "Hot work, welding, spray painting, and chemical work require approval before payment."
    },
    {
      icon: Factory,
      text: "Hosts declare landlord approval, insurance, fire safety, electrical supply, and allowed work."
    }
  ];
  const workspacePhotos = [
    {
      src: "/assets/maker-bench.png",
      label: "Bench workspace",
      detail: "Compact setup for assembly and repairs"
    },
    {
      src: "/assets/medium-bay.png",
      label: "Project bay",
      detail: "Open floor area with power and staging"
    },
    {
      src: "/assets/large-bay.png",
      label: "Large workshop area",
      detail: "Bigger bay for fabrication projects"
    }
  ];

  return (
    <main>
      <section className="industrial-grid border-b border-neutral-300 bg-smoke">
        <div className="section-shell grid min-h-[calc(100vh-4rem)] items-center gap-8 py-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 border border-ink bg-white px-3 py-2 text-sm font-black">
              <HardHat size={18} /> Singapore short-term fabrication bays
            </div>
            <div>
              <h1 className="max-w-4xl text-5xl font-black leading-[0.98] md:text-7xl">
                Rent a fabrication bay for 1 day, 30 days, or 60 days.
              </h1>
              <p className="mt-5 max-w-2xl text-xl font-bold text-steel">
                Workspace, power, loading access, tools, and optional equipment add-ons for contractors, makers,
                hardware teams, signage shops, furniture builders, and e-commerce operators.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a className="button-primary" href="/search">
                Find a Space <ArrowRight size={18} />
              </a>
              <a className="button-secondary" href="/dashboard/host/listings/new">
                List Your Space <Factory size={18} />
              </a>
            </div>
            <SearchForm />
          </div>
          <div className="relative min-h-[520px] overflow-hidden border border-ink bg-ink">
            <img src="/assets/hero-fabrication-bay.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-95" />
            <div className="absolute left-0 top-0 h-4 w-full hazard-stripe" />
            <div className="absolute bottom-0 left-0 right-0 grid gap-2 bg-ink/90 p-5 text-white sm:grid-cols-3">
              {[
                ["4", "space types"],
                ["B1/B2", "factory type"],
                ["1-60", "day bookings"]
              ].map(([value, label]) => (
                <div key={label} className="border border-white/20 p-3">
                  <p className="text-3xl font-black text-safety">{value}</p>
                  <p className="text-sm font-bold uppercase text-neutral-200">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-shell py-14">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-black uppercase text-hazard">Live inventory</p>
            <h2 className="text-3xl font-black md:text-4xl">State the size required for short-notice work</h2>
          </div>
          <a className="button-dark" href="/search">
            Browse all spaces <ArrowRight size={18} />
          </a>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard key={listing.slug} listing={listing} />
          ))}
        </div>
      </section>

      <section className="border-y border-neutral-300 bg-white py-14">
        <div className="section-shell grid gap-5 md:grid-cols-4">
          {spaceCards.map(({ icon: Icon, title, body }) => (
            <div key={title} className="border border-neutral-300 p-5">
              <Icon className="mb-4 text-hazard" size={32} aria-hidden="true" />
              <h3 className="text-xl font-black">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-steel">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section-shell grid gap-10 py-14 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-sm font-black uppercase text-hazard">How it works</p>
          <h2 className="mt-2 text-3xl font-black md:text-4xl">Search, request, approve, pay, document.</h2>
          <p className="mt-4 text-lg font-bold text-steel">
            The MVP keeps the real operational controls visible: approvals, safety acceptance, deposits, cleaning fees,
            and check-in/check-out photos.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            "Search by location, required size, work type, duration, power, equipment, loading, and factory type.",
            "Review listing details including permitted work, prohibited work, safety rules, floor plan, and cancellation.",
            "Submit verification, choose add-ons, accept safety rules, and receive host/admin approval where needed.",
            "Complete demo Stripe checkout, then upload check-in and check-out photos for deposit review."
          ].map((step, index) => (
            <div key={step} className="border border-neutral-300 bg-white p-5">
              <p className="text-sm font-black text-hazard">0{index + 1}</p>
              <p className="mt-2 font-bold leading-6">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-neutral-300 bg-white py-14">
        <div className="section-shell">
          <div className="mb-6">
            <p className="text-sm font-black uppercase text-hazard">Pricing</p>
            <h2 className="text-3xl font-black md:text-4xl">Clear rates, deposits, and cleaning fees.</h2>
          </div>
          <PricingTable />
        </div>
      </section>

      <section className="section-shell grid gap-8 py-14 lg:grid-cols-2">
        <div className="card p-6">
          <p className="text-sm font-black uppercase text-hazard">Equipment add-ons</p>
          <h2 className="mt-2 text-3xl font-black">Tools without uncontrolled heavy machine rental.</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {seedEquipmentAddons.map((addon) => (
              <span key={addon.slug} className="border border-neutral-300 bg-white px-3 py-2 text-sm font-bold">
                {addon.name}
              </span>
            ))}
          </div>
          <div className="workspace-photo-grid mt-6 grid gap-3 sm:grid-cols-3">
            {workspacePhotos.map((photo) => (
              <figure key={photo.src} className="overflow-hidden border border-neutral-300 bg-white">
                <img src={photo.src} alt={photo.label} className="aspect-[4/3] w-full object-cover" />
                <figcaption className="border-t border-neutral-200 p-3">
                  <p className="text-sm font-black">{photo.label}</p>
                  <p className="mt-1 text-xs font-bold leading-5 text-steel">{photo.detail}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
        <div className="card p-6">
          <p className="text-sm font-black uppercase text-hazard">Safety and compliance</p>
          <h2 className="mt-2 text-3xl font-black">B1/B2 suitability with high-risk admin approval.</h2>
          <div className="mt-5 grid gap-3">
            {safetyCards.map(({ icon: Icon, text }) => (
              <div key={text} className="flex gap-3 border border-neutral-200 p-3">
                <Icon className="mt-1 text-hazard" size={20} />
                <p className="font-bold text-steel">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink py-14 text-white">
        <div className="section-shell grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase text-safety">For space owners</p>
            <h2 className="mt-2 text-4xl font-black">Monetize idle workshop area without losing control.</h2>
            <p className="mt-4 max-w-2xl text-lg font-bold text-neutral-300">
              Hosts control allowed work, restricted work, access hours, equipment, deposits, cleaning rules, and
              availability before admin approval makes a listing searchable.
            </p>
          </div>
          <a href="/dashboard/host/listings/new" className="button-primary">
            Start host listing <ArrowRight size={18} />
          </a>
        </div>
      </section>

      <section className="section-shell py-14">
        <div className="grid gap-4 md:grid-cols-2">
          {[
            ["Can I book for one day?", "Yes. MVP durations are 1 day, 7 days, 30 days, and 60 days."],
            ["Can I weld or grind?", "Only in suitable B2 spaces, and welding/hot work still requires admin approval."],
            ["Are deposits included?", "The checkout quote includes rental, deposit, cleaning fee, and selected equipment add-ons."],
            ["Are photos required?", "Yes. Check-in and check-out photos are required for deposit and dispute review."]
          ].map(([question, answer]) => (
            <div key={question} className="border border-neutral-300 bg-white p-5">
              <h3 className="font-black">{question}</h3>
              <p className="mt-2 text-steel">{answer}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
