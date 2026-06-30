import { prisma } from "../lib/prisma.js";
import { searchApolloPeople } from "../services/apolloService.js";
import { enrichPerson } from "../services/apolloEnrichmentService.js";
import {
  advanceApolloPage,
  getPipelineState,
} from "../services/pipelineStateService.js";
import { getActiveVerticalProfile } from "../services/verticalProfileService.js";

type ApolloImportConfig = {
  verticalProfileId: string;
  verticalSlug: string;
  keyword: string;
  titles: string[];
  locations: string[];
};

export async function importApolloLeads(
  page: number,
  config: ApolloImportConfig,
) {
  const data = await searchApolloPeople(page, {
    keyword: config.keyword,
    titles: config.titles,
    locations: config.locations,
  });

  const people = data.people || [];

  const peopleWithEmail = people.filter((person: any) => {
    return person.has_email === true;
  });

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  for (const prospect of peopleWithEmail) {
    try {
      const enriched = await enrichPerson(prospect.id);
      const person = enriched.person;

      if (!person?.email || !person?.organization?.website_url) {
        skipped++;
        continue;
      }

      await prisma.lead.upsert({
        where: {
          apolloId: person.id,
        },
        update: {},
        create: {
          apolloId: person.id,
          verticalProfileId: config.verticalProfileId,
          firstName: person.first_name,
          lastName: person.last_name,
          email: person.email,
          companyName: person.organization.name,
          websiteUrl: person.organization.website_url,
          city: person.city || person.organization.city,
          state: person.state || person.organization.state,
          linkedinUrl: person.linkedin_url,
          status: "NEW",
        },
      });

      imported++;
    } catch (error) {
      console.error("Apollo import error:", error);
      errors++;
    }
  }

  await prisma.leadImportLog.create({
    data: {
      source: "APOLLO",
      verticalProfileId: config.verticalProfileId,
      vertical: config.verticalSlug,
      keyword: config.keyword,
      page,
      totalReturned: people.length,
      withEmail: peopleWithEmail.length,
      imported,
      skipped,
      errors,
    },
  });

  return {
    vertical: config.verticalSlug,
    keyword: config.keyword,
    page,
    totalReturned: people.length,
    withEmail: peopleWithEmail.length,
    imported,
    skipped,
    errors,
  };
}

export async function importNextApolloPage() {
  const profile = await getActiveVerticalProfile();
  const state = await getPipelineState(profile.slug);

  if (profile.apolloKeywords.length === 0) {
    throw new Error(
      `Vertical profile "${profile.slug}" has no Apollo keywords`,
    );
  }

  const logicalPage = state.nextApolloPage;

  const keywordIndex = (logicalPage - 1) % profile.apolloKeywords.length;

  const apolloPage =
    Math.floor((logicalPage - 1) / profile.apolloKeywords.length) + 1;

  const keyword = profile.apolloKeywords[keywordIndex];

  const result = await importApolloLeads(apolloPage, {
    verticalProfileId: profile.id,
    verticalSlug: profile.slug,
    keyword,
    titles: profile.personTitles,
    locations: profile.organizationLocations,
  });

  await advanceApolloPage(profile.slug);

  return {
    ...result,
    logicalPage,
    keywordIndex,
  };
}
