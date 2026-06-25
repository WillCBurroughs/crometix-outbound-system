import cron from "node-cron";
import { prisma } from "../lib/prisma.js";
import { auditWebsite } from "../services/auditService.js";

export function scoreLeads() {
  cron.schedule("*/2 * * * *", async () => {
    console.log("Running score leads job...");

    const leads = await prisma.lead.findMany({
      where: { status: "NEW" },
      take: 5,
    });

    for (const lead of leads) {
      if (!lead.websiteUrl) continue;

      try {
        await prisma.lead.update({
          where: { id: lead.id },
          data: { status: "SCORE_PENDING" },
        });

        const audit = await auditWebsite(lead.websiteUrl);

        const performance = Math.round(Number(audit.performance));

        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            websiteScore: performance,
            performance,
            seo: audit.seo != null ? Math.round(Number(audit.seo)) : null,
            accessibility:
              audit.accessibility != null ? Math.round(Number(audit.accessibility)) : null,
            bestPractices:
              audit.bestPractices != null ? Math.round(Number(audit.bestPractices)) : null,
            status: performance <= 60 ? "REPORT_PENDING" : "DISQUALIFIED",
          },
        });

        console.log(`Scored ${lead.companyName}: ${performance}`);
      } catch (error: any) {
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
  });
}