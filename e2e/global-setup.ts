import { PrismaClient } from "@prisma/client";

export default async function resetE2eRateLimits() {
  const prisma = new PrismaClient();
  try {
    await prisma.rateLimitBucket.deleteMany();
  } finally {
    await prisma.$disconnect();
  }
}
