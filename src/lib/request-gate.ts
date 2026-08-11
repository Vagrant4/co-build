import type { User, UserRole } from "@prisma/client";
import type { NextRequest } from "next/server";
import { prisma } from "./db";

type RequestIdentity =
  | { kind: "demo"; userId: string | null }
  | { kind: "managed"; providerUserId: string | null };

function statusResponse(status: 401 | 403 | 404, adminRoute = false): Response {
  const title = status === 401 ? "Sign in required" : status === 403 ? "Access denied" : "Page not found";
  const detail = status === 401
    ? "Sign in to continue."
    : status === 403
      ? "Your account cannot access this page."
      : "The requested resource is not available.";
  const signInHref = adminRoute ? "/admin/sign-in" : "/sign-in";
  const signInLabel = adminRoute ? "Administrator sign in" : "Sign in";
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | SpaceOnCall</title><style>
    *{box-sizing:border-box}body{margin:0;background:#0f1213;color:#f4f6f5;font-family:Inter,"Segoe UI",Arial,sans-serif}main{display:grid;min-height:100vh;place-items:center;padding:2rem;background:linear-gradient(90deg,rgba(8,10,11,.97),rgba(8,10,11,.76)),url('/assets/spaceoncall-warehouse.webp') center/cover}.panel{width:min(100%,34rem);border:1px solid #343a3d;border-top:3px solid #ff5a1f;border-radius:3px;background:rgba(15,18,19,.96);padding:2rem;box-shadow:0 24px 70px rgba(0,0,0,.4)}.brand{display:flex;align-items:center;gap:.65rem;font-size:1.25rem;font-weight:900}.brand em{color:#ff5a1f;font-style:normal}.mark{width:2.25rem;height:2.25rem}.status{margin:2rem 0 .45rem;color:#ff5a1f;font-size:.72rem;font-weight:900;text-transform:uppercase}h1{margin:0;font-size:2.5rem;line-height:1.05}p{margin:1rem 0 0;color:#abb3b1;font-weight:700;line-height:1.7}.actions{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:1.5rem}a{display:inline-flex;min-height:2.8rem;align-items:center;border:1px solid #434b4e;border-radius:3px;background:#171b1d;padding:.7rem 1rem;color:#fff;font-weight:900;text-decoration:none}a.primary{border-color:#ff5a1f;background:#ff5a1f}a:hover,a:focus{border-color:#ff7849;outline:3px solid rgba(255,90,31,.2);outline-offset:2px}@media(max-width:520px){main{padding:1rem}.panel{padding:1.4rem}h1{font-size:2rem}}
  </style></head><body><main><section class="panel"><div class="brand"><svg class="mark" viewBox="0 0 48 48" aria-hidden="true"><path d="M16 5h6M26 5h6l11 11v6M43 27v5L32 43h-6M22 43h-6L5 32v-5M5 22v-6L16 5" fill="none" stroke="#fff" stroke-linecap="square" stroke-width="5"/><path d="M31 17h-8a4.5 4.5 0 0 0 0 9h3a4.5 4.5 0 0 1 0 9h-9" fill="none" stroke="#ff5a1f" stroke-linecap="square" stroke-width="5.5"/><path d="M24 10v32" stroke="#ff5a1f" stroke-linecap="square" stroke-width="3"/></svg><span>Space<em>OnCall</em></span></div><p class="status">Protected workspace</p><h1>${title}</h1><p>${detail}</p><div class="actions">${status !== 404 ? `<a class="primary" href="${signInHref}">${signInLabel}</a>` : ""}<a href="/">Return home</a></div></section></main></body></html>`, {
    status,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }
  });
}

function requiredRole(pathname: string): UserRole | null {
  if (pathname === "/dashboard/admin" || pathname.startsWith("/dashboard/admin/")) return "ADMIN";
  if (pathname === "/dashboard/host" || pathname.startsWith("/dashboard/host/")) return "HOST";
  if (pathname === "/dashboard/user" || pathname.startsWith("/dashboard/user/")) return "RENTER";
  if (pathname.startsWith("/checkout/")) return "RENTER";
  return null;
}

function requiresUser(pathname: string): boolean {
  return requiredRole(pathname) !== null || pathname.startsWith("/dashboard/bookings/");
}

async function loadUser(identity: RequestIdentity): Promise<User | null> {
  if (identity.kind === "demo") {
    return identity.userId ? prisma.user.findUnique({ where: { id: identity.userId } }) : null;
  }
  return identity.providerUserId
    ? prisma.user.findUnique({ where: { authProviderId: `clerk:${identity.providerUserId}` } })
    : null;
}

async function listingEligibilityResponse(pathname: string): Promise<Response | null> {
  const prefix = pathname.startsWith("/listings/") ? "/listings/" : pathname.startsWith("/checkout/") ? "/checkout/" : null;
  if (!prefix) return null;
  const slug = decodeURIComponent(pathname.slice(prefix.length)).split("/")[0];
  if (!slug) return statusResponse(404);
  const listing = await prisma.listing.findFirst({
    where: {
      slug,
      status: "APPROVED",
      host: { is: { role: "HOST", suspended: false, verificationStatus: "APPROVED", platformSubscriptionStatus: "ACTIVE" } }
    },
    select: { id: true }
  });
  return listing ? null : statusResponse(404);
}

async function bookingParticipantResponse(pathname: string, user: User): Promise<Response | null> {
  if (!pathname.startsWith("/dashboard/bookings/")) return null;
  const bookingId = decodeURIComponent(pathname.slice("/dashboard/bookings/".length)).split("/")[0];
  if (!bookingId) return statusResponse(404);
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { userId: true, listing: { select: { hostId: true } } }
  });
  if (!booking) return statusResponse(404);
  if (user.role !== "ADMIN" && booking.userId !== user.id && booking.listing.hostId !== user.id) return statusResponse(403);
  return null;
}

export async function gatePageRequest(request: NextRequest, identity: RequestIdentity): Promise<Response | null> {
  const { pathname } = request.nextUrl;
  const listingResponse = await listingEligibilityResponse(pathname);
  if (listingResponse) return listingResponse;
  if (!requiresUser(pathname)) return null;

  const user = await loadUser(identity);
  const adminRoute = pathname === "/dashboard/admin" || pathname.startsWith("/dashboard/admin/");
  if (!user) return statusResponse(401, adminRoute);
  if (user.suspended) return statusResponse(403, adminRoute);
  const role = requiredRole(pathname);
  if (role && user.role !== role) return statusResponse(403, adminRoute);
  return bookingParticipantResponse(pathname, user);
}
