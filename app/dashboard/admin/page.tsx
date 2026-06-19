import Link from "next/link";
import { CheckCircle2, DollarSign, Download, ShieldAlert, SlidersHorizontal, UserX, XCircle } from "lucide-react";
import {
  approvePlatformSubscriptionAction,
  toggleUserSuspensionAction,
  updateBookingStatusAction,
  updateEquipmentPriceAction,
  updateListingPricingAction,
  updateListingStatusAction,
  updateUserVerificationAction
} from "@/app/actions";
import { StatusBadge } from "@/components/status-badge";
import { calculatePlatformSubscriptionRevenue, formatCurrency, PLATFORM_SUBSCRIPTION_MONTHLY } from "@/src/lib/fabrication";
import { getDashboardData } from "@/src/lib/repository";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const { users, listings, bookings, uploads, approvalEvents, equipment } = await getDashboardData();
  const subscriptionUsers = users.filter((user) => user.role === "RENTER" || user.role === "HOST");
  const activeSubscriptionCount = subscriptionUsers.filter((user) => user.platformSubscriptionStatus === "ACTIVE").length;
  const subscriptionRevenue = calculatePlatformSubscriptionRevenue(activeSubscriptionCount);
  const occupancy = listings.length ? Math.round((bookings.filter((booking) => ["PAID_CONFIRMED", "CHECKED_IN"].includes(booking.status)).length / listings.length) * 100) : 0;

  return (
    <main className="section-shell py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-hazard">Demo admin</p>
          <h1 className="text-4xl font-black">Admin dashboard</h1>
          <p className="mt-2 max-w-4xl font-bold text-steel">
            Admin collects {formatCurrency(PLATFORM_SUBSCRIPTION_MONTHLY)}/month from each active renter and host through Stripe.
            This is recurring monthly subscription revenue; deals are confirmed on-platform, and admin takes no deal commission.
          </p>
        </div>
        <Link className="button-secondary shrink-0" href="/dashboard/admin/export">
          <Download size={18} /> Export data
        </Link>
      </div>

      <section className="mb-8 grid gap-4 md:grid-cols-4">
        <Metric label="Listings" value={String(listings.length)} />
        <Metric label="Bookings" value={String(bookings.length)} />
        <Metric label="Stripe subscription revenue" value={formatCurrency(subscriptionRevenue)} />
        <Metric label="Occupancy" value={`${occupancy}%`} />
      </section>

      <DashboardSection title="Platform subscriptions">
        <div className="premium-panel mb-3 border border-neutral-300 bg-white p-4 font-bold text-steel">
          <p className="font-black text-ink">No deal commission</p>
          <p>Admin charges only {formatCurrency(PLATFORM_SUBSCRIPTION_MONTHLY)}/month to each active renter and host.</p>
          <p className="mt-2 font-black text-ink">Stripe recurring subscription revenue</p>
          <p>Subscriptions renew every month through the admin Stripe account until cancelled.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {subscriptionUsers.map((user) => {
            const nextRenewal = user.platformSubscriptionNextBilling ?? user.platformSubscriptionPeriodEnd;

            return (
              <article key={user.id} className="stripe-card border border-neutral-300 bg-white p-4">
                <div className="mb-2 flex flex-wrap gap-2">
                  <StatusBadge status={user.role} />
                  <StatusBadge status={user.platformSubscriptionStatus} />
                  <span className="status-pill">Stripe recurring plan</span>
                </div>
                <h3 className="text-lg font-black">{user.fullName}</h3>
                <p className="text-sm font-bold text-steel">{user.email}</p>
                <p className="mt-2 text-sm font-bold text-steel">
                  Stripe session: {user.platformSubscriptionReference || "No Stripe checkout submitted"}
                </p>
                <p className="mt-2 text-sm font-black">
                  Next renewal: {nextRenewal ? formatDate(nextRenewal) : "starts after activation"}
                </p>
                <form action={approvePlatformSubscriptionAction} className="mt-3">
                  <input type="hidden" name="userId" value={user.id} />
                  <button className="button-primary w-full" type="submit" disabled={user.platformSubscriptionStatus !== "PENDING_ADMIN"}>
                    Activate Stripe S$5/month subscription
                  </button>
                </form>
              </article>
            );
          })}
        </div>
      </DashboardSection>

      <DashboardSection title="Listing approvals">
        <div className="grid gap-4">
          {listings.map((listing) => (
            <article key={listing.id} className="grid gap-4 border border-neutral-300 bg-white p-4 lg:grid-cols-[1fr_360px]">
              <div>
                <div className="mb-2 flex flex-wrap gap-2">
                  <StatusBadge status={listing.status} />
                  <span className="status-pill">{listing.zoning}</span>
                </div>
                <h3 className="text-xl font-black">{listing.title}</h3>
                <p className="font-bold text-steel">
                  {listing.address} · {listing.sizeSqft} sqft · {listing.powerType.replace("_", " ")}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <ListingStatusButton listingId={listing.id} status="APPROVED" label="Approve" icon="approve" />
                <ListingStatusButton listingId={listing.id} status="REJECTED" label="Reject" icon="reject" />
                <ListingStatusButton listingId={listing.id} status="SUSPENDED" label="Suspend" icon="suspend" />
              </div>
            </article>
          ))}
        </div>
      </DashboardSection>

      <DashboardSection title="High-risk work and booking approvals">
        <div className="grid gap-4">
          {bookings.map((booking) => (
            <article key={booking.id} className="grid gap-4 border border-neutral-300 bg-white p-4 lg:grid-cols-[1fr_340px]">
              <div>
                <div className="mb-2 flex flex-wrap gap-2">
                  <StatusBadge status={booking.status} />
                  <StatusBadge status={booking.riskLevel} />
                </div>
                <h3 className="text-xl font-black">{booking.listing.title}</h3>
                <p className="font-bold text-steel">
                  {booking.user.fullName} · {booking.workType} · {formatCurrency(booking.grandTotal)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <BookingAdminButton bookingId={booking.id} action="ADMIN_APPROVE" label="Approve high-risk" disabled={booking.status !== "PENDING_ADMIN_HIGH_RISK"} />
                <BookingAdminButton bookingId={booking.id} action="ADMIN_REJECT" label="Reject high-risk" disabled={booking.status !== "PENDING_ADMIN_HIGH_RISK"} />
              </div>
            </article>
          ))}
        </div>
      </DashboardSection>

      <DashboardSection title="Users and verification">
        <div className="grid gap-4 md:grid-cols-3">
          {users.map((user) => (
            <article key={user.id} className="border border-neutral-300 bg-white p-4">
              <div className="mb-2 flex flex-wrap gap-2">
                <StatusBadge status={user.verificationStatus} />
                {user.suspended && <StatusBadge status="SUSPENDED" />}
              </div>
              <h3 className="text-lg font-black">{user.fullName}</h3>
              <p className="text-sm font-bold text-steel">{user.companyName}</p>
              <form action={updateUserVerificationAction} className="mt-3 grid gap-2">
                <input type="hidden" name="userId" value={user.id} />
                <select className="field" name="verificationStatus" defaultValue={user.verificationStatus}>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
                <button className="button-secondary" type="submit">Update verification</button>
              </form>
              <form action={toggleUserSuspensionAction} className="mt-2">
                <input type="hidden" name="userId" value={user.id} />
                <input type="hidden" name="suspended" value={String(!user.suspended)} />
                <button className="button-dark w-full" type="submit">
                  <UserX size={18} /> {user.suspended ? "Restore user" : "Suspend user"}
                </button>
              </form>
            </article>
          ))}
        </div>
      </DashboardSection>

      <DashboardSection title="Deposits, disputes, and photos">
        <div className="grid gap-3 md:grid-cols-2">
          {uploads.map((upload) => (
            <div key={upload.id} className="border border-neutral-300 bg-white p-4">
              <p className="font-black">{upload.type.replaceAll("_", " ")}</p>
              <p className="text-sm font-bold text-steel">{upload.originalName}</p>
              <p className="mt-2 text-xs font-bold text-steel">Stored locally for dispute/deposit review.</p>
            </div>
          ))}
        </div>
      </DashboardSection>

      <DashboardSection title="Equipment and pricing management">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="border border-neutral-300 bg-white p-4">
            <h3 className="mb-3 flex items-center gap-2 text-xl font-black">
              <SlidersHorizontal className="text-hazard" size={22} /> Equipment
            </h3>
            <div className="grid gap-2">
              {equipment.map((addon) => (
                <form key={addon.slug} action={updateEquipmentPriceAction} className="grid grid-cols-[1fr_120px_110px] gap-2">
                  <input type="hidden" name="slug" value={addon.slug} />
                  <span className="self-center font-bold">{addon.name}</span>
                  <input className="field" name="pricePerBooking" type="number" defaultValue={addon.pricePerBooking} />
                  <button className="button-secondary" type="submit">Save</button>
                </form>
              ))}
            </div>
          </div>
          <div className="border border-neutral-300 bg-white p-4">
            <h3 className="mb-3 flex items-center gap-2 text-xl font-black">
              <DollarSign className="text-hazard" size={22} /> Listing pricing
            </h3>
            <div className="grid gap-3">
              {listings.slice(0, 4).map((listing) => (
                <form key={listing.id} action={updateListingPricingAction} className="grid gap-2 border border-neutral-200 p-3">
                  <input type="hidden" name="listingId" value={listing.id} />
                  <p className="font-black">{listing.title}</p>
                  <div className="grid grid-cols-5 gap-2">
                    <input className="field" name="priceDay" type="number" defaultValue={listing.priceDay} />
                    <input className="field" name="priceThirtyDays" type="number" defaultValue={listing.priceThirtyDays} />
                    <input className="field" name="priceSixtyDays" type="number" defaultValue={listing.priceSixtyDays} />
                    <input className="field" name="depositStandard" type="number" defaultValue={listing.depositStandard} />
                    <input className="field" name="cleaningFee" type="number" defaultValue={listing.cleaningFee} />
                  </div>
                  <button className="button-secondary" type="submit">Save pricing</button>
                </form>
              ))}
            </div>
          </div>
        </div>
      </DashboardSection>

      <DashboardSection title="Approval event log">
        <div className="grid gap-2">
          {approvalEvents.map((event) => (
            <div key={event.id} className="border border-neutral-300 bg-white p-3">
              <p className="font-black">{event.decision} · {event.target}</p>
              <p className="text-sm font-bold text-steel">{event.note}</p>
            </div>
          ))}
        </div>
      </DashboardSection>
    </main>
  );
}

function DashboardSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-4 text-2xl font-black">{title}</h2>
      {children}
    </section>
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

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-SG", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function ListingStatusButton({ listingId, status, label, icon }: { listingId: string; status: "APPROVED" | "REJECTED" | "SUSPENDED"; label: string; icon: "approve" | "reject" | "suspend" }) {
  const Icon = icon === "approve" ? CheckCircle2 : icon === "reject" ? XCircle : ShieldAlert;
  return (
    <form action={updateListingStatusAction}>
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="status" value={status} />
      <button className={icon === "approve" ? "button-primary w-full" : "button-secondary w-full"} type="submit">
        <Icon size={18} /> {label}
      </button>
    </form>
  );
}

function BookingAdminButton({ bookingId, action, label, disabled }: { bookingId: string; action: "ADMIN_APPROVE" | "ADMIN_REJECT"; label: string; disabled: boolean }) {
  return (
    <form action={updateBookingStatusAction}>
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="action" value={action} />
      <input type="hidden" name="actorId" value="demo-admin" />
      <button className={action === "ADMIN_APPROVE" ? "button-primary w-full" : "button-secondary w-full"} disabled={disabled} type="submit">
        {label}
      </button>
    </form>
  );
}
