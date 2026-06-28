-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "verticalProfileId" TEXT;

-- CreateTable
CREATE TABLE "VerticalProfile" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "apolloKeywords" JSONB NOT NULL,
    "personTitles" JSONB NOT NULL,
    "organizationLocations" JSONB NOT NULL,
    "includeTerms" JSONB NOT NULL,
    "excludeTerms" JSONB NOT NULL,
    "reviewTerms" JSONB NOT NULL,
    "maxPerformanceScore" INTEGER NOT NULL DEFAULT 60,
    "requiredCompetitors" INTEGER NOT NULL DEFAULT 2,
    "instantlyCampaignId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerticalProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VerticalProfile_slug_key" ON "VerticalProfile"("slug");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_verticalProfileId_fkey" FOREIGN KEY ("verticalProfileId") REFERENCES "VerticalProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
