import path from "path";
import fs from "fs";
import { chromium } from "playwright";

type ScoreSet = {
  performance: number | null;
  seo: number | null;
  accessibility: number | null;
  bestPractices: number | null;
};

type ReportLead = ScoreSet & {
  id: string;
  companyName: string | null;
  websiteUrl: string | null;
  city: string | null;
  state: string | null;
};

type ReportCompetitor = ScoreSet & {
  name: string;
  websiteUrl: string;
};

function score(value: number | null) {
  return value === null || value === undefined ? "N/A" : String(value);
}

function escapeHtml(value: string | null | undefined) {
  return (value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function siteCard(name: string, url: string | null, scores: ScoreSet) {
  return `
    <div class="site-card">
      <h3>${escapeHtml(name)}</h3>
      <p class="url">${escapeHtml(url || "")}</p>

      <div class="main-score">${score(scores.performance)}</div>
      <p class="score-label">Performance Score</p>

      <div class="metrics">
        <div><span>SEO</span><strong>${score(scores.seo)}</strong></div>
        <div><span>Accessibility</span><strong>${score(scores.accessibility)}</strong></div>
        <div><span>Best Practices</span><strong>${score(scores.bestPractices)}</strong></div>
      </div>
    </div>
  `;
}

function buildReportHtml(lead: ReportLead, competitors: ReportCompetitor[]) {
  const competitorCards = competitors
    .map((competitor) =>
      siteCard(competitor.name, competitor.websiteUrl, competitor)
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(lead.companyName)} Website Comparison Report</title>

        <style>
          * {
            box-sizing: border-box;
          }

          body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 0;
            padding: 40px;
            color: #111827;
            background: #f8fafc;
          }

          .page {
            background: white;
            padding: 40px;
            border-radius: 18px;
          }

          .header {
            border-bottom: 1px solid #e5e7eb;
            padding-bottom: 24px;
            margin-bottom: 32px;
          }

          .eyebrow {
            color: #2aba85;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            font-size: 12px;
          }

          h1 {
            font-size: 34px;
            margin: 8px 0 12px;
          }

          .subtitle {
            color: #4b5563;
            font-size: 16px;
            max-width: 760px;
          }

          .summary {
            margin: 24px 0 32px;
            padding: 20px;
            border-radius: 14px;
            background: #ecfdf5;
            border: 1px solid #bbf7d0;
          }

          .summary strong {
            color: #047857;
          }

          .grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 18px;
            margin-bottom: 32px;
          }

          .site-card {
            border: 1px solid #e5e7eb;
            border-radius: 16px;
            padding: 20px;
            background: #ffffff;
          }

          .site-card h3 {
            font-size: 18px;
            margin: 0 0 6px;
          }

          .url {
            font-size: 12px;
            color: #6b7280;
            min-height: 28px;
            word-break: break-word;
          }

          .main-score {
            font-size: 56px;
            line-height: 1;
            font-weight: 800;
            margin-top: 18px;
          }

          .score-label {
            color: #6b7280;
            font-size: 13px;
            margin-top: 4px;
          }

          .metrics {
            margin-top: 18px;
          }

          .metrics div {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-top: 1px solid #f3f4f6;
            font-size: 13px;
          }

          .recommendations {
            border-top: 1px solid #e5e7eb;
            padding-top: 28px;
          }

          .recommendations h2 {
            margin-top: 0;
          }

          li {
            margin-bottom: 10px;
          }

          .footer {
            margin-top: 36px;
            font-size: 12px;
            color: #6b7280;
          }
        </style>
      </head>

      <body>
        <div class="page">
          <div class="header">
            <div class="eyebrow">Crometix Website Comparison Report</div>
            <h1>${escapeHtml(lead.companyName)} Website Audit</h1>
            <p class="subtitle">
              We compared ${escapeHtml(lead.companyName)} against nearby businesses
              to identify website performance issues that may affect patient acquisition.
            </p>
          </div>

          <div class="summary">
            <strong>${escapeHtml(lead.companyName)}</strong> currently has a performance score of
            <strong>${score(lead.performance)}</strong>.
            Lower performance scores can create friction for visitors and reduce conversion from paid or organic traffic.
          </div>

          <div class="grid">
            ${siteCard(lead.companyName || "Your Website", lead.websiteUrl, lead)}
            ${competitorCards}
          </div>

          <div class="recommendations">
            <h2>Recommended Next Steps</h2>
            <ul>
              <li>Improve mobile performance and page load speed.</li>
              <li>Compress large images and reduce unnecessary scripts.</li>
              <li>Review technical issues affecting accessibility and best practices.</li>
              <li>Prioritize website improvements before increasing ad spend.</li>
            </ul>
          </div>

          <div class="footer">
            Prepared by Crometix
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function generatePdfReport(
  lead: ReportLead,
  competitors: ReportCompetitor[]
) {
  const reportsDir = path.resolve(process.cwd(), "reports");

  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  const html = buildReportHtml(lead, competitors);
  const outputPath = path.join(reportsDir, `${lead.id}.pdf`);

  const browser = await chromium.launch({
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });

    await page.pdf({
      path: outputPath,
      format: "Letter",
      printBackground: true,
      margin: {
        top: "0.35in",
        right: "0.35in",
        bottom: "0.35in",
        left: "0.35in",
      },
    });
  } finally {
    await browser.close();
  }

  return outputPath;
}