import express from "express";
import dotenv from "dotenv";
import leadsRouter from "./routes/leads";
import apolloRouter from "./routes/apollo";
import { startScoreLeadsJob } from "./jobs/scoreLeadsJob";
import reportsRouter from "./routes/reports";

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