import { prisma } from "../lib/prisma.js";

const PIPELINE_ID = "outbound";

export async function getPipelineState() {
  return prisma.pipelineState.upsert({
    where: {
      id: PIPELINE_ID,
    },
    update: {},
    create: {
      id: PIPELINE_ID,
      nextApolloPage: 1,
      isRunning: false,
    },
  });
}

export async function advanceApolloPage() {
  return prisma.pipelineState.update({
    where: {
      id: PIPELINE_ID,
    },
    data: {
      nextApolloPage: {
        increment: 1,
      },
      lastRunAt: new Date(),
    },
  });
}