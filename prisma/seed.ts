import { PrismaClient } from "@prisma/client";
import { seedDemoData } from "./seed-demo";
import { getAppMode } from "../src/lib/app-mode";

const prisma = new PrismaClient();

async function main() {
  if (getAppMode() !== "demo") throw new Error("Demo seed is blocked unless APP_MODE=demo.");
  await seedDemoData(prisma, { reset: true });
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
