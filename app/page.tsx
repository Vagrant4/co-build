import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Bolt,
  CalendarDays,
  ClipboardCheck,
  Cpu,
  Factory,
  Forklift,
  Gauge,
  HardHat,
  MapPinned,
  MessageSquareLock,
  PackageCheck,
  Radar,
  ShieldCheck,
  Sparkles,
  Wrench
} from "lucide-react";
import { ListingCard } from "@/components/listing-card";
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
    { value: `${allListings.length}`, label: "showcase spaces", detail: "Across Kallang, Tuas, Woodlands, Ubi, Jurong, Bedok, and Changi" },
    { value: "20", label: "demo accounts", detail: "10 hosts and 10 renters ready for walkthroughs" },
    { value: "S$5", label: "monthly platform plan", detail: "No commission on deals made through Co-Build" }
  ];
  const commandCards = [
    {
      icon: Cpu,
      label: "Bay matching",
      metric: "Sqft + power + access",
      body: "Renter searches by exact project requirement instead of confusing bay names."
    },
    {
      icon: MessageSquareLock,
      label: "Locked chat",
      metric: "No outside contact",
      body: "Renter and host communicate inside Co-Build before confirming a deal."
    },
    {
      icon: ClipboardCheck,
      label: "Approval route",
      metric: "Host + admin gates",
      body: "High-risk work, factory mismatch, and safety exceptions are routed for review."
    },
    {
      icon: Gauge,
      label: "Deal totals",
      metric: "Rent + deposit + add-ons",
      body: "Duration pricing, cleaning fee, equipment add-ons, and payment proof stay visible."
    }
  ];

  return (
    <main>
      <section className="hero-stage">
        <img src="/assets/hero-fabrication-bay.png" alt="" className="hero-stage__image" />
        <div className="hero-stage__overlay" />
        <div className="section-shell hero-stage__inner">
          <div className="hero-stage__copy">
            <div className="signal-kicker signal-kicker--dark">
              <HardHat size={18} /> Singapore short-term fabrication bays
            </div>
            <div>
              <h1 className="max-w-4xl text-5xl font-black leading-[0.96] text-white md:text-7xl">
                Rent a fabrication bay for 1 day, 30 days, or 60 days.
              </h1>
              <p className="mt-5 max-w-2xl text-xl font-bold text-neutral-200">
                Workspace, power, loading access, tools, and optional equipment add-ons for contractors, makers,
                hardware teams, signage shops, furniture builders, and e-commerce operators.
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
            <div className="hero-search-wrap">
              <SearchForm />
            </div>
          </div>
          <div className="hero-command-panel" aria-label="Co-Build marketplace snapshot">
            <div className="hazard-stripe h-3" />
            <div className="grid gap-3 p-4">
              <div className="tech-status-line" aria-label="Marketplace system status">
                <span><Radar size={14} /> Network online</span>
                <span><Activity size={14} /> Live workflow</span>
              </div>
              <div className="border border-white/[0.15] bg-white/[0.08] p-4">
                <p className="text-sm font-black uppercase text-safety">Market-ready demo</p>
                <p className="mt-2 text-2xl font-black text-white">
                  Hosts, renters, chat, approvals, pricing, and deal flow are ready to show.
                </p>
              </div>
              {marketStats.map((stat) => (
                <div key={stat.label} className="hero-stat">
                  <p className="text-3xl font-black text-safety">{stat.value}</p>
                  <div>
                    <p className="text-sm font-black uppercase text-white">{stat.label}</p>
                    <p className="text-xs font-bold leading-5 text-neutral-300">{stat.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="market-strip">
        <div className="section-shell grid gap-3 md:grid-cols-3">
          {[
            { icon: MapPinned, label: "Search by real requirement", value: "Location, sqft, work type, loading, equipment" },
            { icon: ShieldCheck, label: "Controlled communication", value: "Renter and host chat stays inside Co-Build" },
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

      <section id="command-center" className="tech-bento-section py-16">
        <div className="section-shell">
          <div className="section-heading section-heading--dark">
            <div>
              <p className="text-sm font-black uppercase text-signal">Command center UX</p>
              <h2 className="text-3xl font-black text-white md:text-5xl">Every deal feels tracked, controlled, and ready.</h2>
              <p className="mt-3 max-w-3xl text-lg font-bold text-neutral-300">
                A high-tech marketplace should make the hard parts visible: matching, communication, approvals, pricing,
                photo records, and recurring platform subscription status.
              </p>
            </div>
            <a className="button-primary" href="/create-account">
              Create account <ArrowRight size={18} />
            </a>
          </div>

          <div className="tech-bento-grid">
            <article className="tech-bento-card tech-bento-card--large">
              <div className="tech-bento-card__screen">
                <div className="tech-bento-card__scan" />
                <div className="tech-route">
                  {["Search", "Chat", "Approve", "Pay", "Check-in"].map((step, index) => (
                    <span key={step} data-step={`0${index + 1}`}>
                      {step}
                    </span>
                  ))}
                </div>
              </div>
              <p className="mt-5 text-sm font-black uppercase text-signal">Live deal path</p>
              <h3 className="mt-2 text-3xl font-black text-white">From short-notice search to closed deal.</h3>
              <p className="mt-3 max-w-2xl font-bold leading-7 text-neutral-300">
                Renter, host, and admin actions are separated clearly so the platform feels controlled rather than casual.
              </p>
            </article>

            {commandCards.map(({ icon: Icon, label, metric, body }) => (
              <article key={label} className="tech-bento-card">
                <Icon size={28} className="text-signal" aria-hidden="true" />
                <p className="mt-4 text-sm font-black uppercase text-neutral-400">{label}</p>
                <h3 className="mt-1 text-xl font-black text-white">{metric}</h3>
                <p className="mt-3 text-sm font-bold leading-6 text-neutral-300">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell py-16">
        <div className="section-heading">
          <div>
            <p className="text-sm font-black uppercase text-hazard">Live inventory</p>
            <h2 className="text-3xl font-black md:text-5xl">Showcase spaces that feel ready to book.</h2>
            <p className="mt-3 max-w-3xl text-lg font-bold text-steel">
              A fuller marketplace makes the MVP feel credible: different locations, factory types, power setups,
              booking statuses, chat histories, and pricing examples.
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
            <p className="mt-4 max-w-2xl text-lg font-bold text-neutral-300">
              Hosts control allowed work, restricted work, access hours, equipment, deposits, cleaning rules, and
              availability before admin approval makes a listing searchable.
            </p>
          </div>
          <div className="owner-cta__box">
            <Sparkles size={24} className="text-safety" />
            <p className="text-2xl font-black">Launch with dummy demand signals, then replace with real hosts as they join.</p>
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
