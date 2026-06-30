import { prisma } from "../lib/prisma.js";

async function main() {
  const totalLeads = await prisma.lead.count();

  const statusCounts = await prisma.lead.groupBy({
    by: ["status"],
    _count: {
      _all: true,
    },
    orderBy: {
      status: "asc",
    },
  });

  console.log(`Total Leads: ${totalLeads}\n`);

  console.table(
    statusCounts.map(status => ({
      status: status.status,
      count: status._count._all,
    }))
  );
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });