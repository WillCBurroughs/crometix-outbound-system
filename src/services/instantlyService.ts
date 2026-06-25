import axios from "axios";

const INSTANTLY_BASE_URL = "https://api.instantly.ai/api/v2";

type InstantlyLeadInput = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  websiteUrl?: string | null;
  reportUrl?: string | null;
  competitor1?: string | null;
  competitor2?: string | null;
  comparisonSummary?: string | null;
  performanceScore?: number | null;
  city?: string | null;
  state?: string | null;
};

export async function addLeadToInstantlyCampaign(lead: InstantlyLeadInput) {
  const apiKey = process.env.INSTANTLY_API_KEY;
  const campaignId = process.env.INSTANTLY_CAMPAIGN_ID;

  if (!apiKey) throw new Error("INSTANTLY_API_KEY is missing");
  if (!campaignId) throw new Error("INSTANTLY_CAMPAIGN_ID is missing");
  if (!lead.email) throw new Error("Lead email is missing");

  const response = await axios.post(
    `${INSTANTLY_BASE_URL}/leads/add`,
    {
      campaign_id: campaignId,
      leads: [
        {
          email: lead.email,
          first_name: lead.firstName || "",
          last_name: lead.lastName || "",
          company_name: lead.companyName || "",
          website: lead.websiteUrl || "",
          custom_variables: {
            report_url: lead.reportUrl || "",
            competitor_1: lead.competitor1 || "",
            competitor_2: lead.competitor2 || "",
            comparison_summary: lead.comparisonSummary || "",
            performance_score:
              lead.performanceScore !== null &&
              lead.performanceScore !== undefined
                ? String(lead.performanceScore)
                : "",
            city: lead.city || "",
            state: lead.state || "",
          },
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    },
  );

  return response.data;
}
