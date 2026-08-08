import { parse } from "csv-parse/sync";

export type StatementEntry = { reference: string; amount: number; currency: string; bookedAt?: string };
export type SubmittedPayment = { id: string; reference: string; amount: number; currency: string };
export type ReconciliationResult = { statement: StatementEntry; status: "MATCHED" | "UNMATCHED" | "AMBIGUOUS" | "AMOUNT_MISMATCH"; paymentId?: string };

export function parseBankStatementCsv(csv: string): StatementEntry[] {
  const rows = parse(csv, { columns: (headers: string[]) => headers.map((header) => header.trim().toLowerCase()), skip_empty_lines: true, trim: true, bom: true }) as Record<string, string>[];
  return rows.map((row, index) => {
    const reference = row.reference?.trim();
    const amount = Number(row.amount);
    const currency = (row.currency || "SGD").trim().toUpperCase();
    if (!reference || !Number.isFinite(amount) || amount <= 0 || currency.length !== 3) throw new Error(`Invalid bank statement row ${index + 2}. Required columns: reference, amount, currency.`);
    return { reference, amount, currency, bookedAt: row.bookedat || row.date || undefined };
  });
}

export function reconcileBankStatement(entries: StatementEntry[], payments: SubmittedPayment[]): ReconciliationResult[] {
  const byReference = new Map<string, SubmittedPayment[]>();
  for (const payment of payments) {
    const key = normalizeReference(payment.reference);
    byReference.set(key, [...(byReference.get(key) ?? []), payment]);
  }
  return entries.map((statement) => {
    const candidates = byReference.get(normalizeReference(statement.reference)) ?? [];
    if (!candidates.length) return { statement, status: "UNMATCHED" };
    if (candidates.length > 1) return { statement, status: "AMBIGUOUS" };
    const payment = candidates[0]!;
    if (payment.currency !== statement.currency || payment.amount !== statement.amount) return { statement, status: "AMOUNT_MISMATCH", paymentId: payment.id };
    return { statement, status: "MATCHED", paymentId: payment.id };
  });
}

function normalizeReference(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function maskPaymentReference(value: string): string {
  const normalized = value.trim();
  return normalized.length <= 4 ? "****" : `${"*".repeat(Math.min(8, normalized.length - 4))}${normalized.slice(-4)}`;
}
