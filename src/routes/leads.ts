import express from "express";
import multer from "multer";
import csv from "csv-parser";
import fs from "fs";
import { prisma } from "../lib/prisma";
import { generateComparisons } from "../jobs/generateComparisonsJob";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.get("/", async (req, res) => {
  const status = req.query.status as string | undefined;

  const leads = await prisma.lead.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  res.json(leads);
});

router.post("/import", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "CSV file required" });
  }

  const rows: any[] = [];

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", row => rows.push(row))
    .on("end", async () => {
      let imported = 0;

      for (const row of rows) {
        const websiteUrl =
          row["Website URL"] ||
          row["Website"] ||
          row["Company Website"];

        const email = row["Email"];

        if (!websiteUrl || !email) continue;

        const apolloId =
          row["Apollo ID"] ||
          row["Apollo Id"] ||
          `${email}-${websiteUrl}`;

        await prisma.lead.upsert({
          where: { apolloId },
          update: {},
          create: {
            apolloId,
            firstName: row["First Name"],
            lastName: row["Last Name"],
            email,
            companyName: row["Company Name"],
            websiteUrl,
            city: row["Company City"],
            state: row["Company State"],
            linkedinUrl: row["LinkedIn URL"],
            status: "NEW",
          },
        });

        imported++;
      }

      fs.unlinkSync(req.file!.path);

      res.json({ imported });
    });
});

router.post("/generate-comparisons", async (_req, res) => {
  try {
    const result = await generateComparisons();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
    });
  }
});

export default router;