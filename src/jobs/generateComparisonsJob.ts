import { prisma } from "../lib/prisma";
import { auditWebsite } from "../services/auditService";
import { findCompetitors } from "../services/competitorService";

export async function generateComparisons() {
  const leads = await prisma.lead.findMany({
    where: {
      status: "REPORT_PENDING",
    },
    take: 5,
    include: {
      competitors: true,
    },
  });

  let attempted = leads.length;
  let generated = 0;
  let skipped = 0;
  let errors = 0;

  for (const lead of leads) {
    try {
      if (lead.competitors.length > 0) {
        skipped++;
        continue;
      }

      const competitors = await findCompetitors({
        companyName: lead.companyName,
        websiteUrl: lead.websiteUrl,
        city: lead.city,
        state: lead.state,
      });

        if (competitors.length < 1) {
            await prisma.lead.update({
                where: { id: lead.id },
                data: {
                status: "COMPARISON_ERROR",
                errorMessage: "No competitors found",
                },
            });

            skipped++;
            continue;
        }

      for (const competitor of competitors.slice(0, 2)) {
        const audit = await auditWebsite(competitor.websiteUrl);

        await prisma.competitor.create({
          data: {
            leadId: lead.id,
            name: competitor.name,
            websiteUrl: competitor.websiteUrl,
            performance: Math.round(Number(audit.performance)),
            seo: audit.seo != null ? Math.round(Number(audit.seo)) : null,
            accessibility:
              audit.accessibility != null
                ? Math.round(Number(audit.accessibility))
                : null,
            bestPractices:
              audit.bestPractices != null
                ? Math.round(Number(audit.bestPractices))
                : null,
          },
        });
      }

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: "COMPARISON_READY",
          errorMessage: null,
        },
      });

      generated++;
    } catch (error: any) {
      errors++;

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: "COMPARISON_ERROR",
          errorMessage: error.message,
        },
      });

      console.error(`Comparison error for ${lead.companyName}:`, error.message);
    }
  }

  return {
    attempted,
    generated,
    skipped,
    errors,
  };
}