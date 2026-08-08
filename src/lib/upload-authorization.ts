import type { BookingStatus, UploadType, UserRole } from "@prisma/client";

type Actor = { id: string; role: UserRole };

export type UploadAccessRecord = {
  type: UploadType;
  ownerUserId: string | null;
  uploadedByUserId: string | null;
  listing: { hostId: string | null } | null;
  booking: { userId: string; status: BookingStatus; listing: { hostId: string | null } } | null;
};

export function canAccessUpload(actor: Actor, upload: UploadAccessRecord): boolean {
  if (actor.role === "ADMIN") return true;
  if (upload.ownerUserId === actor.id || upload.uploadedByUserId === actor.id) return true;
  if (actor.role !== "HOST") return false;
  if (upload.type === "VERIFICATION") return false;
  return upload.listing?.hostId === actor.id || upload.booking?.listing.hostId === actor.id;
}

export function canDeleteUpload(actor: Actor, upload: UploadAccessRecord): boolean {
  return actor.role === "ADMIN" || upload.ownerUserId === actor.id || upload.uploadedByUserId === actor.id;
}

export function isUploadDownloadable(upload: { storageProvider: string; objectKey: string | null; uploadStatus: string; scanStatus: string }): boolean {
  return upload.storageProvider === "VERCEL_BLOB" && Boolean(upload.objectKey) && upload.uploadStatus === "AVAILABLE" && (upload.scanStatus === "SAFE" || upload.scanStatus === "NOT_REQUIRED");
}

export function canReserveForBooking(actor: Actor, type: UploadType, booking: { userId: string; status: BookingStatus; listing: { hostId: string | null } }): boolean {
  if (actor.role === "ADMIN") return type === "CONTRACT" || type === "DISPUTE_EVIDENCE";
  if (type === "CHECK_IN") return actor.role === "RENTER" && booking.userId === actor.id && booking.status === "PAID_CONFIRMED";
  if (type === "CHECK_OUT") return actor.role === "RENTER" && booking.userId === actor.id && booking.status === "CHECKED_IN";
  if (type === "VERIFICATION" || type === "PAYMENT_EVIDENCE") return actor.role === "RENTER" && booking.userId === actor.id;
  if (type === "DISPUTE_EVIDENCE") return booking.userId === actor.id || (actor.role === "HOST" && booking.listing.hostId === actor.id);
  return false;
}

export function canReserveForListing(actor: Actor, type: UploadType, listing: { hostId: string | null } | null): boolean {
  if (type !== "LISTING_PHOTO" && type !== "FLOOR_PLAN") return false;
  return actor.role === "HOST" && (!listing || listing.hostId === actor.id);
}

export function canReserveWithoutResource(actor: Actor, type: UploadType): boolean {
  return (actor.role === "HOST" && (type === "LISTING_PHOTO" || type === "FLOOR_PLAN")) ||
    (actor.role === "RENTER" && type === "VERIFICATION");
}
