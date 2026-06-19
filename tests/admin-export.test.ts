import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function readProjectFile(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("admin CSV export", () => {
  it("adds an admin export center linked from the dashboard", () => {
    const exportPage = readProjectFile("app/dashboard/admin/export/page.tsx");
    const adminDashboard = readProjectFile("app/dashboard/admin/page.tsx");

    expect(exportPage).toContain("Admin export center");
    expect(exportPage).toContain("/dashboard/admin/export/users.csv");
    expect(exportPage).toContain("/dashboard/admin/export/listings.csv");
    expect(exportPage).toContain("/dashboard/admin/export/bookings.csv");
    expect(exportPage).toContain("/dashboard/admin/export/messages.csv");
    expect(adminDashboard).toContain("/dashboard/admin/export");
  });

  it("serves CSV downloads with proper response headers", () => {
    const exportHelper = readProjectFile("src/lib/csv-export.ts");

    expect(exportHelper).toContain("text/csv");
    expect(exportHelper).toContain("Content-Disposition");

    for (const exportName of ["users.csv", "listings.csv", "bookings.csv", "messages.csv"]) {
      const routePath = `app/dashboard/admin/export/${exportName}/route.ts`;
      const route = readProjectFile(routePath);

      expect(existsSync(join(root, routePath))).toBe(true);
      expect(route).toContain("toCsv");
      expect(route).toContain("csvResponse");
    }
  });
});
