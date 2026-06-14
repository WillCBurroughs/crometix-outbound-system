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