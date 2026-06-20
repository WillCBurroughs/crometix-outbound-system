import { prisma } from "../lib/prisma";
import { searchApolloPeople } from "../services/apolloService";
import { enrichPerson } from "../services/apolloEnrichmentService";

export async function importApolloLeads() {
  const data = await searchApolloPeople();

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

  return {
    totalReturned: people.length,
    withEmail: peopleWithEmail.length,
    imported,
    skipped,
    errors,
  };
}