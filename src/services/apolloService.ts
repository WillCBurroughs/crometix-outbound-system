import axios from "axios";

const APOLLO_BASE_URL = "https://api.apollo.io/api/v1";

export type ApolloPeopleSearchConfig = {
  keyword: string;
  titles: string[];
  locations: string[];
};

export type ApolloCompetitorSearchConfig = {
  keywords: string[];
  employeeRanges?: string[];
  perPage?: number;
};

export async function searchApolloPeople(
  page: number,
  config: ApolloPeopleSearchConfig,
) {
  const apiKey = process.env.APOLLO_API_KEY;

  if (!apiKey) {
    throw new Error("APOLLO_API_KEY is missing");
  }

  if (!config.keyword.trim()) {
    throw new Error("Apollo search keyword is missing");
  }

  if (config.titles.length === 0) {
    throw new Error("Apollo person titles are missing");
  }

  if (config.locations.length === 0) {
    throw new Error("Apollo organization locations are missing");
  }

  const response = await axios.post(
    `${APOLLO_BASE_URL}/mixed_people/api_search`,
    null,
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": apiKey,
      },
      params: {
        page,
        per_page: 100,
        q_keywords: config.keyword,
        "person_titles[]": config.titles,
        "organization_locations[]": config.locations,
      },
    },
  );

  return response.data;
}

export async function searchApolloCompaniesForCompetitors(
  lead: {
    companyName: string | null;
    websiteUrl: string | null;
    city: string | null;
    state: string | null;
  },
  config: ApolloCompetitorSearchConfig,
) {
  const apiKey = process.env.APOLLO_API_KEY;

  if (!apiKey) {
    throw new Error("APOLLO_API_KEY is missing");
  }

  if (!lead.state) {
    throw new Error("Lead state missing");
  }

  if (config.keywords.length === 0) {
    throw new Error("Competitor search keywords are missing");
  }

  const location = lead.city
    ? `${lead.city}, ${lead.state}`
    : lead.state;

  const response = await axios.post(
    `${APOLLO_BASE_URL}/mixed_companies/search`,
    null,
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": apiKey,
      },
      params: {
        page: 1,
        per_page: config.perPage ?? 50,
        "organization_locations[]": [location],
        "organization_num_employees_ranges[]":
          config.employeeRanges ?? ["1,50"],
        "q_organization_keyword_tags[]": config.keywords,
      },
    },
  );

  return response.data;
}