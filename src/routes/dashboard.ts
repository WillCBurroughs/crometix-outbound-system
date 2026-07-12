import express from "express";
import { prisma } from "../lib/prisma.js";

const router = express.Router();

const DISQUALIFIED_STATUSES = [
  "DISQUALIFIED",
  "QA_REJECTED",
  "COMPARISON_ERROR",
];

async function countDistinctLeadsForEvent(type: string) {
  const events = await prisma.campaignEvent.findMany({
    where: {
      type: type as any,
    },
    distinct: ["leadId"],
    select: {
      leadId: true,
    },
  });

  return events.length;
}

function calculateRate(numerator: number, denominator: number) {
  if (denominator === 0) return 0;

  return Number(((numerator / denominator) * 100).toFixed(1));
}

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
      emailsDelivered,
      emailsOpened,
      linksClicked,
      positiveResponses,
      negativeResponses,

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

      // More reliable than checking only the lead's current status.
      // A lead may progress beyond INSTANTLY_ADDED later.
      prisma.lead.count({
        where: {
          instantlyId: {
            not: null,
          },
        },
      }),

      countDistinctLeadsForEvent("EMAIL_SENT"),
      countDistinctLeadsForEvent("EMAIL_DELIVERED"),
      countDistinctLeadsForEvent("EMAIL_OPENED"),
      countDistinctLeadsForEvent("LINK_CLICKED"),
      countDistinctLeadsForEvent("POSITIVE_REPLY"),
      countDistinctLeadsForEvent("NEGATIVE_REPLY"),
      countDistinctLeadsForEvent("MEETING_BOOKED"),
      countDistinctLeadsForEvent("CLIENT_WON"),
    ]);

    const totalResponses = positiveResponses + negativeResponses;

    const deliveryRate = calculateRate(emailsDelivered, emailsSent);
    const openRate = calculateRate(emailsOpened, emailsSent);
    const clickRate = calculateRate(linksClicked, emailsSent);
    const replyRate = calculateRate(totalResponses, emailsSent);
    const positiveReplyRate = calculateRate(
      positiveResponses,
      emailsSent,
    );
    const demoRate = calculateRate(demosBooked, emailsSent);
    const closeRate = calculateRate(salesClosed, emailsSent);

    const stages = [
      {
        key: "leadsPulled",
        label: "Leads Pulled",
        value: leadsPulled,
      },
      {
        key: "verifiedEmails",
        label: "Verified Emails",
        value: verifiedEmails,
      },
      {
        key: "leadsImported",
        label: "Leads Imported",
        value: leadsImported,
      },
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
      {
        key: "emailsSent",
        label: "Emails Sent",
        value: emailsSent,
      },
      {
        key: "emailsDelivered",
        label: "Emails Delivered",
        value: emailsDelivered,
      },
      {
        key: "emailsOpened",
        label: "Emails Opened",
        value: emailsOpened,
      },
      {
        key: "linksClicked",
        label: "Links Clicked",
        value: linksClicked,
      },
      {
        key: "totalResponses",
        label: "Total Responses",
        value: totalResponses,
      },
      {
        key: "positiveResponses",
        label: "Positive Responses",
        value: positiveResponses,
      },
      {
        key: "demosBooked",
        label: "Demos Booked",
        value: demosBooked,
      },
      {
        key: "salesClosed",
        label: "Sales Closed",
        value: salesClosed,
      },
    ];

    return res.json({
      funnel: {
        leadsPulled,
        verifiedEmails,
        leadsImported,
        qualifiedLeads,
        reportsGenerated,
        sentToInstantly,

        emailsSent,
        emailsDelivered,
        emailsOpened,
        linksClicked,

        totalResponses,
        positiveResponses,
        negativeResponses,

        demosBooked,
        salesClosed,
      },

      rates: {
        deliveryRate,
        openRate,
        clickRate,
        replyRate,
        positiveReplyRate,
        demoRate,
        closeRate,
      },

      stages,
    });
  } catch (error: any) {
    console.error("Dashboard metrics error:", error);

    return res.status(500).json({
      error: error?.message || String(error),
    });
  }
});

export default router;
