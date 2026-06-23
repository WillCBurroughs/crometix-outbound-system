import axios from "axios";

const APOLLO_BASE_URL = "https://api.apollo.io/api/v1";

export async function searchApolloPeople() {
  const apiKey = process.env.APOLLO_API_KEY;

  if (!apiKey) {
    throw new Error("APOLLO_API_KEY is missing");
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
        page: 1,
        per_page: 100,
        q_keywords: "medical spa",
        "person_titles[]": [
            "Owner",
            "Founder",
            "CEO",
            "Practice Manager",
            "Office Manager"
        ],
        "organization_locations[]": ["United States"],
      },
    }
  );

  return response.data;
}

export async function searchApolloCompaniesForCompetitors(lead: {
  companyName: string | null;
  websiteUrl: string | null;
  city: string | null;
  state: string | null;
}) {
  const apiKey = process.env.APOLLO_API_KEY;

  if (!apiKey) {
    throw new Error("APOLLO_API_KEY is missing");
  }

  if (!lead.state) {
    throw new Error("Lead state missing");
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
        per_page: 25,
        "organization_locations[]": [location],
        "organization_num_employees_ranges[]": ["1,50"],
        "q_organization_keyword_tags[]": [
          "medical spa",
          "med spa",
          "medical aesthetics",
          "aesthetics",
          "botox",
        ],
      },
    }
  );

  return response.data;
}