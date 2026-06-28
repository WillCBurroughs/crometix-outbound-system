-- AlterTable
ALTER TABLE "VerticalProfile"
ADD COLUMN "apolloExcludeTerms" JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN "dailyPushLimit" INTEGER NOT NULL DEFAULT 25;
