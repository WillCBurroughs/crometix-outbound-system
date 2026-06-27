import { prisma } from "../lib/prisma.js";
import { importNextApolloPage } from "./importApolloLeadsJob.js";
import { processNewLeadsBatch } from "./scoreLeadsJob.js";
import { generateComparisons } from "./generateComparisonsJob.js";
import { generateReportUrls } from "./generateReportUrlsJob.js";

const PIPELINE_ID = "outbound";
const MAX_BATCH_ITERATIONS = 100;

async function countStatus(status: string) {
  return prisma.lead.count({
    where: { status },
  });
}

async function drainScoringQueue() {
  const batches = [];
  let totalAttempted = 0;
  let totalScored = 0;
  let totalQualified = 0;
  let totalDisqualified = 0;
  let totalErrors = 0;

  for (let iteration = 0; iteration < MAX_BATCH_ITERATIONS; iteration++) {
    const result = await processNewLeadsBatch(5);
    batches.push(result);

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
    batchesRun: batches.length,
    totalAttempted,
    totalScored,
    totalQualified,
    totalDisqualified,
    totalErrors,
  };
}

async function drainComparisonQueue() {
  let batchesRun = 0;
  let totalAttempted = 0;
  let totalGenerated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (let iteration = 0; iteration < MAX_BATCH_ITERATIONS; iteration++) {
    const result = await generateComparisons();

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

async function drainReportUrlQueue() {
  let batchesRun = 0;
  let totalAttempted = 0;
  let totalGenerated = 0;

  for (let iteration = 0; iteration < MAX_BATCH_ITERATIONS; iteration++) {
    const result = await generateReportUrls();

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
  const state = await prisma.pipelineState.upsert({
    where: { id: PIPELINE_ID },
    update: {},
    create: {
      id: PIPELINE_ID,
      nextApolloPage: 1,
      isRunning: false,
    },
  });

  if (state.isRunning) {
    throw new Error("Outbound pipeline is already running");
  }

  await prisma.pipelineState.update({
    where: { id: PIPELINE_ID },
    data: {
      isRunning: true,
      lastRunAt: new Date(),
    },
  });

  const startedAt = new Date();

  try {
    const importResult = await importNextApolloPage();
    const scoringResult = await drainScoringQueue();
    const comparisonResult = await drainComparisonQueue();
    const reportResult = await drainReportUrlQueue();

    const queueSummary = {
      new: await countStatus("NEW"),
      scorePending: await countStatus("SCORE_PENDING"),
      reportPending: await countStatus("REPORT_PENDING"),
      comparisonReady: await countStatus("COMPARISON_READY"),
      reportReady: await countStatus("REPORT_READY"),
      instantlyAdded: await countStatus("INSTANTLY_ADDED"),
      comparisonError: await countStatus("COMPARISON_ERROR"),
      disqualified: await countStatus("DISQUALIFIED"),
      error: await countStatus("ERROR"),
    };

    return {
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
      where: { id: PIPELINE_ID },
      data: {
        isRunning: false,
        lastRunAt: new Date(),
      },
    });
  }
}