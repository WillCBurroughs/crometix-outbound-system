import { prisma } from "../lib/prisma.js";

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item): item is string =>
        typeof item === "string" &&
        item.trim().length > 0,
    )
    .map((item) => item.trim().toLowerCase());
}

function findMatches(
  searchableText: string,
  terms: string[],
): string[] {
  return terms.filter((term) =>
    searchableText.includes(term),
  );
}

function isValidUrl(value?: string | null): boolean {
  if (!value) {
    return false;
  }

  try {
    const normalizedUrl = value.startsWith("http")
      ? value
      : `https://${value}`;

    new URL(normalizedUrl);
    return true;
  } catch {
    return false;
  }
}

export async function runPreComparisonQaBatch(
  verticalProfileId: string,
  batchSize = 20,
) {
  const leads = await prisma.lead.findMany({
    where: {
      status: "REPORT_PENDING",
      verticalProfileId,
    },
    take: batchSize,
    include: {
      verticalProfile: true,
    },
  });

  const attempted = leads.length;
  let approved = 0;
  let review = 0;
  let rejected = 0;
  let errors = 0;

  for (const lead of leads) {
    try {
      if (!lead.verticalProfile) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            status: "QA_PRE_REVIEW",
            errorMessage: "Lead has no vertical profile",
          },
        });

        review++;
        continue;
      }

      const excludeTerms = parseStringArray(
        lead.verticalProfile.excludeTerms,
      );

      const reviewTerms = parseStringArray(
        lead.verticalProfile.reviewTerms,
      );

      const searchableText = [
        lead.companyName,
        lead.websiteUrl,
        lead.city,
        lead.state,
      ]
        .filter(
          (value): value is string =>
            typeof value === "string",
        )
        .join(" ")
        .toLowerCase();

      const rejectionReasons: string[] = [];
      const reviewReasons: string[] = [];

      if (!lead.email) {
        rejectionReasons.push("Missing email");
      }

      if (!isValidUrl(lead.websiteUrl)) {
        rejectionReasons.push(
          "Missing or invalid website URL",
        );
      }

      if (
        lead.performance === null ||
        lead.performance === undefined
      ) {
        reviewReasons.push(
          "Performance score is missing",
        );
      } else if (
        lead.performance >
        lead.verticalProfile.maxPerformanceScore
      ) {
        rejectionReasons.push(
          "Performance score exceeds configured maximum",
        );
      }

      if (lead.apolloId?.startsWith("test")) {
        rejectionReasons.push("Test lead");
      }

      const matchedExcludeTerms = findMatches(
        searchableText,
        excludeTerms,
      );

      if (matchedExcludeTerms.length > 0) {
        rejectionReasons.push(
          `Matched exclusion terms: ${matchedExcludeTerms.join(", ")}`,
        );
      }

      const matchedReviewTerms = findMatches(
        searchableText,
        reviewTerms,
      );

      if (matchedReviewTerms.length > 0) {
        reviewReasons.push(
          `Matched review terms: ${matchedReviewTerms.join(", ")}`,
        );
      }

      let status:
        | "QA_PRE_APPROVED"
        | "QA_PRE_REVIEW"
        | "QA_REJECTED";

      let reasons: string[];

      if (rejectionReasons.length > 0) {
        status = "QA_REJECTED";
        reasons = rejectionReasons;
        rejected++;
      } else if (reviewReasons.length > 0) {
        status = "QA_PRE_REVIEW";
        reasons = reviewReasons;
        review++;
      } else {
        status = "QA_PRE_APPROVED";
        reasons = [];
        approved++;
      }

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status,
          errorMessage:
            reasons.length > 0
              ? reasons.join("; ")
              : null,
        },
      });
    } catch (error: any) {
      errors++;

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          status: "QA_PRE_REVIEW",
          errorMessage:
            error.message ||
            "Unknown pre-comparison QA error",
        },
      });
    }
  }

  return {
    attempted,
    approved,
    review,
    rejected,
    errors,
  };
}