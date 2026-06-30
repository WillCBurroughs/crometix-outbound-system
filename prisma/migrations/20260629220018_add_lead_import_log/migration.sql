-- CreateTable
CREATE TABLE "LeadImportLog" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "verticalProfileId" TEXT,
    "vertical" TEXT,
    "keyword" TEXT,
    "page" INTEGER,
    "totalReturned" INTEGER NOT NULL DEFAULT 0,
    "withEmail" INTEGER NOT NULL DEFAULT 0,
    "imported" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadImportLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadImportLog_source_idx" ON "LeadImportLog"("source");

-- CreateIndex
CREATE INDEX "LeadImportLog_verticalProfileId_idx" ON "LeadImportLog"("verticalProfileId");

-- CreateIndex
CREATE INDEX "LeadImportLog_vertical_idx" ON "LeadImportLog"("vertical");

-- CreateIndex
CREATE INDEX "LeadImportLog_createdAt_idx" ON "LeadImportLog"("createdAt");
