import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { deliverPendingEmailNotifications } from "../src/lib/notifications";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("notification and moderation foundation", () => {
  it("does not claim or attempt email delivery without provider configuration", async () => {
    const beforeKey = process.env.RESEND_API_KEY;
    const beforeFrom = process.env.TRANSACTIONAL_EMAIL_FROM;
    delete process.env.RESEND_API_KEY;
    delete process.env.TRANSACTIONAL_EMAIL_FROM;
    await expect(deliverPendingEmailNotifications()).resolves.toEqual({ delivered: 0, failed: 0, skipped: true });
    if (beforeKey) process.env.RESEND_API_KEY = beforeKey;
    if (beforeFrom) process.env.TRANSACTIONAL_EMAIL_FROM = beforeFrom;
  });

  it("declares durable notification, moderation, and audit records in both schemas", () => {
    for (const path of ["prisma/schema.prisma", "prisma/postgres/schema.prisma"]) {
      const schema = read(path);
      expect(schema).toContain("model Notification");
      expect(schema).toContain("model ModerationReport");
      expect(schema).toContain("model AuditCheckpoint");
    }
  });

  it("keeps report authorization and contact violation logging on the server", () => {
    const actions = read("app/actions.ts");
    expect(actions).toContain("requireBookingParticipant(message.bookingId)");
    expect(actions).toContain("requireConversationParticipant(message.conversationId)");
    expect(actions).toContain("CONTACT_SHARING_ATTEMPT");
    expect(actions).toContain("reportedUserId === actor.id");
  });
});
