import { prisma } from "../lib/prisma.js";
import { generatePdfReport } from "../services/pdfReportService.js";

export async function generatePdfReports() {
  const leads = await prisma.lead.findMany({
    where: {
      status: "REPORT_READY",
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
      if (lead.competitors.length < 1) {
        skipped++;
        continue;
      }

      const filePath = await generatePdfReport(lead, lead.competitors);

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          reportUrl: filePath,
          status: "PDF_READY",
          errorMessage: null,
        },
      });

      generated++;
    } catch (error: any) {
      errors++;

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: "PDF_ERROR",
          errorMessage: error.message,
        },
      });

      console.error(`PDF generation error for ${lead.companyName}:`, error.message);
    }
  }

  return {
    attempted,
    generated,
    skipped,
    errors,
  };
}