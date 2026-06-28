import { prisma } from "../lib/prisma.js";

function getPipelineId(verticalSlug: string) {
  return `outbound:${verticalSlug}`;
}

export async function getPipelineState(verticalSlug: string) {
  const id = getPipelineId(verticalSlug);

  return prisma.pipelineState.upsert({
    where: {
      id,
    },
    update: {},
    create: {
      id,
      nextApolloPage: 1,
      isRunning: false,
    },
  });
}

export async function advanceApolloPage(verticalSlug: string) {
  const id = getPipelineId(verticalSlug);

  return prisma.pipelineState.update({
    where: {
      id,
    },
    data: {
      nextApolloPage: {
        increment: 1,
      },
      lastRunAt: new Date(),
    },
  });
}