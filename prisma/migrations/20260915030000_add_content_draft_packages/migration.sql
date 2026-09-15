CREATE TABLE "ContentDraftPackage" (
    "id" TEXT NOT NULL,
    "packageHash" CHAR(64) NOT NULL,
    "sourcePayloadHash" CHAR(64) NOT NULL,
    "sport" TEXT NOT NULL,
    "slateDate" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL,
    "releaseStatus" TEXT NOT NULL,
    "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewedBy" TEXT,
    "decisionAt" TIMESTAMP(3),
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ContentDraftPackage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContentDraftPackage_packageHash_key" ON "ContentDraftPackage"("packageHash");
CREATE INDEX "ContentDraftPackage_sport_slateDate_reviewedAt_idx" ON "ContentDraftPackage"("sport", "slateDate", "reviewedAt");
CREATE INDEX "ContentDraftPackage_sourcePayloadHash_idx" ON "ContentDraftPackage"("sourcePayloadHash");
