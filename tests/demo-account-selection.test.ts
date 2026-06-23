import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("four-account demo login flow", () => {
  it("renders selectable demo renter and host accounts on dashboards", () => {
    expect(existsSync(join(root, "components/demo-account-selector.tsx"))).toBe(true);

    const userDashboard = read("app/dashboard/user/page.tsx");
    const hostDashboard = read("app/dashboard/host/page.tsx");

    expect(userDashboard).toContain("searchParams");
    expect(userDashboard).toContain("DemoAccountSelector");
    expect(userDashboard).toContain('role: "RENTER"');
    expect(userDashboard).toContain('hrefBase="/dashboard/user"');
    expect(userDashboard).toContain('actorId={user.id}');

    expect(hostDashboard).toContain("searchParams");
    expect(hostDashboard).toContain("DemoAccountSelector");
    expect(hostDashboard).toContain('role: "HOST"');
    expect(hostDashboard).toContain('hrefBase="/dashboard/host"');
    expect(hostDashboard).toContain('actorId={host.id}');
  });

  it("passes the selected demo account through checkout, chat, and deal actions", () => {
    const checkout = read("app/checkout/[listingId]/page.tsx");
    const actions = read("app/actions.ts");
    const bookingChat = read("components/booking-chat.tsx");
    const listingChat = read("components/listing-chat.tsx");

    expect(checkout).toContain("searchParams");
    expect(checkout).toContain('name="userId"');
    expect(checkout).toContain('hrefBase={`/checkout/${listing.slug}`}');

    expect(bookingChat).toContain("senderId");
    expect(bookingChat).toContain('name="senderId"');
    expect(listingChat).toContain("senderId");
    expect(listingChat).toContain('name="senderId"');

    expect(actions).toContain('optionalString(formData, "userId") || "demo-renter"');
    expect(actions).toContain('optionalString(formData, "senderId")');
    expect(actions).toContain('optionalString(formData, "actorId")');
    expect(actions).toContain('optionalString(formData, "hostId") || "demo-host"');
  });
});