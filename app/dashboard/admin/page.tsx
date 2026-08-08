import Link from "next/link";
import { CheckCircle2, DollarSign, Download, ShieldAlert, SlidersHorizontal, UserX, XCircle } from "lucide-react";
import {
  approvePlatformSubscriptionAction,
  executeAccountDeletionAction,
  resolvePrivacyRequestAction,
  reviewAdditionalRequirementPaymentAction,
  reviewBookingPaymentAction,
  reviewModerationReportAction,
  toggleUserSuspensionAction,
  updateBookingStatusAction,
  updateDepositStatusAction,
  updateEquipmentPriceAction,
  updateListingPricingAction,
  updateListingStatusAction,
  updateUserVerificationAction
} from "@/app/actions";
import { LaunchReadinessPanel } from "@/components/launch-readiness-panel";
import { StatusBadge } from "@/components/status-badge";
import { NotificationCenter } from "@/components/notification-center";
import { calculatePlatformSubscriptionRevenue, formatCurrency, PLATFORM_SUBSCRIPTION_MONTHLY } from "@/src/lib/fabrication";
import { getDashboardData } from "@/src/lib/repository";
import { requirePageRole } from "@/src/lib/page-authorization";
import { getAppMode } from "@/src/lib/app-mode";
import { prisma } from "@/src/lib/db";

export const dynamic = "force-dynamic";

type PageProps = { searchParams?: Promise<{ page?: string }> | { page?: string } };

export default async function AdminDashboardPage({ searchParams }: PageProps) {
  const admin = await requirePageRole("ADMIN");
  const params = (await searchParams) ?? {};
  const requestedPage = Number(params.page);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [{ users, listings, bookings, uploads, approvalEvents, equipment, payments, privacyRequests, moderationReports, pagination, totals }, notifications] = await Promise.all([
    getDashboardData({ page }),
    prisma.notification.findMany({ where: { userId: admin.id, channel: "IN_APP" }, orderBy: { createdAt: "desc" }, take: 20 })
  ]);
  const subscriptionUsers = users.filter((user) => user.role === "RENTER" || user.role === "HOST");
  const activeSubscriptionCount = totals.activeSubscriptionCount;
  const subscriptionRevenue = calculatePlatformSubscriptionRevenue(activeSubscriptionCount);
  const occupancy = totals.listingCount ? Math.round((totals.occupiedBookingCount / totals.listingCount) * 100) : 0;

  return (
    <main className="section-shell py-8">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-black uppercase text-hazard">{getAppMode() === "demo" ? "Demo admin" : "Administrator"}</p>
          <h1 className="text-4xl font-black">Admin dashboard</h1>
          <p className="mt-2 max-w-4xl font-bold text-steel">
            Admin collects {formatCurrency(PLATFORM_SUBSCRIPTION_MONTHLY)}/month from each active renter and host through the company account.
            This is recurring monthly subscription revenue; deals are confirmed on-platform, and admin takes no deal commission.
          </p>
        </div>
        <Link className="button-secondary shrink-0" href="/dashboard/admin/export">
          <Download size={18} /> Export data
        </Link>
      </div>

      <section className="mb-8 grid gap-4 md:grid-cols-4">
        <Metric label="Listings" value={String(totals.listingCount)} />
        <Metric label="Bookings" value={String(totals.bookingCount)} />
        <Metric label="Subscription revenue" value={formatCurrency(subscriptionRevenue)} />
        <Metric label="Occupancy" value={`${occupancy}%`} />
      </section>

      <LaunchReadinessPanel />

      <NotificationCenter notifications={notifications} />

      <DashboardSection title="Moderation and policy reports">
        <div className="grid gap-4 lg:grid-cols-2">
          {moderationReports.length ? moderationReports.map((report) => (
            <article key={report.id} className="border border-neutral-300 bg-white p-4">
              <div className="flex flex-wrap gap-2"><StatusBadge status={report.status} /><StatusBadge status={report.reason} /></div>
              <h3 className="mt-3 font-black">{report.contextType.replaceAll("_", " ")} report</h3>
              <p className="mt-1 text-sm font-bold text-steel">Reported by {report.reporter.fullName}{report.reportedUser ? ` · Account: ${report.reportedUser.fullName}` : ""}</p>
              {report.detail ? <p className="mt-2 text-sm font-bold text-steel">{report.detail}</p> : null}
              {report.status === "OPEN" || report.status === "REVIEWING" ? (
                <form action={reviewModerationReportAction} className="mt-3 grid gap-2">
                  <input type="hidden" name="reportId" value={report.id} />
                  <textarea className="field min-h-20" name="resolution" maxLength={1000} placeholder="Record investigation and action taken" required />
                  <div className="grid grid-cols-2 gap-2">
                    <button className="button-primary" name="status" value="RESOLVED" type="submit">Resolve</button>
                    <button className="button-secondary" name="status" value="DISMISSED" type="submit">Dismiss</button>
                  </div>
                </form>
              ) : <p className="mt-3 text-sm font-bold text-steel">{report.resolution}</p>}
            </article>
          )) : <p className="font-bold text-steel">No moderation reports submitted.</p>}
        </div>
      </DashboardSection>

      <DashboardSection title="Platform subscriptions">
        <div className="premium-panel mb-3 border border-neutral-300 bg-white p-4 font-bold text-steel">
          <p className="font-black text-ink">No deal commission</p>
          <p>Admin charges only {formatCurrency(PLATFORM_SUBSCRIPTION_MONTHLY)}/month to each active renter and host.</p>
          <p className="mt-2 font-black text-ink">Recurring company-account subscription revenue</p>
          <p>Subscriptions renew every month after admin checks the company account payment reference.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {subscriptionUsers.map((user) => {
            const nextRenewal = user.platformSubscriptionNextBilling ?? user.platformSubscriptionPeriodEnd;

            return (
              <article key={user.id} className="payment-card border border-neutral-300 bg-white p-4">
                <div className="mb-2 flex flex-wrap gap-2">
                  <StatusBadge status={user.role} />
                  <StatusBadge status={user.platformSubscriptionStatus} />
                  <span className="status-pill">Recurring company-account plan</span>
                </div>
                <h3 className="text-lg font-black">{user.fullName}</h3>
                <p className="text-sm font-bold text-steel">{user.email}</p>
                <p className="mt-2 text-sm font-bold text-steel">
                  Payment reference: {user.platformSubscriptionReference || "No payment reference submitted"}
                </p>
                <p className="mt-2 text-sm font-black">
                  Next renewal: {nextRenewal ? formatDate(nextRenewal) : "starts after activation"}
                </p>
                <form action={approvePlatformSubscriptionAction} className="mt-3 grid grid-cols-2 gap-2">
                  <input type="hidden" name="userId" value={user.id} />
                  <button className="button-primary w-full" name="decision" value="verify" type="submit" disabled={user.platformSubscriptionStatus !== "PENDING_ADMIN"}>
                    Verify and activate
                  </button>
                  <button className="button-secondary w-full" name="decision" value="reject" type="submit" disabled={user.platformSubscriptionStatus !== "PENDING_ADMIN"}>
                    Reject reference
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
                  <span className="status-pill">{listing.factoryType}</span>
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
                <p className="mt-2 text-sm font-black">Deposit: {formatCurrency(booking.deposit)} / {booking.depositStatus.replaceAll("_", " ")}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <a className="button-secondary col-span-2 w-full" href={`/dashboard/bookings/${booking.id}/agreement`}>
                  View booking agreement
                </a>
                <a className="button-secondary col-span-2 w-full" href={`/api/bookings/${booking.id}/documents/booking-summary`}><Download size={18} aria-hidden="true" /> Download PDF</a>
                <BookingAdminButton bookingId={booking.id} action="ADMIN_APPROVE" label="Approve high-risk" disabled={booking.status !== "PENDING_ADMIN_HIGH_RISK"} />
                <BookingAdminButton bookingId={booking.id} action="ADMIN_REJECT" label="Reject high-risk" disabled={booking.status !== "PENDING_ADMIN_HIGH_RISK"} />
                <form action={updateDepositStatusAction} className="col-span-2 grid gap-2 border border-neutral-200 bg-white p-3">
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <select className="field" name="depositStatus" defaultValue={booking.depositStatus}>
                    <option value="HELD">Held</option>
                    <option value="RELEASED">Released to renter</option>
                    <option value="PARTIALLY_RETAINED">Partially retained</option>
                    <option value="RETAINED">Retained</option>
                    <option value="DISPUTED">Disputed</option>
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input className="field" name="depositReturned" type="number" min="0" placeholder="Returned amount" />
                    <input className="field" name="depositRetained" type="number" min="0" placeholder="Retained amount" />
                  </div>
                  <input className="field" name="depositNote" placeholder="Required reconciliation or dispute note" required />
                  <button className="button-secondary" type="submit">Record deposit outcome</button>
                </form>
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

      <DashboardSection title="Payment reconciliation">
        <div className="grid gap-4 lg:grid-cols-2">
          {payments.length ? payments.map((payment) => (
            <article key={payment.id} className="border border-neutral-300 bg-white p-4">
              <div className="flex flex-wrap gap-2"><StatusBadge status={payment.kind} /><StatusBadge status={payment.status} /></div>
              <h3 className="mt-3 text-lg font-black">{payment.payer.fullName} · {formatCurrency(payment.amount)}</h3>
              <p className="mt-1 break-all text-sm font-bold text-steel">Reference: {payment.reference}</p>
              {payment.booking ? <p className="mt-1 text-sm font-bold text-steel">Booking: {payment.booking.listing.title}</p> : null}
              {payment.proofUpload ? <a className="button-secondary mt-3 w-full" href={`/api/uploads/${payment.proofUpload.id}`}>Review private proof</a> : <p className="mt-3 text-sm font-bold text-amber-800">No uploaded proof. Verify the bank reference independently.</p>}
              {payment.status === "SUBMITTED" && payment.kind === "BOOKING_TOTAL" ? <PaymentReviewForm paymentId={payment.id} action={reviewBookingPaymentAction} /> : null}
              {payment.status === "SUBMITTED" && payment.kind === "ADDITIONAL_REQUIREMENT" ? <PaymentReviewForm paymentId={payment.id} action={reviewAdditionalRequirementPaymentAction} /> : null}
            </article>
          )) : <p className="font-bold text-steel">No payment records submitted.</p>}
        </div>
      </DashboardSection>

      <DashboardSection title="Privacy requests">
        <div className="grid gap-4 lg:grid-cols-2">
          {privacyRequests.length ? privacyRequests.map((request) => (
            <article key={request.id} className="border border-neutral-300 bg-white p-4">
              <div className="flex flex-wrap gap-2"><StatusBadge status={request.type} /><StatusBadge status={request.status} /></div>
              <h3 className="mt-3 font-black">{request.user.fullName}</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm font-bold text-steel">{request.detail}</p>
              {request.status === "SUBMITTED" || request.status === "IN_REVIEW" ? (
                <form action={resolvePrivacyRequestAction} className="mt-3 grid gap-2">
                  <input type="hidden" name="requestId" value={request.id} />
                  <textarea className="field min-h-20" name="resolution" placeholder="Record the action taken or reason" required />
                  <div className="grid grid-cols-2 gap-2">
                    {request.type !== "DELETION" ? <button className="button-primary" name="status" value="COMPLETED" type="submit">Complete</button> : <span />}
                    <button className="button-secondary" name="status" value="REJECTED" type="submit">Reject</button>
                  </div>
                </form>
              ) : null}
              {request.type === "DELETION" && (request.status === "SUBMITTED" || request.status === "IN_REVIEW") ? (
                <form action={executeAccountDeletionAction} className="mt-2 border border-red-300 bg-red-50 p-3">
                  <input type="hidden" name="requestId" value={request.id} />
                  <p className="text-xs font-black text-red-900">Checks active obligations, deletes the managed identity, and anonymizes the marketplace profile.</p>
                  <button className="button-dark mt-2 w-full" type="submit">Execute verified deletion</button>
                </form>
              ) : null}
            </article>
          )) : <p className="font-bold text-steel">No privacy requests submitted.</p>}
        </div>
      </DashboardSection>

      <DashboardSection title="Deposits, disputes, and photos">
        <div className="grid gap-3 md:grid-cols-2">
          {uploads.map((upload) => (
            <div key={upload.id} className="border border-neutral-300 bg-white p-4">
              <p className="font-black">{upload.type.replaceAll("_", " ")}</p>
              <p className="text-sm font-bold text-steel">{upload.originalName}</p>
              <p className="mt-2 text-xs font-bold text-steel">Private upload metadata for authorized dispute/deposit review.</p>
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

      <nav className="flex items-center justify-between border-t border-neutral-300 pt-5" aria-label="Admin dashboard pages">
        {pagination.page > 1 ? <Link className="button-secondary" href={`/dashboard/admin?page=${pagination.page - 1}`}>Previous page</Link> : <span />}
        <span className="font-black text-steel">Page {pagination.page} of {pagination.totalPages}</span>
        {pagination.page < pagination.totalPages ? <Link className="button-secondary" href={`/dashboard/admin?page=${pagination.page + 1}`}>Next page</Link> : <span />}
      </nav>
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
      <button className={action === "ADMIN_APPROVE" ? "button-primary w-full" : "button-secondary w-full"} disabled={disabled} type="submit">
        {label}
      </button>
    </form>
  );
}

function PaymentReviewForm({ paymentId, action }: { paymentId: string; action: (formData: FormData) => Promise<void> }) {
  return (
    <form action={action} className="mt-3 grid gap-2">
      <input type="hidden" name="paymentId" value={paymentId} />
      <input className="field" name="reviewNote" placeholder="Optional reconciliation note" />
      <div className="grid grid-cols-2 gap-2">
        <button className="button-primary" name="decision" value="verify" type="submit">Verify paid</button>
        <button className="button-secondary" name="decision" value="reject" type="submit">Reject proof</button>
      </div>
    </form>
  );
}
