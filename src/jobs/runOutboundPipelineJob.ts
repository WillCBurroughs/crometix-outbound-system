import { prisma } from "../lib/prisma.js";
import { importNextApolloPage } from "./importApolloLeadsJob.js";
import { processNewLeadsBatch } from "./scoreLeadsJob.js";
import { generateComparisons } from "./generateComparisonsJob.js";
import { generateReportUrls } from "./generateReportUrlsJob.js";
import { getActiveVerticalProfile } from "../services/verticalProfileService.js";

const MAX_BATCH_ITERATIONS = 100;

async function countStatus(status: string, verticalProfileId: string) {
  return prisma.lead.count({
    where: {
      status,
      verticalProfileId,
    },
  });
}

async function drainScoringQueue(verticalProfileId: string) {
  let batchesRun = 0;
  let totalAttempted = 0;
  let totalScored = 0;
  let totalQualified = 0;
  let totalDisqualified = 0;
  let totalErrors = 0;

  for (let iteration = 0; iteration < MAX_BATCH_ITERATIONS; iteration++) {
    const result = await processNewLeadsBatch(5, verticalProfileId);

    batchesRun++;
    totalAttempted += result.attempted;
    totalScored += result.scored;
    totalQualified += result.qualified;
    totalDisqualified += result.disqualified;
    totalErrors += result.errors;

    if (result.attempted === 0) {
      break;
    }
  }

  return {
    batchesRun,
    totalAttempted,
    totalScored,
    totalQualified,
    totalDisqualified,
    totalErrors,
  };
}

async function drainComparisonQueue(verticalProfileId: string) {
  let batchesRun = 0;
  let totalAttempted = 0;
  let totalGenerated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (let iteration = 0; iteration < MAX_BATCH_ITERATIONS; iteration++) {
    const result = await generateComparisons(verticalProfileId);

    batchesRun++;
    totalAttempted += result.attempted;
    totalGenerated += result.generated;
    totalSkipped += result.skipped;
    totalErrors += result.errors;

    if (result.attempted === 0) {
      break;
    }
  }

  return {
    batchesRun,
    totalAttempted,
    totalGenerated,
    totalSkipped,
    totalErrors,
  };
}

async function drainReportUrlQueue(verticalProfileId: string) {
  let batchesRun = 0;
  let totalAttempted = 0;
  let totalGenerated = 0;

  for (let iteration = 0; iteration < MAX_BATCH_ITERATIONS; iteration++) {
    const result = await generateReportUrls(verticalProfileId);

    batchesRun++;
    totalAttempted += result.attempted;
    totalGenerated += result.generated;

    if (result.attempted === 0) {
      break;
    }
  }

  return {
    batchesRun,
    totalAttempted,
    totalGenerated,
  };
}

export async function runOutboundPipeline() {
  const profile = await getActiveVerticalProfile();
  const pipelineId = `outbound:${profile.slug}`;

  const state = await prisma.pipelineState.upsert({
    where: {
      id: pipelineId,
    },
    update: {},
    create: {
      id: pipelineId,
      nextApolloPage: 1,
      isRunning: false,
    },
  });

  if (state.isRunning) {
    throw new Error(
      `Outbound pipeline for "${profile.slug}" is already running`,
    );
  }

  await prisma.pipelineState.update({
    where: {
      id: pipelineId,
    },
    data: {
      isRunning: true,
      lastRunAt: new Date(),
    },
  });

  const startedAt = new Date();

  try {
    const importResult = await importNextApolloPage();

    const scoringResult = await drainScoringQueue(profile.id);

    const comparisonResult = await drainComparisonQueue(profile.id);

    const reportResult = await drainReportUrlQueue(profile.id);

    const queueSummary = {
      new: await countStatus("NEW", profile.id),
      scorePending: await countStatus("SCORE_PENDING", profile.id),
      reportPending: await countStatus("REPORT_PENDING", profile.id),
      comparisonReady: await countStatus("COMPARISON_READY", profile.id),
      reportReady: await countStatus("REPORT_READY", profile.id),
      instantlyAdded: await countStatus("INSTANTLY_ADDED", profile.id),
      comparisonError: await countStatus("COMPARISON_ERROR", profile.id),
      disqualified: await countStatus("DISQUALIFIED", profile.id),
      error: await countStatus("ERROR", profile.id),
    };

    return {
      vertical: {
        id: profile.id,
        slug: profile.slug,
        name: profile.name,
      },
      startedAt,
      completedAt: new Date(),
      importResult,
      scoringResult,
      comparisonResult,
      reportResult,
      queueSummary,
    };
  } finally {
    await prisma.pipelineState.update({
      where: {
        id: pipelineId,
      },
      data: {
        isRunning: false,
        lastRunAt: new Date(),
      },
    });
  }
}
