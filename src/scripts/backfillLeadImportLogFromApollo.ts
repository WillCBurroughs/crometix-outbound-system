import { prisma } from "../lib/prisma.js";
import { searchApolloPeople } from "../services/apolloService.js";

async function main() {
  const profile = await prisma.verticalProfile.findFirst({
    where: { isActive: true },
  });

  if (!profile) {
    throw new Error("No active vertical profile found");
  }

  const keywords = profile.apolloKeywords as string[];
  const titles = profile.personTitles as string[];
  const locations = profile.organizationLocations as string[];

  for (const keyword of keywords) {
    let page = 1;
    let totalReturned = 0;
    let withEmail = 0;

    while (true) {
      const data = await searchApolloPeople(page, {
        keyword,
        titles,
        locations,
      });

      const people = data.people || [];

      totalReturned += people.length;
      withEmail += people.filter((person: any) => person.has_email === true).length;

      console.log({
        keyword,
        page,
        returnedThisPage: people.length,
        totalReturned,
        withEmail,
      });

      if (people.length === 0) break;

      page++;

      if (page > 100) break;
    }

    await prisma.leadImportLog.create({
      data: {
        source: "APOLLO_BACKFILL",
        verticalProfileId: profile.id,
        vertical: profile.slug,
        keyword,
        page: null,
        totalReturned,
        withEmail,
        imported: 0,
        skipped: 0,
        errors: 0,
      },
    });
  }
}

main()
  .catch(error => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });