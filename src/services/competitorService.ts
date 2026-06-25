import { searchApolloCompaniesForCompetitors } from "./apolloService.js";

function normalizeUrl(url: string | null | undefined) {
  if (!url) return "";
  return url
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/$/, "");
}

function normalizeName(name: string | null | undefined) {
  return (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizeWebsiteUrl(url: string) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function extractCompetitors(data: any, lead: {
  companyName: string | null;
  websiteUrl: string | null;
}) {
  const companies = data.organizations || data.accounts || [];

  const leadName = normalizeName(lead.companyName);
  const leadUrl = normalizeUrl(lead.websiteUrl);

  return companies
    .filter((company: any) => {
      const companyName = normalizeName(company.name);
      const rawUrl =
        company.website_url ||
        company.primary_domain ||
        company.domain;

      const companyUrl = normalizeUrl(rawUrl);

      if (!companyName || !companyUrl) return false;
      if (companyName === leadName) return false;
      if (companyUrl === leadUrl) return false;
      if (companyName.includes(leadName) || leadName.includes(companyName)) return false;

      const rawText = [
        company.name,
        company.short_description,
        company.industry,
        ...(company.keywords || []),
      ].join(" ").toLowerCase();

      const badTerms = [
        "association",
        "supply",
        "supplier",
        "software",
        "consulting",
        "marketing",
        "agency",
        "vc",
        "venture",
        "investment",
      ];

      const goodTerms = [
        "medical spa",
        "med spa",
        "medspa",
        "aesthetics",
        "aesthetic",
        "botox",
        "skin",
        "laser",
      ];

      if (badTerms.some(term => rawText.includes(term))) return false;
      if (!goodTerms.some(term => rawText.includes(term))) return false;

      return true;
    })
    .map((company: any) => {
      const rawUrl =
        company.website_url ||
        company.primary_domain ||
        company.domain;

      return {
        name: company.name,
        websiteUrl: normalizeWebsiteUrl(rawUrl),
      };
    });
}

export async function findCompetitors(lead: {
  companyName: string | null;
  websiteUrl: string | null;
  city: string | null;
  state: string | null;
}) {
  const cityData = await searchApolloCompaniesForCompetitors(lead);
  let competitors = extractCompetitors(cityData, lead);

  if (competitors.length < 1 && lead.state) {
    const stateData = await searchApolloCompaniesForCompetitors({
      ...lead,
      city: null,
    });

    competitors = extractCompetitors(stateData, lead);
  }

  return competitors.slice(0, 2);
}