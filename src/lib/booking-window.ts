import type { BookingStatus } from "@prisma/client";

export const SINGAPORE_TIME_ZONE = "Asia/Singapore";
export const ACTIVE_BOOKING_STATUSES: BookingStatus[] = [
  "PENDING_HOST",
  "PENDING_ADMIN_HIGH_RISK",
  "APPROVED_FOR_PAYMENT",
  "PAYMENT_SUBMITTED",
  "PAID_CONFIRMED",
  "CHECKED_IN"
];

export type BookingWindow = { startAt: Date; endAt: Date; timeZone: typeof SINGAPORE_TIME_ZONE };

export function parseSingaporeBookingWindow(startDate: string, durationDays: number, now = new Date()): BookingWindow {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(startDate);
  if (!match) throw new Error("Booking start date must use YYYY-MM-DD.");
  if (![1, 7, 30, 60].includes(durationDays)) throw new Error("Unsupported booking duration.");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const startAt = new Date(Date.UTC(year, month - 1, day, -8));
  const singaporeParts = singaporeDateParts(startAt);
  if (singaporeParts !== startDate) throw new Error("Booking start date is invalid.");
  const today = singaporeDateParts(now);
  if (startDate < today) throw new Error("Booking start date cannot be in the past.");
  const maximum = new Date(now.getTime() + 366 * 24 * 60 * 60 * 1000);
  if (startAt > maximum) throw new Error("Booking start date is too far in advance.");
  const endAt = new Date(startAt.getTime() + durationDays * 24 * 60 * 60 * 1000);
  return { startAt, endAt, timeZone: SINGAPORE_TIME_ZONE };
}

export function bookingWindowsOverlap(left: Pick<BookingWindow, "startAt" | "endAt">, right: Pick<BookingWindow, "startAt" | "endAt">): boolean {
  return left.startAt < right.endAt && right.startAt < left.endAt;
}

export function singaporeToday(now = new Date()): string {
  return singaporeDateParts(now);
}

function singaporeDateParts(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SINGAPORE_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
