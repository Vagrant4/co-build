import type { User, UserRole } from "@prisma/client";
import type { NextRequest } from "next/server";
import { prisma } from "./db";

type RequestIdentity =
  | { kind: "demo"; userId: string | null }
  | { kind: "managed"; providerUserId: string | null };

function statusResponse(status: 401 | 403 | 404): Response {
  const title = status === 401 ? "Sign in required" : status === 403 ? "Access denied" : "Page not found";
  const detail = status === 401
    ? "Sign in to continue."
    : status === 403
      ? "Your account cannot access this page."
      : "The requested resource is not available.";
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | SpaceOnCall</title></head><body><main><h1>${title}</h1><p>${detail}</p><a href="/">Return to SpaceOnCall</a></main></body></html>`, {
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
  if (!user) return statusResponse(401);
  if (user.suspended) return statusResponse(403);
  const role = requiredRole(pathname);
  if (role && user.role !== role) return statusResponse(403);
  return bookingParticipantResponse(pathname, user);
}
