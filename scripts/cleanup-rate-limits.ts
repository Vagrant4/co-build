import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: new Date() } } });
  console.log(`Deleted ${result.count} expired rate-limit buckets.`);
}

main().finally(() => prisma.$disconnect());
