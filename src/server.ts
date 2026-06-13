import express from "express";
import dotenv from "dotenv";
import leadsRouter from "./routes/leads";

dotenv.config();

const app = express();

app.use(express.json());

app.use("/leads", leadsRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(3001, () => {
  console.log("Server running on port 3001");
});