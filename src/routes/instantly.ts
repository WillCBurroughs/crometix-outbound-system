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

  // Instantly does not surface meeting-booked reliably via webhooks
  return null;
}

router.post("/webhook", async (req, res) => {
  try {
    const payload = req.body || {};

    const eventType = payload.event_type || payload.type || payload.event;
    const externalId = payload.event_id || payload.id || payload.data?.event_id || null;
    const leadExternalId = payload.lead_id || payload.lead?.id || payload.data?.lead_id || null;
    const email = payload.email || payload.lead?.email || payload.data?.email || null;

    const mappedType = mapInstantlyEventToCampaignEventType(eventType, payload);

    if (!mappedType) {
      return res.status(200).json({ ok: true, message: "unmapped event, ignored" });
    }

    // find lead by Instantly id first, then by email
    let lead = null;
    if (leadExternalId) {
      lead = await prisma.lead.findFirst({ where: { instantlyId: String(leadExternalId) } });
    }
    if (!lead && email) {
      lead = await prisma.lead.findFirst({ where: { email: String(email) } });
    }

    if (!lead) {
      // We only persist events we can associate with a Lead in our DB
      return res.status(200).json({ ok: true, message: "no matching lead" });
    }

    // Prefer an existing enrollment's campaignId, otherwise ensure a placeholder campaign exists
    let campaignId: string | null = null;
    const enrollment = await prisma.campaignEnrollment.findFirst({ where: { leadId: lead.id } });
    if (enrollment) campaignId = enrollment.campaignId;

    if (!campaignId) {
      let campaign = await prisma.campaign.findFirst({ where: { name: "Instantly (webhook)" } });
      if (!campaign) {
        campaign = await prisma.campaign.create({ data: { name: "Instantly (webhook)", status: "ACTIVE" } as any });
      }
      campaignId = campaign.id;
    }

    const occurredAt = payload.timestamp ? new Date(payload.timestamp) : new Date();

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

    // Optionally update lead status for replies
    if (mappedType === "POSITIVE_REPLY" || mappedType === "NEGATIVE_REPLY") {
      await prisma.lead.update({ where: { id: lead.id }, data: { status: "REPLIED" } });
    }

    res.json({ ok: true });
  } catch (error: any) {
    console.error("Instantly webhook error:", error?.message || error);
    res.status(500).json({ error: error?.message || String(error) });
  }
});

export default router;
