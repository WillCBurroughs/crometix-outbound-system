import express from "express";
import { prisma } from "../lib/prisma.js";

const router = express.Router();

function mapInstantlyEventToCampaignEventType(eventType: string, payload: any) {
  const t = (eventType || "").toLowerCase();

  if (t.includes("sent")) return "EMAIL_SENT";
  if (t.includes("delivered")) return "EMAIL_DELIVERED";
  if (t.includes("opened")) return "EMAIL_OPENED";
  if (t.includes("click")) return "LINK_CLICKED";
  if (t.includes("reply")) {
    const sentiment = payload?.sentiment || payload?.data?.sentiment;
    return sentiment === "positive" ? "POSITIVE_REPLY" : "NEGATIVE_REPLY";
  }

  return null;
}

router.post("/webhook", async (req, res) => {
  try {
    // Verify webhook secret
    const suppliedSecret = req.header("x-instantly-webhook-secret");
    const expectedSecret = process.env.INSTANTLY_WEBHOOK_SECRET;

    console.log({
      suppliedSecret,
      expectedSecret,
    });

    if (!expectedSecret || suppliedSecret !== expectedSecret) {
      return res.status(401).json({ error: "Unauthorized webhook request" });
    }

    const payload = req.body || {};

    const eventType = payload.event_type || payload.type || payload.event;

    const externalId =
      payload.event_id ||
      payload.email_id ||
      payload.id ||
      payload.data?.event_id ||
      payload.data?.email_id ||
      null;

    const leadExternalId =
      payload.lead_id || payload.lead?.id || payload.data?.lead_id || null;

    const email =
      payload.lead_email ||
      payload.email ||
      payload.lead?.email ||
      payload.data?.lead_email ||
      payload.data?.email ||
      null;

    const mappedType = mapInstantlyEventToCampaignEventType(eventType, payload);

    if (!mappedType) {
      return res.status(200).json({
        ok: true,
        message: "unmapped event, ignored",
      });
    }

    // Prevent duplicate webhook processing
    if (externalId) {
      const existing = await prisma.campaignEvent.findFirst({
        where: {
          source: "instantly",
          externalId: String(externalId),
        },
      });

      if (existing) {
        return res.status(200).json({
          ok: true,
          message: "event already processed",
        });
      }
    }

    // Find lead
    let lead = null;

    if (leadExternalId) {
      lead = await prisma.lead.findFirst({
        where: {
          instantlyId: String(leadExternalId),
        },
      });
    }

    if (!lead && email) {
      lead = await prisma.lead.findFirst({
        where: {
          email: {
            equals: String(email),
            mode: "insensitive",
          },
        },
      });
    }

    if (!lead) {
      return res.status(200).json({
        ok: true,
        message: "no matching lead",
      });
    }

    // Find campaign
    let campaignId: string | null = null;

    const enrollment = await prisma.campaignEnrollment.findFirst({
      where: {
        leadId: lead.id,
      },
    });

    if (enrollment) {
      campaignId = enrollment.campaignId;
    }

    if (!campaignId) {
      let campaign = await prisma.campaign.findFirst({
        where: {
          name: "Instantly (webhook)",
        },
      });

      if (!campaign) {
        campaign = await prisma.campaign.create({
          data: {
            name: "Instantly (webhook)",
            status: "ACTIVE",
          } as any,
        });
      }

      campaignId = campaign.id;
    }

    const occurredAt = payload.timestamp
      ? new Date(payload.timestamp)
      : new Date();

    await prisma.campaignEvent.create({
      data: {
        campaignId,
        leadId: lead.id,
        type: mappedType as any,
        occurredAt,
        source: "instantly",
        externalId: externalId ? String(externalId) : undefined,
        metadata: payload,
      },
    });

    if (mappedType === "POSITIVE_REPLY" || mappedType === "NEGATIVE_REPLY") {
      await prisma.lead.update({
        where: {
          id: lead.id,
        },
        data: {
          status: "REPLIED",
        },
      });
    }

    return res.json({
      ok: true,
    });
  } catch (error: any) {
    console.error("Instantly webhook error:", error);

    return res.status(500).json({
      error: error?.message || String(error),
    });
  }
});

export default router;
