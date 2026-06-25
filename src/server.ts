import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import leadsRouter from "./routes/leads.js";
import apolloRouter from "./routes/apollo.js";
import { scoreLeads } from "./jobs/scoreLeadsJob.js";
import reportsRouter from "./routes/reports.js";
dotenv.config();

const app = express();

app.use(express.json());

app.use("/leads", leadsRouter);
app.use("/apollo", apolloRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/reports", reportsRouter);

const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  startScoreLeadsJob();
});