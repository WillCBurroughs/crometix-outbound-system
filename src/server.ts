import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import leadsRouter from "./routes/leads.js";
import apolloRouter from "./routes/apollo.js";
import { scoreLeads } from "./jobs/scoreLeadsJob.js";
import reportsRouter from "./routes/reports.js";
import dashboardRouter from "./routes/dashboard.js";

dotenv.config();

const app = express();

app.use(express.json());

app.use("/dashboard", dashboardRouter);

app.use("/leads", leadsRouter);
app.use("/apollo", apolloRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/instantly/analytics", async (req, res) => {
  try {
    const response = await fetch("https://api.instantly.ai/api/v2/campaigns/analytics", {
      headers: {
        Authorization: `Bearer ${process.env.INSTANTLY_API_KEY}`,
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Instantly API error" });
    }

    const data = await response.json();

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch Instantly analytics" });
  }
});

app.use("/reports", reportsRouter);

const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  // scoreLeads();
});