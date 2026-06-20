import express from "express";
import { searchApolloPeople } from "../services/apolloService";
import { enrichPerson } from "../services/apolloEnrichmentService";
import { importApolloLeads } from "../jobs/importApolloLeadsJob";

const router = express.Router();

router.get("/search-test", async (_req, res) => {
  try {
    const data = await searchApolloPeople();
    const peopleWithEmail = data.people.filter(
        (p: any) => p.has_email === true
    );
    res.json(peopleWithEmail.slice(0, 5));
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      details: error.response?.data,
    });
  }
});

router.get("/import-test", async (_req, res) => {
  try {
    const result = await importApolloLeads();
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
    const data = await enrichPerson(
      "5db7dffa4b59670001963ed1"
    );

    res.json(data);
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      details: error.response?.data
    });
  }
});

router.get("/stats", async (_req, res) => {
  const data = await searchApolloPeople();

  const withEmail = data.people.filter(
    (p: any) => p.has_email === true
  );

    res.json({
    totalEntries: data.total_entries,
    returned: data.people.length,
    withEmail: withEmail.length,
    sampleTitles: [...new Set(data.people.map((p:any) => p.title))].slice(0,20)
    });
});

export default router;