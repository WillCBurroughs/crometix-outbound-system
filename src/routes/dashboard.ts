import express from "express";
import { prisma } from "../lib/prisma.js";

const router = express.Router();

const DISQUALIFIED_STATUSES = [
  "DISQUALIFIED",
  "QA_REJECTED",
  "COMPARISON_ERROR",
];

router.get("/metrics", async (_req, res) => {
  try {
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

    const [
      leadsImported,
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
          status: "INSTANTLY_ADDED",
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

    const stages = [
      { key: "leadsPulled", label: "Leads Pulled", value: leadsPulled },
      {
        key: "verifiedEmails",
        label: "Verified Emails",
        value: verifiedEmails,
      },
      { key: "leadsImported", label: "Leads Imported", value: leadsImported },
      {
        key: "qualifiedLeads",
        label: "Qualified Leads",
        value: qualifiedLeads,
      },
      {
        key: "reportsGenerated",
        label: "Reports Generated",
        value: reportsGenerated,
      },
      {
        key: "sentToInstantly",
        label: "Sent to Instantly",
        value: sentToInstantly,
      },
      { key: "emailsSent", label: "Emails Sent", value: emailsSent },
      { key: "reportsViewed", label: "Reports Viewed", value: reportsViewed },
      {
        key: "positiveResponses",
        label: "Positive Responses",
        value: positiveResponses,
      },
      { key: "demosBooked", label: "Demos Booked", value: demosBooked },
      { key: "salesClosed", label: "Sales Closed", value: salesClosed },
    ];

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
      stages,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
    });
  }
});

export default router;
