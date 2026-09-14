CREATE TABLE "MlbGsimResult" (
    "id" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "slateDate" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL,
    CONSTRAINT "MlbGsimResult_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MlbGsimResult_payloadHash_key" ON "MlbGsimResult"("payloadHash");
CREATE INDEX "MlbGsimResult_slateDate_generatedAt_idx" ON "MlbGsimResult"("slateDate", "generatedAt");
