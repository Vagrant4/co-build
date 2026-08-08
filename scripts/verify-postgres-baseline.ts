import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const uploads = await prisma.$queryRawUnsafe<Array<{ storageProvider: string; uploadStatus: string; scanStatus: string }>>(
    'SELECT "storageProvider", "uploadStatus", "scanStatus" FROM "Upload" LIMIT 0'
  );
  const conversations = await prisma.$queryRawUnsafe<Array<{ name: string }>>(
    `SELECT table_name AS name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('Conversation', 'ConversationMessage', 'AdminExportEvent')`
  );
  if (uploads.length !== 0 || conversations.length !== 3) throw new Error("PostgreSQL migration baseline verification failed.");
  console.log("PostgreSQL upload, conversation, and admin-audit tables verified.");
}

main().finally(() => prisma.$disconnect());
