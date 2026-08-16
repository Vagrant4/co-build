import {
  ArrowRight,
  BadgeCheck,
  Bolt,
  CalendarDays,
  ClipboardCheck,
  Factory,
  Forklift,
  HardHat,
  MapPinned,
  MessageSquareLock,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Wrench
} from "lucide-react";
import { ListingCard } from "@/components/listing-card";
import { HeroSpaceCarousel } from "@/components/hero-space-carousel";
import { PricingTable } from "@/components/pricing-table";
import { SearchForm } from "@/components/search-form";
import { getApprovedListings } from "@/src/lib/repository";
import { sampleWorkshopPhotos, seedEquipmentAddons } from "@/src/lib/seed-data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const allListings = await getApprovedListings();
  const listings = allListings.slice(0, 6);
  const spaceCards = [
    {
      icon: Wrench,
      title: "Smaller than 1,000 sqft",
      body: "Compact workspaces for assembly, packing, electronics, repairs, prototyping, and short project staging."
    },
    {
      icon: PackageCheck,
      title: "Smaller than 5,000 sqft",
      body: "Flexible workshop areas for light fabrication, storage plus work area, and small contractor jobs."
    },
    {
      icon: Bolt,
      title: "Smaller than 10,000 sqft",
      body: "Larger fabrication areas with stronger power, loading access, and multi-team staging."
    },
    {
      icon: Forklift,
      title: "Bigger than 10,000 sqft",
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
      text: "Hosts declare factory type, fire safety, electrical supply, access rules, and allowed work."
    }
  ];
  const marketStats = [
    { value: `${allListings.length}`, label: "spaces to compare", detail: "Across key Singapore industrial areas" },
    { value: "1-60", label: "day bookings", detail: "With custom-duration requests available" },
    { value: "S$0", label: "deal commission", detail: "A simple S$5 monthly platform subscription" }
  ];
  const workflowCards = [
    {
      icon: MapPinned,
      label: "01 / Match",
      title: "Search by the actual job",
      body: "Compare location, required floor area, work type, power, loading, and equipment."
    },
    {
      icon: MessageSquareLock,
      label: "02 / Discuss",
      title: "Keep details in one chat",
      body: "Renter and host clarify scope, access, rates, and add-ons before confirming the deal."
    },
    {
      icon: ClipboardCheck,
      label: "03 / Approve",
      title: "Route risk to the right person",
      body: "Hosts review requests while high-risk work and factory mismatches go to admin."
    },
    {
      icon: ShieldCheck,
      label: "04 / Document",
      title: "Close with a clear record",
      body: "Pricing, safety acceptance, payment proof, contract, and handover photos stay together."
    }
  ];
  const spaceShowcase = [
    {
      title: "Fabrication bays",
      detail: "Power, benches and loading access",
      image: "/assets/spaceoncall-fabrication-bay.webp",
      href: "/search?workType=Light+fabrication"
    },
    {
      title: "Commercial kitchens",
      detail: "Food production and preparation space",
      image: "/assets/spaceoncall-commercial-kitchen.webp",
      href: "/search"
    },
    {
      title: "Pop-up retail",
      detail: "Flexible customer-facing space",
      image: "/assets/spaceoncall-popup-retail.webp",
      href: "/search"
    },
    {
      title: "Warehouse and cargo",
      detail: "Storage, fulfilment and loading",
      image: "/assets/spaceoncall-warehouse.webp",
      href: "/search?workType=Storage+%2B+work+area"
    }
  ];
  return (
    <main className="industrial-home">
      <section className="hero-stage">
        <HeroSpaceCarousel />
        <div className="hero-stage__overlay" />
        <div className="section-shell hero-stage__inner">
          <div className="hero-stage__copy">
            <div className="signal-kicker signal-kicker--dark">
              <HardHat size={18} /> On-demand business space / Singapore
            </div>
            <div>
              <h1 className="max-w-4xl text-5xl font-black leading-[0.96] text-white md:text-7xl">
                Space for business. Ready when you are.
              </h1>
              <p className="mt-5 max-w-2xl text-xl font-bold text-neutral-200">
                Book verified workshops, production bays and operating space by the day or month. Compare power,
                access, equipment and permitted use before you commit.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a className="button-primary" href="/search">
                Find a Space <ArrowRight size={18} />
              </a>
              <a className="button-secondary button-secondary--on-dark" href="/dashboard/host/listings/new">
                List Your Space <Factory size={18} />
              </a>
            </div>
          </div>
          <aside className="hero-proof-panel" aria-label="SpaceOnCall marketplace summary">
            <div className="hero-proof-panel__header">
              <Bolt size={22} aria-hidden="true" />
              <div>
                <p className="text-xs font-black uppercase text-hazard">Live operating view</p>
                <p className="mt-1 text-lg font-bold text-white">Every requirement visible before the deal.</p>
              </div>
            </div>
            <div className="hero-proof-panel__stats">
              {marketStats.map((stat) => (
                <div key={stat.label} className="hero-stat">
                  <p className="text-3xl font-black text-safety">{stat.value}</p>
                  <div>
                    <p className="text-sm font-black uppercase text-white">{stat.label}</p>
                    <p className="text-xs leading-5 text-neutral-300">{stat.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      <section className="home-search-band" aria-label="Find a fabrication workspace">
        <div className="section-shell">
          <SearchForm />
        </div>
      </section>

      <section className="market-strip">
        <div className="section-shell grid gap-3 md:grid-cols-3">
          {[
            { icon: MapPinned, label: "Search by real requirement", value: "Location, sqft, work type, loading, equipment" },
            { icon: ShieldCheck, label: "Controlled communication", value: "Renter and host chat stays inside SpaceOnCall" },
            { icon: CalendarDays, label: "Short-notice durations", value: "1 day, 7 days, 30 days, 60 days, or custom request" }
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="market-strip__item">
              <Icon size={22} className="text-hazard" />
              <div>
                <p className="text-sm font-black uppercase">{label}</p>
                <p className="text-sm font-bold text-steel">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="spaces" className="space-showcase" aria-labelledby="space-showcase-title">
        <div className="section-shell">
          <div className="space-showcase__heading">
            <div>
              <p className="text-sm font-black uppercase text-hazard">Space network</p>
              <h2 id="space-showcase-title" className="mt-2 text-3xl font-black text-white md:text-5xl">
                Built for work, trade and movement.
              </h2>
            </div>
            <a className="button-secondary button-secondary--on-dark" href="/search">
              Explore all spaces <ArrowRight size={18} />
            </a>
          </div>
          <div className="space-showcase__grid">
            {spaceShowcase.map((space, index) => (
              <a key={space.title} href={space.href} className="space-showcase__card">
                <img src={space.image} alt="" />
                <span className="space-showcase__shade" />
                <span className="space-showcase__index">0{index + 1}</span>
                <span className="space-showcase__copy">
                  <strong>{space.title}</strong>
                  <span>{space.detail}</span>
                </span>
                <ArrowRight className="space-showcase__arrow" size={21} aria-hidden="true" />
              </a>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="workflow-section py-16">
        <div className="section-shell">
          <div className="section-heading">
            <div>
              <p className="text-sm font-black uppercase text-hazard">One connected workflow</p>
              <h2 className="text-3xl font-black md:text-5xl">From first question to documented handover.</h2>
              <p className="mt-3 max-w-3xl text-lg text-steel">
                SpaceOnCall keeps the practical parts of an on-demand rental visible to renter, host, and admin.
              </p>
            </div>
            <a className="button-dark" href="/create-account">
              Start an account <ArrowRight size={18} />
            </a>
          </div>
          <div className="workflow-grid">
            {workflowCards.map(({ icon: Icon, label, title, body }) => (
              <article key={label} className="workflow-card">
                <div className="workflow-card__icon"><Icon size={22} aria-hidden="true" /></div>
                <p className="mt-5 text-xs font-black uppercase text-hazard">{label}</p>
                <h3 className="mt-2 text-xl font-black">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-steel">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell industrial-home__inventory py-16">
        <div className="section-heading">
          <div>
            <p className="text-sm font-black uppercase text-hazard">Live inventory</p>
            <h2 className="text-3xl font-black md:text-5xl">Showcase spaces that feel ready to book.</h2>
            <p className="mt-3 max-w-3xl text-lg text-steel">
              Compare real floor area, location, factory type, power, loading access, permitted work, and pricing.
            </p>
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

      <section className="feature-band py-16">
        <div className="section-shell grid gap-5 md:grid-cols-4">
          {spaceCards.map(({ icon: Icon, title, body }) => (
            <div key={title} className="feature-tile">
              <Icon className="mb-4 text-hazard" size={32} aria-hidden="true" />
              <h3 className="text-xl font-black">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-steel">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section-shell grid gap-10 py-16 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-sm font-black uppercase text-hazard">How it works</p>
          <h2 className="mt-2 text-3xl font-black md:text-5xl">Search, request, approve, pay, document.</h2>
          <p className="mt-4 text-lg text-steel">
            The MVP keeps the real operational controls visible: approvals, safety acceptance, deposits, cleaning fees,
            and check-in/check-out photos.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            "Search by location, required size, work type, duration, power, equipment, loading, and factory type.",
            "Review listing details including permitted work, prohibited work, safety rules, floor plan, and cancellation.",
            "Submit verification, choose add-ons, accept safety rules, and receive host/admin approval where needed.",
            "Submit payment proof, then upload check-in and check-out photos for deposit review."
          ].map((step, index) => (
            <div key={step} className="process-card">
              <p className="process-card__number">0{index + 1}</p>
              <p className="mt-2 font-bold leading-6">{step}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="feature-band py-16">
        <div className="section-shell">
          <div className="section-heading">
            <div>
              <p className="text-sm font-black uppercase text-hazard">Pricing</p>
              <h2 className="text-3xl font-black md:text-5xl">Clear rates, deposits, and cleaning fees.</h2>
            </div>
            <span className="status-pill status-pill--strong">No deal commission</span>
          </div>
          <PricingTable />
        </div>
      </section>

      <section className="section-shell grid gap-8 py-16 lg:grid-cols-2">
        <div className="co-build-showcase-panel">
          <p className="text-sm font-black uppercase text-hazard">Equipment add-ons</p>
          <h2 className="mt-2 text-3xl font-black md:text-4xl">Tools without uncontrolled heavy machine rental.</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {seedEquipmentAddons.map((addon) => (
              <span key={addon.slug} className="tool-chip">
                {addon.name}
              </span>
            ))}
          </div>
          <div className="workspace-photo-grid mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="sample workshop photos">
            {sampleWorkshopPhotos.map((photo) => (
              <figure key={photo.src} className="photo-tile">
                <img src={photo.src} alt={photo.label} className="aspect-[4/3] w-full object-cover" />
                <figcaption className="p-3">
                  <p className="text-sm font-black">{photo.label}</p>
                  <p className="mt-1 text-xs font-bold leading-5 text-steel">{photo.detail}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
        <div className="co-build-showcase-panel co-build-showcase-panel--dark">
          <p className="text-sm font-black uppercase text-safety">Safety and compliance</p>
          <h2 className="mt-2 text-3xl font-black text-white md:text-4xl">B1/B2 suitability with high-risk admin approval.</h2>
          <div className="mt-5 grid gap-3">
            {safetyCards.map(({ icon: Icon, text }) => (
              <div key={text} className="safety-row">
                <Icon className="mt-1 text-safety" size={20} />
                <p className="font-bold text-neutral-200">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="owner-cta py-16 text-white">
        <div className="section-shell grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase text-safety">For space owners</p>
            <h2 className="mt-2 text-4xl font-black md:text-6xl">Monetize idle workshop area without losing control.</h2>
            <p className="mt-4 max-w-2xl text-lg text-neutral-300">
              Hosts control allowed work, restricted work, access hours, equipment, deposits, cleaning rules, and
              availability before admin approval makes a listing searchable.
            </p>
          </div>
          <div className="owner-cta__box">
            <Sparkles size={24} className="text-safety" />
            <p className="text-2xl font-black">Publish clear availability and review every request before confirming.</p>
            <a href="/dashboard/host/listings/new" className="button-primary mt-5">
              Start host listing <ArrowRight size={18} />
            </a>
          </div>
        </div>
      </section>

      <section className="section-shell py-16">
        <div className="grid gap-4 md:grid-cols-2">
          {[
            ["Can I book for one day?", "Yes. MVP durations are 1 day, 7 days, 30 days, and 60 days."],
            ["Can I weld or grind?", "Only in suitable B2 spaces, and welding/hot work still requires admin approval."],
            ["Are deposits included?", "The checkout quote includes rental, deposit, cleaning fee, and selected equipment add-ons."],
            ["Are photos required?", "Yes. Check-in and check-out photos are required for deposit and dispute review."]
          ].map(([question, answer]) => (
            <div key={question} className="faq-tile">
              <h3 className="font-black">{question}</h3>
              <p className="mt-2 text-steel">{answer}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
