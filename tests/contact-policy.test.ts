import { describe, expect, it } from "vitest";
import { containsRestrictedContactDetail } from "../src/lib/contact-policy";

describe("contact detail policy", () => {
  it("blocks direct contact details in booking chat messages", () => {
    const blockedMessages = [
      "Email me at renter@example.com",
      "Call me on 9123 4567",
      "My number is +65 8123 4567",
      "WhatsApp me after approval",
      "telegram @fabricator_sg",
      "contact me directly for payment"
    ];

    for (const message of blockedMessages) {
      expect(containsRestrictedContactDetail(message)).toBe(true);
    }
  });

  it("allows operational messages that keep communication inside the platform", () => {
    const allowedMessages = [
      "Can I access the loading bay at 9am?",
      "Please confirm whether three-phase power is available.",
      "We need one extra workbench and storage for plywood.",
      "I uploaded the check-in photos."
    ];

    for (const message of allowedMessages) {
      expect(containsRestrictedContactDetail(message)).toBe(false);
    }
  });
});
