import { describe, expect, it } from "vitest";
import { maskPaymentReference, parseBankStatementCsv, reconcileBankStatement } from "../src/lib/bank-reconciliation";

describe("bank statement reconciliation", () => {
  it("parses structured CSV and matches exact reference, amount, and currency", () => {
    const entries = parseBankStatementCsv("reference,amount,currency,date\nPAY-001,120,SGD,2026-08-08\n");
    const results = reconcileBankStatement(entries, [{ id: "payment-a", reference: "pay-001", amount: 120, currency: "SGD" }]);
    expect(results).toEqual([expect.objectContaining({ status: "MATCHED", paymentId: "payment-a" })]);
  });

  it("does not auto-match ambiguous or incorrect amounts", () => {
    const entries = parseBankStatementCsv("reference,amount,currency\nREF-A,99,SGD\nREF-B,50,SGD\n");
    const results = reconcileBankStatement(entries, [
      { id: "a", reference: "REF-A", amount: 100, currency: "SGD" },
      { id: "b1", reference: "REF-B", amount: 50, currency: "SGD" },
      { id: "b2", reference: "REF-B", amount: 50, currency: "SGD" }
    ]);
    expect(results.map((result) => result.status)).toEqual(["AMOUNT_MISMATCH", "AMBIGUOUS"]);
    expect(maskPaymentReference("REFERENCE1234")).toMatch(/1234$/);
  });
});
