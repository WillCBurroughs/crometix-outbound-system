import axios from "axios";

const APOLLO_BASE_URL = "https://api.apollo.io/api/v1";

export async function enrichPerson(apolloPersonId: string) {
  const apiKey = process.env.APOLLO_API_KEY;

  const response = await axios.post(
    `${APOLLO_BASE_URL}/people/match`,
    {
      id: apolloPersonId,
      reveal_personal_emails: true
    },
    {
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": apiKey
      }
    }
  );

  return response.data;
}