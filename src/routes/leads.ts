import { prisma } from "../lib/prisma.js";
import { scoreLeads } from "../jobs/scoreLeadsJob.js";
import { importApolloLeads } from "../jobs/importApolloLeadsJob.js";
import { generateComparisons } from "../jobs/generateComparisonsJob.js";
import { generateReportUrls } from "../jobs/generateReportUrlsJob.js";
import { generatePdfReports } from "../jobs/generatePdfReportsJob.js";

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

router.post("/generate-pdf-reports", async (_req, res) => {
  try {
    const result = await generatePdfReports();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/generate-report-urls", async (_req, res) => {
  try {
    const result = await generateReportUrls();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
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

router.get("/:id/with-competitors", async (req, res) => {
  const lead = await prisma.lead.findUnique({
    where: { id: req.params.id },
    include: {
      competitors: true,
    },
  });

  if (!lead) {
    return res.status(404).json({ error: "Lead not found" });
  }

  res.json(lead);
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

router.post("/refresh-report-urls", async (_req, res) => {
  try {
    const frontendBaseUrl =
      process.env.FRONTEND_BASE_URL || "http://localhost:3002";

    const leads = await prisma.lead.findMany({
      where: {
        status: {
          in: ["REPORT_READY", "PDF_READY"],
        },
      },
    });

    let updated = 0;

    for (const lead of leads) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          reportUrl: `${frontendBaseUrl}/report/${lead.id}`,
          status: "REPORT_READY",
        },
      });

      updated++;
    }

    res.json({
      attempted: leads.length,
      updated,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;