import { PrismaClient } from "@prisma/client";
import { seedDemoData } from "./seed-demo";
import { getAppMode } from "../src/lib/app-mode";

const prisma = new PrismaClient();

async function main() {
  if (getAppMode() !== "demo") {
    console.log("Skipped showcase seed outside demo mode.");
    return;
  }
  const [users, listings, equipment] = await Promise.all([
    prisma.user.count(),
    prisma.listing.count(),
    prisma.equipmentAddon.count()
  ]);

  await seedDemoData(prisma, { reset: false });
  console.log(
    users > 0 || listings > 0 || equipment > 0
      ? "Ensured showcase demo users, listings, bookings, and equipment."
      : "Seeded demo users, listings, bookings, and equipment."
  );
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
