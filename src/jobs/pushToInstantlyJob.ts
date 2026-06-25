import { prisma } from "../lib/prisma.js";
import { addLeadToInstantlyCampaign } from "../services/instantlyService.js";

export async function pushReportReadyLeadsToInstantly() {
  const leads = await prisma.lead.findMany({
    where: {
      status: "REPORT_READY",
      email: {
        not: null,
      },
      reportUrl: {
        not: null,
      },
      NOT: {
        apolloId: {
          startsWith: "test",
        },
      },
    },
    take: 1,
    include: {
      competitors: true,
    },
  });

  let attempted = leads.length;
  let pushed = 0;
  let errors = 0;

  for (const lead of leads) {
    try {
      const competitor1 = lead.competitors[0]?.name || "";
      const competitor2 = lead.competitors[1]?.name || "";

      const comparisonSummary =
        competitor1 && competitor2
          ? `${competitor1} and ${competitor2}`
          : competitor1
            ? competitor1
            : "nearby competitors";

      const result = await addLeadToInstantlyCampaign({
        email: lead.email!,
        firstName: lead.firstName,
        lastName: lead.lastName,
        companyName: lead.companyName,
        websiteUrl: lead.websiteUrl,
        reportUrl: lead.reportUrl,
        competitor1,
        competitor2,
        comparisonSummary,
        performanceScore: lead.performance,
        city: lead.city,
        state: lead.state,
      });

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          instantlyId: result?.id || result?.lead_id || null,
          status: "INSTANTLY_ADDED",
          errorMessage: null,
        },
      });

      pushed++;
    } catch (error: any) {
      errors++;

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          errorMessage: error.response?.data
            ? JSON.stringify(error.response.data)
            : error.message,
        },
      });

      console.error("Instantly push failed:", {
        lead: lead.companyName,
        email: lead.email,
        error: error.message,
        details: error.response?.data,
      });
    }
  }

  return {
    attempted,
    pushed,
    errors,
  };
}
