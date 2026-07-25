import type { User, UserRole } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { forbidden, notFound, unauthorized } from "next/navigation";
import { getAppMode, assertAuthenticationConfigured } from "./app-mode";
import { prisma } from "./db";

export const DEMO_SESSION_COOKIE = "co-build-demo-user";

export class AuthorizationError extends Error {
  constructor(
    message: string,
    public readonly status: 401 | 403 | 404
  ) {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function getOptionalUser(): Promise<User | null> {
  const mode = getAppMode();
  let authProviderId: string | null = null;

  if (mode === "demo") {
    const userId = (await cookies()).get(DEMO_SESSION_COOKIE)?.value;
    if (!userId) return null;
    return prisma.user.findUnique({ where: { id: userId } });
  }

  assertAuthenticationConfigured();
  const session = await auth();
  if (!session.userId) return null;
  authProviderId = `clerk:${session.userId}`;
  return prisma.user.findUnique({ where: { authProviderId } });
}

export async function requireUser(): Promise<User> {
  const user = await getOptionalUser();
  if (!user) unauthorized();
  if (user.suspended) forbidden();
  return user;
}

export async function requireRole(role: UserRole): Promise<User> {
  const user = await requireUser();
  if (user.role !== role) forbidden();
  return user;
}

export function requireAdmin(): Promise<User> {
  return requireRole("ADMIN");
}

export async function requireListingOwner(listingId: string): Promise<User> {
  const user = await requireRole("HOST");
  const listing = await prisma.listing.findUnique({ where: { id: listingId }, select: { hostId: true } });
  if (!listing) notFound();
  if (listing.hostId !== user.id) forbidden();
  return user;
}

export async function requireBookingParticipant(bookingId: string): Promise<User> {
  const user = await requireUser();
  if (user.role === "ADMIN") return user;
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { userId: true, listing: { select: { hostId: true } } }
  });
  if (!booking) notFound();
  if (booking.userId !== user.id && booking.listing.hostId !== user.id) {
    forbidden();
  }
  return user;
}

export async function requireConversationParticipant(conversationId: string): Promise<User> {
  const user = await requireUser();
  if (user.role === "ADMIN") return user;
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { renterId: true, hostId: true, listing: { select: { hostId: true } } }
  });
  if (!conversation) notFound();
  const isRenter = user.role === "RENTER" && conversation.renterId === user.id;
  const isCurrentListingHost = user.role === "HOST" && conversation.hostId === user.id && conversation.listing.hostId === user.id;
  if (!isRenter && !isCurrentListingHost) {
    forbidden();
  }
  return user;
}

export function authorizationResponse(error: unknown): Response {
  if (error instanceof AuthorizationError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  throw error;
}
