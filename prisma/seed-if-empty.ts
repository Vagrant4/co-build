import { PrismaClient } from "@prisma/client";
import { seedDemoData } from "./seed-demo";

const prisma = new PrismaClient();

async function main() {
  const [users, listings, equipment] = await Promise.all([
    prisma.user.count(),
    prisma.listing.count(),
    prisma.equipmentAddon.count()
  ]);

  if (users > 0 || listings > 0 || equipment > 0) {
    console.log("Database already has data; skipping demo seed.");
    return;
  }

  await seedDemoData(prisma, { reset: false });
  console.log("Seeded demo users, listings, bookings, and equipment.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
