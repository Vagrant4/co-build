import Link from "next/link";
import { ArrowLeft, Database, Download, FileText, MessageSquare, Users } from "lucide-react";
import { prisma } from "@/src/lib/db";

export const dynamic = "force-dynamic";

const exportCards = [
  {
    countKey: "users",
    description: "Renter, host, and admin account records with verification and subscription status.",
    href: "/dashboard/admin/export/users.csv",
    icon: Users,
    title: "Users"
  },
  {
    countKey: "listings",
    description: "Space inventory, size, factory type, pricing, deposits, power, and loading access.",
    href: "/dashboard/admin/export/listings.csv",
    icon: Database,
    title: "Listings"
  },
  {
    countKey: "bookings",
    description: "Booking status, deal confirmations, work type, risk level, and calculated totals.",
    href: "/dashboard/admin/export/bookings.csv",
    icon: FileText,
    title: "Bookings"
  },
  {
    countKey: "messages",
    description: "Listing pre-deal chats and booking chats for admin review and dispute support.",
    href: "/dashboard/admin/export/messages.csv",
    icon: MessageSquare,
    title: "Messages"
  }
] as const;

export default async function AdminExportPage() {
  const [users, listings, bookings, bookingMessages, listingMessages] = await Promise.all([
    prisma.user.count(),
    prisma.listing.count(),
    prisma.booking.count(),
    prisma.bookingMessage.count(),
    prisma.listingMessage.count()
  ]);

  const counts = {
    bookings,
    listings,
    messages: bookingMessages + listingMessages,
    users
  };

  return (
    <main className="section-shell py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <Link className="mb-4 inline-flex items-center gap-2 text-sm font-black uppercase text-steel transition hover:text-ink" href="/dashboard/admin">
            <ArrowLeft size={16} /> Admin dashboard
          </Link>
          <p className="text-sm font-black uppercase text-hazard">CSV downloads</p>
          <h1 className="text-4xl font-black">Admin export center</h1>
          <p className="mt-2 max-w-3xl font-bold text-steel">
            Download clean operational records for review, reconciliation, backups, and handover. Exports are generated from the live database when clicked.
          </p>
        </div>
      </div>

      <section className="mb-8 grid gap-4 md:grid-cols-4">
        {exportCards.map((card) => (
          <div key={card.title} className="border border-neutral-300 border-l-4 border-l-hazard bg-white p-4">
            <p className="text-sm font-black uppercase text-steel">{card.title}</p>
            <p className="mt-1 text-3xl font-black">{counts[card.countKey]}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        {exportCards.map((card) => {
          const Icon = card.icon;

          return (
            <article key={card.href} className="border border-neutral-300 bg-white p-5">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center border border-ink bg-ink text-hazard">
                    <Icon size={22} />
                  </span>
                  <div>
                    <h2 className="text-2xl font-black">{card.title}</h2>
                    <p className="mt-1 font-bold text-steel">{card.description}</p>
                  </div>
                </div>
                <span className="status-pill">{counts[card.countKey]} rows</span>
              </div>
              <Link className="button-primary w-full justify-center" href={card.href}>
                <Download size={18} /> Download CSV
              </Link>
            </article>
          );
        })}
      </section>
    </main>
  );
}
