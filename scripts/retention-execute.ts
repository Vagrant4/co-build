import { prisma } from "../src/lib/db";
import { executeApprovedRetention } from "../src/lib/retention";

async function main() {
  const result = await executeApprovedRetention();
  console.log(JSON.stringify({ executedAt: new Date().toISOString(), ...result }, null, 2));
}

main().finally(() => prisma.$disconnect());
