import { prisma } from "../lib/prisma.js";

async function main() {
  const byStatus = await prisma.lead.count({
    where: { status: "INSTANTLY_ADDED" },
  });

  const byInstantlyId = await prisma.lead.count({
    where: {
      instantlyId: {
        not: null,
      },
    },
  });

  console.log({
    byStatus,
    byInstantlyId,
  });
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });