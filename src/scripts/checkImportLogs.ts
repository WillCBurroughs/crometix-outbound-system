import { prisma } from "../lib/prisma.js";

async function main() {
  const logs = await prisma.leadImportLog.findMany({
    orderBy: { createdAt: "asc" },
  });

  console.table(
    logs.map(log => ({
      source: log.source,
      keyword: log.keyword,
      totalReturned: log.totalReturned,
      withEmail: log.withEmail,
      imported: log.imported,
      skipped: log.skipped,
      errors: log.errors,
    }))
  );
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });