import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { prisma } from "../src/lib/db";
import { maskPaymentReference, parseBankStatementCsv, reconcileBankStatement } from "../src/lib/bank-reconciliation";

async function main() {
  const inputPath = process.argv[2];
  if (!inputPath) throw new Error("Usage: npm run payments:reconcile -- <bank-statement.csv>");
  const entries = parseBankStatementCsv(await readFile(resolve(inputPath), "utf8"));
  const payments = await prisma.paymentRecord.findMany({ where: { status: "SUBMITTED" }, select: { id: true, reference: true, amount: true, currency: true }, take: 1000 });
  const results = reconcileBankStatement(entries, payments);
  const summary = results.reduce<Record<string, number>>((counts, result) => ({ ...counts, [result.status]: (counts[result.status] ?? 0) + 1 }), {});
  console.log(JSON.stringify({ dryRun: true, summary, rows: results.map((result) => ({ status: result.status, reference: maskPaymentReference(result.statement.reference), amount: result.statement.amount, currency: result.statement.currency, paymentId: result.paymentId })) }, null, 2));
  if (results.some((result) => result.status !== "MATCHED")) process.exitCode = 2;
}

main().finally(() => prisma.$disconnect());
