import { prisma } from "../lib/prisma.js";

export async function generateReportUrls() {
  const frontendBaseUrl =
    process.env.FRONTEND_BASE_URL || "http://localhost:3000";

  const leads = await prisma.lead.findMany({
    where: {
      status: "COMPARISON_READY",
    },
    take: 20,
  });

  let generated = 0;

  for (const lead of leads) {
    const reportUrl = `${frontendBaseUrl}/reports/${lead.id}`;

    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        reportUrl,
        status: "REPORT_READY",
      },
    });

    generated++;
  }

  return {
    attempted: leads.length,
    generated,
  };
}