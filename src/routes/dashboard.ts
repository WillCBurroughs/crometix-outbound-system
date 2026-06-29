import express from "express";
import { prisma } from "../lib/prisma.js";

const router = express.Router();

const DISQUALIFIED_STATUSES = [
  "DISQUALIFIED",
  "QA_REJECTED",
  "COMPARISON_ERROR",
];

const leadImportTotals = await prisma.leadImportLog.aggregate({
  _sum: {
    totalReturned: true,
    withEmail: true,
    imported: true,
    skipped: true,
    errors: true,
  },
});

const leadsPulled = leadImportTotals._sum.totalReturned ?? 0;
const verifiedEmails = leadImportTotals._sum.withEmail ?? 0;
const leadsImported = leadImportTotals._sum.imported ?? 0;



router.get("/metrics", async (_req, res) => {
  try {
    const [
      leadsPulled,
      verifiedEmails,
      qualifiedLeads,
      reportsGenerated,
      sentToInstantly,
      emailsSent,
      reportsViewed,
      positiveResponses,
      demosBooked,
      salesClosed,
    ] = await Promise.all([
      prisma.lead.count(),

      prisma.lead.count({
        where: {
          email: {
            not: null,
          },
        },
      }),

      prisma.lead.count({
        where: {
          status: {
            notIn: DISQUALIFIED_STATUSES,
          },
        },
      }),

      prisma.lead.count({
        where: {
          reportUrl: {
            not: null,
          },
        },
      }),

      prisma.lead.count({
        where: {
          instantlyId: {
            not: null,
          },
        },
      }),

      prisma.campaignEvent.count({
        where: {
          type: "EMAIL_SENT",
        },
      }),

      prisma.campaignEvent.count({
        where: {
          type: "LINK_CLICKED",
        },
      }),

      prisma.campaignEvent.count({
        where: {
          type: "POSITIVE_REPLY",
        },
      }),

      prisma.campaignEvent.count({
        where: {
          type: "MEETING_BOOKED",
        },
      }),

      prisma.campaignEvent.count({
        where: {
          type: "CLIENT_WON",
        },
      }),
    ]);

    res.json({
      funnel: {
        leadsPulled,
        verifiedEmails,
        leadsImported,
        qualifiedLeads,
        reportsGenerated,
        sentToInstantly,
        emailsSent,
        reportsViewed,
        positiveResponses,
        demosBooked,
        salesClosed,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
    });
  }
});

export default router;
