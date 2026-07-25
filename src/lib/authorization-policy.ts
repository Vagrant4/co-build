import type { UserRole } from "@prisma/client";

export type ActorIdentity = { id: string; role: UserRole; suspended?: boolean };

export function canAccessConversation(
  actor: ActorIdentity,
  conversation: { renterId: string; hostId: string }
): boolean {
  return !actor.suspended && (actor.role === "ADMIN" || actor.id === conversation.renterId || actor.id === conversation.hostId);
}

export function canAccessBooking(
  actor: ActorIdentity,
  booking: { userId: string; hostId: string | null }
): boolean {
  return !actor.suspended && (actor.role === "ADMIN" || actor.id === booking.userId || actor.id === booking.hostId);
}

export function canManageBookingStatus(actor: ActorIdentity, hostId: string | null, action: string): boolean {
  if (actor.suspended) return false;
  if (action.startsWith("ADMIN_")) return actor.role === "ADMIN";
  if (action.startsWith("HOST_")) return actor.role === "HOST" && actor.id === hostId;
  return false;
}

export function isPublicListingEligible(listing: {
  status: string;
  host: { role: UserRole; suspended: boolean; verificationStatus: string } | null;
}): boolean {
  return Boolean(
    listing.status === "APPROVED" &&
      listing.host?.role === "HOST" &&
      !listing.host.suspended &&
      listing.host.verificationStatus === "APPROVED"
  );
}
