import { prisma } from "../lib/prisma.js";
import { auditWebsite } from "../services/auditService.js";
import { findCompetitors } from "../services/competitorService.js";

export async function generateComparisons(verticalProfileId?: string) {
  const leads = await prisma.lead.findMany({
    where: {
      status: "QA_PRE_APPROVED",
      ...(verticalProfileId ? { verticalProfileId } : {}),
    },
    take: 5,
    include: {
      competitors: true,
      verticalProfile: true,
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
      if (!lead.verticalProfile) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            status: "COMPARISON_ERROR",
            errorMessage: "Lead has no vertical profile",
          },
        });

        skipped++;
        continue;
      }

      const competitorKeywords = Array.isArray(
        lead.verticalProfile.apolloKeywords,
      )
        ? lead.verticalProfile.apolloKeywords.filter(
            (value): value is string =>
              typeof value === "string" && value.trim().length > 0,
          )
        : [];

      if (competitorKeywords.length === 0) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            status: "COMPARISON_ERROR",
            errorMessage: "Vertical profile has no Apollo keywords",
          },
        });

        skipped++;
        continue;
      }

      const competitors = await findCompetitors(
        {
          companyName: lead.companyName,
          websiteUrl: lead.websiteUrl,
          city: lead.city,
          state: lead.state,
        },
        {
          keywords: competitorKeywords,
        },
      );

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

      let savedCompetitors = 0;

      for (const competitor of competitors.slice(0, 8)) {
        try {
          console.log("Auditing competitor:", {
            lead: lead.companyName,
            competitor: competitor.name,
            websiteUrl: competitor.websiteUrl,
          });

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

          savedCompetitors++;

          if (savedCompetitors >= 2) break;
        } catch (error: any) {
          console.error("Competitor audit failed:", {
            lead: lead.companyName,
            competitor: competitor.name,
            websiteUrl: competitor.websiteUrl,
            error: error.message,
            details: error.response?.data,
          });
        }
      }

      if (savedCompetitors === 0) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            status: "COMPARISON_ERROR",
            errorMessage: "No competitor audits succeeded",
          },
        });

        skipped++;
        continue;
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
