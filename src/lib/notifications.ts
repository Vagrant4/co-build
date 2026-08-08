import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./db";
import { logEvent } from "./observability";

type NotificationWriter = Prisma.TransactionClient | PrismaClient;

export type NotificationInput = {
  userId: string;
  type: string;
  title: string;
  body: string;
  dedupeKey?: string;
  email?: boolean;
};

export async function queueUserNotification(writer: NotificationWriter, input: NotificationInput): Promise<void> {
  const records = [
    { channel: "IN_APP" as const, suffix: "in-app" },
    ...(input.email ? [{ channel: "EMAIL" as const, suffix: "email" }] : [])
  ];

  for (const record of records) {
    const data = {
      userId: input.userId,
      type: input.type,
      title: input.title.slice(0, 140),
      body: input.body.slice(0, 1200),
      channel: record.channel,
      dedupeKey: input.dedupeKey ? `${input.dedupeKey}:${input.userId}:${record.suffix}` : null
    };
    if (data.dedupeKey) {
      await writer.notification.upsert({ where: { dedupeKey: data.dedupeKey }, create: data, update: {} });
    } else {
      await writer.notification.create({ data });
    }
  }
}

export async function queueAdminNotifications(writer: NotificationWriter, input: Omit<NotificationInput, "userId">): Promise<void> {
  const admins = await writer.user.findMany({ where: { role: "ADMIN", suspended: false }, select: { id: true } });
  for (const admin of admins) await queueUserNotification(writer, { ...input, userId: admin.id });
}

export async function deliverPendingEmailNotifications(limit = 25): Promise<{ delivered: number; failed: number; skipped: boolean }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.TRANSACTIONAL_EMAIL_FROM?.trim();
  if (!apiKey || !from) return { delivered: 0, failed: 0, skipped: true };

  const pending = await prisma.notification.findMany({
    where: { channel: "EMAIL", status: { in: ["PENDING", "FAILED"] }, availableAt: { lte: new Date() }, attemptCount: { lt: 5 } },
    include: { user: { select: { email: true } } },
    orderBy: { createdAt: "asc" },
    take: Math.min(Math.max(limit, 1), 100)
  });
  let delivered = 0;
  let failed = 0;

  for (const notification of pending) {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [notification.user.email], subject: notification.title, text: notification.body })
      });
      if (!response.ok) throw new Error(`HTTP_${response.status}`);
      await prisma.notification.update({ where: { id: notification.id }, data: { status: "SENT", sentAt: new Date(), attemptCount: { increment: 1 }, lastErrorCode: null } });
      delivered += 1;
    } catch (error) {
      const attemptCount = notification.attemptCount + 1;
      const delayMinutes = Math.min(60, 2 ** attemptCount);
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          status: "FAILED",
          attemptCount,
          lastErrorCode: error instanceof Error ? error.message.slice(0, 80) : "UNKNOWN",
          availableAt: new Date(Date.now() + delayMinutes * 60 * 1000)
        }
      });
      failed += 1;
    }
  }
  logEvent(failed ? "warn" : "info", "notification_delivery_completed", { delivered, failed });
  return { delivered, failed, skipped: false };
}
