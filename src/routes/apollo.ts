import express from "express";
import { searchApolloPeople } from "../services/apolloService.js";
import { enrichPerson } from "../services/apolloEnrichmentService.js";
import {
  importApolloLeads,
  importNextApolloPage,
} from "../jobs/importApolloLeadsJob.js";
import { findCompetitors } from "../services/competitorService.js";
import { prisma } from "../lib/prisma.js";
import { getActiveVerticalProfile } from "../services/verticalProfileService.js";

const router = express.Router();

router.get("/search-test", async (_req, res) => {
  try {
    const profile = await getActiveVerticalProfile();

    const data = await searchApolloPeople(1, {
      keyword: profile.apolloKeywords[0],
      titles: profile.personTitles,
      locations: profile.organizationLocations,
    });
    const peopleWithEmail = data.people.filter(
      (p: any) => p.has_email === true,
    );
    res.json(peopleWithEmail.slice(0, 5));
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      details: error.response?.data,
    });
  }
});

router.get("/import-test", async (req, res) => {
  try {
    const page = Math.max(
      1,
      Number.parseInt(String(req.query.page ?? "1"), 10) || 1,
    );

    const result = await importApolloLeads(page);

    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      details: error.response?.data,
    });
  }
});

router.get("/enrich-test", async (_req, res) => {
  try {
    const data = await enrichPerson("5db7dffa4b59670001963ed1");

    res.json(data);
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      details: error.response?.data,
    });
  }
});

router.post("/import-next-page", async (_req, res) => {
  try {
    const result = await importNextApolloPage();

    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      details: error.response?.data,
    });
  }
});

router.get("/stats", async (_req, res) => {
  const profile = await getActiveVerticalProfile();

  const data = await searchApolloPeople(1, {
    keyword: profile.apolloKeywords[0],
    titles: profile.personTitles,
    locations: profile.organizationLocations,
  });

  const withEmail = data.people.filter((p: any) => p.has_email === true);

  res.json({
    totalEntries: data.total_entries,
    returned: data.people.length,
    withEmail: withEmail.length,
    sampleTitles: [...new Set(data.people.map((p: any) => p.title))].slice(
      0,
      20,
    ),
  });
});

router.get("/competitor-test", async (_req, res) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: {
        status: "REPORT_PENDING",
        NOT: {
          apolloId: {
            startsWith: "test",
          },
        },
      },
    });

    if (!lead) {
      return res.status(404).json({ error: "No REPORT_PENDING lead found" });
    }

    const profile = await getActiveVerticalProfile();

    const competitors = await findCompetitors(lead, {
      keywords: profile.apolloKeywords,
    });

    res.json({
      lead: {
        companyName: lead.companyName,
        websiteUrl: lead.websiteUrl,
        city: lead.city,
        state: lead.state,
      },
      competitors,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      details: error.response?.data,
    });
  }
});

export default router;
