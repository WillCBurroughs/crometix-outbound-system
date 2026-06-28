import { prisma } from "../lib/prisma.js";

async function main() {
  await prisma.verticalProfile.updateMany({
    data: {
      isActive: false,
    },
  });

  const profile = await prisma.verticalProfile.upsert({
    where: {
      slug: "medical-spas",
    },
    update: {
      name: "Medical Spas",
      isActive: true,
      apolloKeywords: ["medical spa", "med spa", "medical aesthetics"],
      apolloExcludeTerms: [
        "software",
        "supplier",
        "supplies",
        "equipment",
        "marketing agency",
        "consulting",
        "distributor",
      ],
      dailyPushLimit: 25,
      personTitles: [
        "Owner",
        "Founder",
        "CEO",
        "Practice Manager",
        "Office Manager",
      ],
      organizationLocations: ["United States"],
      includeTerms: [
        "medical spa",
        "med spa",
        "medspa",
        "medical aesthetics",
        "aesthetic clinic",
        "aesthetics clinic",
        "plastic surgery",
        "cosmetic surgery",
      ],
      excludeTerms: [
        "software",
        "supplier",
        "supplies",
        "equipment",
        "marketing agency",
        "consulting",
        "distributor",
        "institute",
        "academy",
        "school",
        "training",
        "certification",
        "education",
      ],
      reviewTerms: ["podiatry", "dental", "wellness", "weight loss"],
      maxPerformanceScore: 60,
      requiredCompetitors: 2,
      instantlyCampaignId: process.env.INSTANTLY_CAMPAIGN_ID || null,
    },
    create: {
      slug: "medical-spas",
      name: "Medical Spas",
      isActive: true,
      apolloKeywords: ["medical spa", "med spa", "medical aesthetics"],
      personTitles: [
        "Owner",
        "Founder",
        "CEO",
        "Practice Manager",
        "Office Manager",
      ],
      apolloExcludeTerms: [
        "software",
        "supplier",
        "supplies",
        "equipment",
        "marketing agency",
        "consulting",
        "distributor",
        "academy",
        "school",
        "training",
        "certification",
        "education",
      ],
      dailyPushLimit: 25,
      organizationLocations: ["United States"],
      includeTerms: [
        "medical spa",
        "med spa",
        "medspa",
        "medical aesthetics",
        "aesthetic clinic",
        "aesthetics clinic",
        "plastic surgery",
        "cosmetic surgery",
      ],
      excludeTerms: [
        "software",
        "supplier",
        "supplies",
        "equipment",
        "marketing agency",
        "consulting",
        "distributor",
      ],
      reviewTerms: ["podiatry", "dental", "wellness", "weight loss"],
      maxPerformanceScore: 60,
      requiredCompetitors: 2,
      instantlyCampaignId: process.env.INSTANTLY_CAMPAIGN_ID || null,
    },
  });

  console.log("Active vertical profile:", {
    id: profile.id,
    slug: profile.slug,
    name: profile.name,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
