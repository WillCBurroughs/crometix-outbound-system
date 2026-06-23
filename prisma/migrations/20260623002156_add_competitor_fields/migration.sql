-- CreateTable
CREATE TABLE "Competitor" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "websiteUrl" TEXT NOT NULL,
    "performance" INTEGER,
    "seo" INTEGER,
    "accessibility" INTEGER,
    "bestPractices" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Competitor_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Competitor" ADD CONSTRAINT "Competitor_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
