import { BadgeDollarSign, CheckCircle2, Download, Factory, XCircle } from "lucide-react";
import {
  approveAdditionalRequirementAction,
  confirmDealAction,
  rejectAdditionalRequirementAction,
  submitPlatformSubscriptionPaymentAction,
  updateBookingStatusAction
} from "@/app/actions";
import { BookingChat } from "@/components/booking-chat";
import { ListingChat } from "@/components/listing-chat";
import { StatusBadge } from "@/components/status-badge";
import { PrivacyRequestPanel } from "@/components/privacy-request-panel";
import { dealConfirmationStatus, formatCurrency, PLATFORM_SUBSCRIPTION_MONTHLY } from "@/src/lib/fabrication";
import { prisma } from "@/src/lib/db";
import { requirePageRole } from "@/src/lib/page-authorization";

export const dynamic = "force-dynamic";

export default async function HostDashboardPage() {
  const host = await requirePageRole("HOST");
  const [listings, bookings, additionalRequests, privacyRequests] = await Promise.all([
    prisma.listing.findMany({
      where: { hostId: host.id },
      include: {
        bookings: true,
        conversations: {
          where: { hostId: host.id },
          include: { renter: true, messages: { include: { sender: true }, orderBy: { createdAt: "asc" } } },
          orderBy: { updatedAt: "desc" }
        }
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
    }),
    prisma.privacyRequest.findMany({ where: { userId: host.id }, orderBy: { createdAt: "desc" }, take: 10 })
  ]);
  const listingActionLabel = listings.length > 1 ? "Additional listing" : "New listing";

  return (
    <main className="section-shell py-8">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-hazard">Host workspace</p>
          <h1 className="text-4xl font-black">Host dashboard</h1>
        <p className="mt-2 font-bold text-steel">Approve bookings, review risk routing, and track company-account subscription status.</p>
        </div>
        <a className="button-primary" href="/dashboard/host/listings/new">
          <Factory size={18} /> {listingActionLabel}
        </a>
      </div>

      <PlatformSubscriptionPanel
        title="Host platform subscription"
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
            additionalRequests.map((request) => <AdditionalRequirementApproval key={request.id} request={request} />)
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
                    title="Chat with renter"
                    currentUserId={host.id}
                    placeholder="Message the renter about access, safety, equipment, or timing."
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <a className="button-secondary w-full" href={`/dashboard/bookings/${booking.id}/agreement`}>
                  View booking agreement
                </a>
                <a className="button-secondary w-full" href={`/api/bookings/${booking.id}/documents/booking-summary`}><Download size={18} aria-hidden="true" /> Download PDF</a>
                <BookingAction bookingId={booking.id} action="HOST_APPROVE" label="Approve" icon="approve" disabled={booking.status !== "PENDING_HOST"} />
                <BookingAction bookingId={booking.id} action="HOST_REJECT" label="Reject" icon="reject" disabled={booking.status !== "PENDING_HOST"} />
                <DealConfirmationForm bookingId={booking.id} confirmed={Boolean(booking.hostDealConfirmedAt)} />
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
              <div className="mt-4 grid gap-3">
                {listing.conversations.length ? listing.conversations.map((conversation) => (
                  <ListingChat
                    key={conversation.id}
                    listingId={listing.id}
                    conversationId={conversation.id}
                    messages={conversation.messages}
                    currentUserId={host.id}
                    title={`Chat with ${conversation.renter.fullName}`}
                    placeholder="Reply about availability, access, loading, equipment, or timing."
                    variant="compact"
                  />
                )) : <p className="border border-dashed border-neutral-300 p-3 text-sm font-bold text-steel">No pre-booking conversations yet.</p>}
              </div>
              <p className="mt-3 font-black">
                {listing.sizeSqft} sqft / {formatCurrency(listing.priceDay)}/day / {formatCurrency(listing.priceThirtyDays)}/30 days
              </p>
            </article>
          ))}
        </div>
      </section>
      <PrivacyRequestPanel requests={privacyRequests} />
    </main>
  );
}

function PlatformSubscriptionPanel({
  title,
  email,
  status,
  reference,
  nextBillingAt,
  periodEndAt,
  labelPrefix
}: {
  title: string;
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
        <input type="hidden" name="paymentReference" value={`company_account_${labelPrefix.toLowerCase()}_${Date.now()}`} />
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
  booking: {
    durationDays: number;
    listing: { title: string };
  };
  user: {
    fullName: string;
  };
};

function AdditionalRequirementApproval({ request }: { request: HostAdditionalRequirementView }) {
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
        {request.quotedRate > 0 && <p className="mt-3 text-sm font-black text-hazard">Approved add-on record is available in both dashboards.</p>}
      </div>
      <div className="grid gap-2">
        {request.status === "PENDING_HOST" ? (
          <>
            <form action={approveAdditionalRequirementAction} className="grid gap-2 border border-neutral-200 bg-white p-3">
              <input type="hidden" name="requestId" value={request.id} />
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

function DealConfirmationForm({ bookingId, confirmed }: { bookingId: string; confirmed: boolean }) {
  return confirmed ? (
    <div className="border border-neutral-200 bg-white p-3 text-sm font-black text-steel">Deal confirmed on platform.</div>
  ) : (
    <form action={confirmDealAction} className="grid gap-2 border border-neutral-200 bg-white p-3">
      <input type="hidden" name="bookingId" value={bookingId} />
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
  disabled
}: {
  bookingId: string;
  action: "HOST_APPROVE" | "HOST_REJECT";
  label: string;
  icon: "approve" | "reject";
  disabled: boolean;
}) {
  const Icon = icon === "approve" ? CheckCircle2 : XCircle;
  return (
    <form action={updateBookingStatusAction}>
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="action" value={action} />
      <button className={icon === "approve" ? "button-primary w-full" : "button-secondary w-full"} disabled={disabled} type="submit">
        <Icon size={18} /> {label}
      </button>
    </form>
  );
}
