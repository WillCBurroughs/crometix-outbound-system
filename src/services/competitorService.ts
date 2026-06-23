import { searchApolloCompaniesForCompetitors } from "./apolloService";

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

export async function findCompetitors(lead: {
  companyName: string | null;
  websiteUrl: string | null;
  city: string | null;
  state: string | null;
}) {
  const data = await searchApolloCompaniesForCompetitors(lead);

  const companies = data.organizations || data.accounts || [];

  const leadName = normalizeName(lead.companyName);
  const leadUrl = normalizeUrl(lead.websiteUrl);

  const competitors = companies
    .filter((company: any) => {
      const companyName = normalizeName(company.name);
      const companyUrl = normalizeUrl(
        company.website_url ||
        company.primary_domain ||
        company.domain
      );

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

        const hasBadTerm = badTerms.some(term => rawText.includes(term));
        const hasGoodTerm = goodTerms.some(term => rawText.includes(term));

        if (hasBadTerm) return false;
        if (!hasGoodTerm) return false;

      return true;
    })
    .slice(0, 2)
    .map((company: any) => {
      const rawUrl =
        company.website_url ||
        company.primary_domain ||
        company.domain;

      const websiteUrl = /^https?:\/\//i.test(rawUrl)
        ? rawUrl
        : `https://${rawUrl}`;

      return {
        name: company.name,
        websiteUrl,
      };
    });

  return competitors;
}