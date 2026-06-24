import express from "express";
import { prisma } from "../lib/prisma";

const router = express.Router();

router.get("/:leadId", async (req, res) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: {
        id: req.params.leadId,
      },
      include: {
        competitors: true,
      },
    });

    if (!lead) {
      return res.status(404).json({ error: "Report not found" });
    }

    res.json({
      id: lead.id,
      companyName: lead.companyName,
      websiteUrl: lead.websiteUrl,
      city: lead.city,
      state: lead.state,
      scores: {
        speed: lead.performance,
        traffic: lead.seo,
        technical: lead.bestPractices,
        usability: lead.accessibility,
      },
      competitors: lead.competitors.map((competitor) => ({
        id: competitor.id,
        name: competitor.name,
        websiteUrl: competitor.websiteUrl,
        scores: {
          speed: competitor.performance,
          traffic: competitor.seo,
          technical: competitor.bestPractices,
          usability: competitor.accessibility,
        },
      })),
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
    });
  }
});

export default router;