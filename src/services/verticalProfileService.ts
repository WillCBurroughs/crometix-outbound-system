import { prisma } from "../lib/prisma.js";

function parseStringArray(
  value: unknown,
  fieldName: string,
): string[] {
  if (!Array.isArray(value)) {
    throw new Error(
      `Vertical profile field ${fieldName} must be an array`,
    );
  }

  const values = value.filter(
    (item): item is string =>
      typeof item === "string" && item.trim().length > 0,
  );

  if (values.length === 0) {
    throw new Error(
      `Vertical profile field ${fieldName} cannot be empty`,
    );
  }

  return values;
}

export async function getActiveVerticalProfile() {
  const profiles = await prisma.verticalProfile.findMany({
    where: {
      isActive: true,
    },
    take: 2,
  });

  if (profiles.length === 0) {
    throw new Error("No active vertical profile configured");
  }

  if (profiles.length > 1) {
    throw new Error(
      "Multiple active vertical profiles found. Only one may be active.",
    );
  }

  const profile = profiles[0];

  return {
    ...profile,
    apolloKeywords: parseStringArray(
      profile.apolloKeywords,
      "apolloKeywords",
    ),
    personTitles: parseStringArray(
      profile.personTitles,
      "personTitles",
    ),
    organizationLocations: parseStringArray(
      profile.organizationLocations,
      "organizationLocations",
    ),
    includeTerms: parseStringArray(
      profile.includeTerms,
      "includeTerms",
    ),
    excludeTerms: parseStringArray(
      profile.excludeTerms,
      "excludeTerms",
    ),
    reviewTerms: Array.isArray(profile.reviewTerms)
      ? profile.reviewTerms.filter(
          (item): item is string =>
            typeof item === "string" &&
            item.trim().length > 0,
        )
      : [],
  };
}