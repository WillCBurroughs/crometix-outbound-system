import cron from "node-cron";
import { prisma } from "../lib/prisma.js";
import { auditWebsite } from "../services/auditService.js";

export async function processNewLeadsBatch(
  batchSize = 5,
  verticalProfileId?: string,
) {
  const leads = await prisma.lead.findMany({
    where: {
      status: "NEW",
      ...(verticalProfileId ? { verticalProfileId } : {}),
    },
    take: batchSize,
    include: {
      verticalProfile: true,
    },
  });

  const attempted = leads.length;
  let scored = 0;
  let qualified = 0;
  let disqualified = 0;
  let skipped = 0;
  let errors = 0;

  for (const lead of leads) {
    if (!lead.websiteUrl) {
      skipped++;

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: "ERROR",
          errorMessage: "Website URL is missing",
        },
      });

      continue;
    }

    if (!lead.verticalProfile) {
      errors++;

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: "ERROR",
          errorMessage: "Lead has no vertical profile",
        },
      });

      continue;
    }

    try {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: "SCORE_PENDING",
          errorMessage: null,
        },
      });

      const audit = await auditWebsite(lead.websiteUrl);
      const performance = Math.round(Number(audit.performance));

      if (!Number.isFinite(performance)) {
        throw new Error("Audit returned an invalid performance score");
      }

      const qualifiedLead =
        performance <= lead.verticalProfile.maxPerformanceScore;

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          websiteScore: performance,
          performance,
          seo: audit.seo != null ? Math.round(Number(audit.seo)) : null,
          accessibility:
            audit.accessibility != null
              ? Math.round(Number(audit.accessibility))
              : null,
          bestPractices:
            audit.bestPractices != null
              ? Math.round(Number(audit.bestPractices))
              : null,
          status: qualifiedLead ? "REPORT_PENDING" : "DISQUALIFIED",
        },
      });

      scored++;

      if (qualifiedLead) {
        qualified++;
      } else {
        disqualified++;
      }

      console.log(
        `Scored ${lead.companyName}: ${performance} ` +
          `(threshold: ${lead.verticalProfile.maxPerformanceScore})`,
      );
    } catch (error: any) {
      errors++;

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: "ERROR",
          errorMessage: error.message,
        },
      });

      console.error(`Error scoring ${lead.companyName}:`, error.message);
    }
  }

  return {
    attempted,
    scored,
    qualified,
    disqualified,
    skipped,
    errors,
  };
}

export function scoreLeads() {
  cron.schedule("*/2 * * * *", async () => {
    console.log("Running score leads job...");

    try {
      const result = await processNewLeadsBatch(5);
      console.log("Score leads result:", result);
    } catch (error) {
      console.error("Score leads job failed:", error);
    }
  });
}