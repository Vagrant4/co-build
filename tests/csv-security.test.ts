import { describe, expect, it } from "vitest";
import { toCsv } from "../src/lib/csv-export";

describe("CSV export security", () => {
  it("neutralizes spreadsheet formulas", () => {
    const csv = toCsv(
      [{ value: "=1+1" }, { value: "+cmd" }, { value: "-2+3" }, { value: "@SUM(A1:A2)" }],
      [{ key: "value", header: "Value" }]
    );
    expect(csv).toContain("'=1+1");
    expect(csv).toContain("'+cmd");
    expect(csv).toContain("'-2+3");
    expect(csv).toContain("'@SUM(A1:A2)");
  });
});
