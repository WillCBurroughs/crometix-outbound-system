import axios from "axios";

export async function auditWebsite(websiteUrl: string) {
  const auditApiUrl = process.env.AUDIT_API_URL;

  if (!auditApiUrl) {
    throw new Error("AUDIT_API_URL is missing");
  }

  const response = await axios.post(`${auditApiUrl}/audit`, {
    url: websiteUrl,
  });

  return {
    performance: response.data.performance,
    seo: response.data.seo,
    accessibility: response.data.accessibility,
    bestPractices: response.data.bestPractices,
  };
}