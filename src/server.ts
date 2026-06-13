import express from "express";
import dotenv from "dotenv";
import leadsRouter from "./routes/leads";
import { startScoreLeadsJob } from "./jobs/scoreLeadsJob";

dotenv.config();

const app = express();

app.use(express.json());

app.use("/leads", leadsRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  startScoreLeadsJob();
});