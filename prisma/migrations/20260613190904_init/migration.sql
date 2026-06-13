-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "apolloId" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "companyName" TEXT,
    "websiteUrl" TEXT,
    "city" TEXT,
    "state" TEXT,
    "linkedinUrl" TEXT,
    "websiteScore" INTEGER,
    "performance" INTEGER,
    "seo" INTEGER,
    "accessibility" INTEGER,
    "bestPractices" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "errorMessage" TEXT,
    "reportUrl" TEXT,
    "instantlyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_apolloId_key" ON "Lead"("apolloId");
