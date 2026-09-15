ALTER TABLE "ContentDraftPackage" ADD COLUMN "reviewKey" TEXT;
CREATE UNIQUE INDEX "ContentDraftPackage_reviewKey_key" ON "ContentDraftPackage"("reviewKey");
