import { BadgeDollarSign, CheckCircle2, Factory, XCircle } from "lucide-react";
import {
  approveAdditionalRequirementAction,
  confirmDealAction,
  rejectAdditionalRequirementAction,
  submitPlatformSubscriptionPaymentAction,
  updateBookingStatusAction
} from "@/app/actions";
import { BookingChat } from "@/components/booking-chat";
import { DemoAccountSelector } from "@/components/demo-account-selector";
import { ListingChat } from "@/components/listing-chat";
import { StatusBadge } from "@/components/status-badge";
import { dealConfirmationStatus, formatCurrency, PLATFORM_SUBSCRIPTION_MONTHLY } from "@/src/lib/fabrication";
import { prisma } from "@/src/lib/db";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<string, string | string[] | undefined>;
};

export default async function HostDashboardPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const requestedAccountId = one(params.account);
  const hostAccounts = await prisma.user.findMany({ where: { role: "HOST" }, orderBy: { createdAt: "asc" } });
  const host = hostAccounts.find((account) => account.id === requestedAccountId) ?? hostAccounts.find((account) => account.id === "demo-host") ?? hostAccounts[0];
  const [listings, bookings, additionalRequests] = await Promise.all([
    prisma.listing.findMany({
      where: { hostId: host.id },
      include: {
        bookings: true,
        listingMessages: { include: { sender: true }, orderBy: { createdAt: "asc" } }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.booking.findMany({
      where: { listing: { hostId: host.id } },
      include: {
        listing: true,
        user: true,
        addons: { include: { equipmentAddon: true } },
        messages: { include: { sender: true }, orderBy: { createdAt: "asc" } }
      },
      orderBy: { createdAt: "desc" }
    }),
    prisma.additionalRequirement.findMany({
      where: { booking: { listing: { hostId: host.id } } },
      include: { user: true, booking: { include: { listing: true } } },
      orderBy: { createdAt: "desc" }
    })
  ]);
  const listingActionLabel = listings.length > 1 ? "Additional listing" : "New listing";

  return (
    <main className="section-shell py-8">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-hazard">Demo host</p>
          <h1 className="text-4xl font-black">Host dashboard</h1>
        <p className="mt-2 font-bold text-steel">Approve bookings, review risk routing, and track company-account subscription status.</p>
        </div>
        <a className="button-primary" href={`/dashboard/host/listings/new?account=${host.id}`}>
          <Factory size={18} /> {listingActionLabel}
        </a>
      </div>

      <DemoAccountSelector accounts={hostAccounts} currentAccountId={host.id} hrefBase="/dashboard/host" label="Choose host account" />

      <PlatformSubscriptionPanel
        title="Host platform subscription"
        userId={host.id}
        email={host.email}
        status={host.platformSubscriptionStatus}
        reference={host.platformSubscriptionReference}
        nextBillingAt={host.platformSubscriptionNextBilling}
        periodEndAt={host.platformSubscriptionPeriodEnd}
        labelPrefix="Host"
      />

      <section className="mb-8 grid gap-4 md:grid-cols-3">
        <Metric label="Host listings" value={String(listings.length)} />
        <Metric label="Pending booking requests" value={String(bookings.filter((booking) => booking.status === "PENDING_HOST").length)} />
        <Metric label="Projected revenue" value={formatCurrency(bookings.reduce((sum, booking) => sum + booking.rentalTotal, 0))} />
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-black">Additional requirement approvals</h2>
        <div className="grid gap-4">
          {additionalRequests.length ? (
            additionalRequests.map((request) => <AdditionalRequirementApproval key={request.id} request={request} actorId={host.id} />)
          ) : (
            <div className="border border-neutral-300 bg-white p-5 font-bold text-steel">No additional requirements pending.</div>
          )}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-2xl font-black">Booking requests</h2>
        <div className="grid gap-4">
          {bookings.map((booking) => (
            <article key={booking.id} className="card grid gap-4 p-5 lg:grid-cols-[1fr_280px]">
              <div>
                <div className="mb-2 flex flex-wrap gap-2">
                  <StatusBadge status={booking.status} />
                  <StatusBadge status={booking.riskLevel} />
                  <StatusBadge status={dealConfirmationStatus(booking.renterDealConfirmedAt, booking.hostDealConfirmedAt)} />
                </div>
                <h3 className="text-xl font-black">{booking.listing.title}</h3>
                <p className="font-bold text-steel">
                  {booking.user.fullName} / {booking.workType} / {booking.durationDays} days
                </p>
                <p className="mt-2 font-black">{formatCurrency(booking.grandTotal)} total</p>
                <div className="mt-4">
                  <BookingChat
                    bookingId={booking.id}
                    messages={booking.messages}
                    senderRole="HOST"
                    title="Chat with renter"
                    senderId={host.id}
                    placeholder="Message the renter about access, safety, equipment, or timing."
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <BookingAction bookingId={booking.id} action="HOST_APPROVE" label="Approve" icon="approve" actorId={host.id} disabled={booking.status !== "PENDING_HOST"} />
                <BookingAction bookingId={booking.id} action="HOST_REJECT" label="Reject" icon="reject" actorId={host.id} disabled={booking.status !== "PENDING_HOST"} />
                <DealConfirmationForm bookingId={booking.id} confirmed={Boolean(booking.hostDealConfirmedAt)} actorId={host.id} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-2xl font-black">Your listings</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {listings.map((listing) => (
            <article key={listing.id} className="border border-neutral-300 bg-white p-5">
              <div className="mb-3 flex flex-wrap gap-2">
                <StatusBadge status={listing.status} />
                <span className="status-pill">{listing.zoning}</span>
              </div>
              <h3 className="text-xl font-black">{listing.title}</h3>
              <p className="text-sm font-bold text-steel">{listing.address}</p>
              <div className="mt-4">
                <ListingChat
                  listingSlug={listing.slug}
                  messages={listing.listingMessages}
                  senderRole="HOST"
                  title="Chat with renter before deal"
                  placeholder="Reply about availability, access, loading, equipment, or timing."
                  variant="compact"
                  senderId={host.id}
                />
              </div>
              <p className="mt-3 font-black">
                {listing.sizeSqft} sqft / {formatCurrency(listing.priceDay)}/day / {formatCurrency(listing.priceThirtyDays)}/30 days
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

function PlatformSubscriptionPanel({
  title,
  userId,
  email,
  status,
  reference,
  nextBillingAt,
  periodEndAt,
  labelPrefix
}: {
  title: string;
  userId: string;
  email: string;
  status: string;
  reference: string | null;
  nextBillingAt: Date | null;
  periodEndAt: Date | null;
  labelPrefix: string;
}) {
  const nextRenewal = nextBillingAt ?? periodEndAt;

  return (
    <section className="card mb-8 grid gap-4 p-5 premium-panel lg:grid-cols-[1fr_360px]">
      <div>
        <div className="mb-2 flex flex-wrap gap-2">
          <StatusBadge status={status} />
          <span className="status-pill">{formatCurrency(PLATFORM_SUBSCRIPTION_MONTHLY)}/month</span>
          <span className="status-pill">Recurring company-account plan</span>
        </div>
        <h2 className="text-2xl font-black">{title}</h2>
        <p className="mt-2 font-bold text-steel">
          User and host each pay admin {formatCurrency(PLATFORM_SUBSCRIPTION_MONTHLY)}/month for platform access to the company account.
          Admin activates the recurring subscription after payment proof; deals are confirmed on-platform with no commission.
        </p>
        <p className="mt-2 text-sm font-black">
          Next renewal: {nextRenewal ? formatDate(nextRenewal) : "starts after admin activates your recurring subscription"}
        </p>
        <p className="mt-2 text-sm font-black">Login email: {email}</p>
        {reference && <p className="mt-2 text-sm font-bold text-steel">Latest payment reference: {reference}</p>}
      </div>
      <form action={submitPlatformSubscriptionPaymentAction} className="payment-card grid content-between gap-3 border border-neutral-200 bg-white p-4">
        <input type="hidden" name="userId" value={userId} />
        <input type="hidden" name="paymentReference" value={`company_account_${labelPrefix.toLowerCase()}_${userId}`} />
        <div>
          <p className="label">{labelPrefix} company-account payment</p>
          <p className="text-sm font-bold text-steel">Submit the recurring S$5/month payment reference. Admin activates after checking the company account.</p>
        </div>
        <button className="button-primary" type="submit">
          Submit payment reference
        </button>
      </form>
    </section>
  );
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

type HostAdditionalRequirementView = {
  id: string;
  detail: string;
  status: string;
  quotedRate: number;
  emailedTo: string | null;
  booking: {
    durationDays: number;
    listing: { title: string };
  };
  user: {
    fullName: string;
  };
};

function AdditionalRequirementApproval({ request, actorId }: { request: HostAdditionalRequirementView; actorId: string }) {
  return (
    <article data-additional-request className="card grid gap-4 p-5 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="mb-2 flex flex-wrap gap-2">
          <StatusBadge status={request.status} />
          {request.quotedRate > 0 && <span className="status-pill">{formatCurrency(request.quotedRate)}</span>}
        </div>
        <h3 className="text-xl font-black">{request.booking.listing.title}</h3>
        <p className="font-bold text-steel">
          {request.user.fullName} - {request.booking.durationDays} days
        </p>
        <p className="mt-3 font-bold">{request.detail}</p>
        {request.emailedTo && <p className="mt-3 text-sm font-black text-hazard">Contract sent to renter login email.</p>}
      </div>
      <div className="grid gap-2">
        {request.status === "PENDING_HOST" ? (
          <>
            <form action={approveAdditionalRequirementAction} className="grid gap-2 border border-neutral-200 bg-white p-3">
              <input type="hidden" name="requestId" value={request.id} />
              <input type="hidden" name="hostId" value={actorId} />
              <label>
                <span className="label">Add-on rate</span>
                <input className="field" name="quotedRate" type="number" min="1" defaultValue="150" />
              </label>
              <button className="button-primary w-full" type="submit">
                <BadgeDollarSign size={18} /> Approve add-on
              </button>
            </form>
            <form action={rejectAdditionalRequirementAction}>
              <input type="hidden" name="requestId" value={request.id} />
              <input type="hidden" name="hostId" value={actorId} />
              <button className="button-secondary w-full" type="submit">
                <XCircle size={18} /> Reject add-on
              </button>
            </form>
          </>
        ) : (
          <div className="border border-neutral-200 bg-white p-3 text-sm font-bold text-steel">
            Rate approval status is visible to the renter for payment.
          </div>
        )}
      </div>
    </article>
  );
}

function DealConfirmationForm({ bookingId, confirmed, actorId }: { bookingId: string; confirmed: boolean; actorId: string }) {
  return confirmed ? (
    <div className="border border-neutral-200 bg-white p-3 text-sm font-black text-steel">Deal confirmed on platform.</div>
  ) : (
    <form action={confirmDealAction} className="grid gap-2 border border-neutral-200 bg-white p-3">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="role" value="HOST" />
      <input type="hidden" name="actorId" value={actorId} />
      <p className="text-sm font-bold text-steel">Confirm this deal on-platform. Admin does not charge a deal commission.</p>
      <button className="button-secondary" type="submit">
        Confirm deal as host
      </button>
    </form>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-neutral-300 bg-white p-5">
      <p className="text-sm font-black uppercase text-steel">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </div>
  );
}

function BookingAction({
  bookingId,
  action,
  label,
  icon,
  actorId,
  disabled
}: {
  bookingId: string;
  action: "HOST_APPROVE" | "HOST_REJECT";
  label: string;
  icon: "approve" | "reject";
  actorId: string;
  disabled: boolean;
}) {
  const Icon = icon === "approve" ? CheckCircle2 : XCircle;
  return (
    <form action={updateBookingStatusAction}>
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="action" value={action} />
      <input type="hidden" name="actorId" value={actorId} />
      <button className={icon === "approve" ? "button-primary w-full" : "button-secondary w-full"} disabled={disabled} type="submit">
        <Icon size={18} /> {label}
      </button>
    </form>
  );
}

function one(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
