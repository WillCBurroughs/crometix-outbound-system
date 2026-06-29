import { prisma } from "../lib/prisma.js";

async function main() {
  const states = await prisma.pipelineState.findMany({
    orderBy: {
      updatedAt: "desc",
    },
  });

  console.table(
    states.map(state => ({
      id: state.id,
      nextApolloPage: state.nextApolloPage,
      isRunning: state.isRunning,
      lastRunAt: state.lastRunAt,
      updatedAt: state.updatedAt,
    }))
  );
}

main()
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });