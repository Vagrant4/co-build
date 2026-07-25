import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("private pre-booking conversations", () => {
  it("uses participant-scoped conversation models in both schemas", () => {
    for (const path of ["prisma/schema.prisma", "prisma/schema.postgres.prisma"]) {
      const schema = read(path);
      expect(schema).toContain("model Conversation");
      expect(schema).toContain("model ConversationMessage");
      expect(schema).toContain("@@unique([listingId, renterId])");
      expect(schema).not.toContain("model ListingMessage");
    }
  });

  it("derives message sender from the authenticated participant", () => {
    const actions = read("app/actions.ts");
    expect(actions).toContain("requireConversationParticipant(conversationId)");
    expect(actions).toContain("senderId: sender.id");
    expect(actions).toContain("requireRole(\"RENTER\")");
    expect(read("components/listing-chat.tsx")).toContain("sendConversationMessageAction");
  });
});
