CREATE TABLE "MlbMarketSnapshot" (
    "id" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "modelPayloadHash" TEXT NOT NULL,
    "slateDate" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL,
    CONSTRAINT "MlbMarketSnapshot_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MlbMarketSnapshot_payloadHash_key" ON "MlbMarketSnapshot"("payloadHash");
CREATE INDEX "MlbMarketSnapshot_slateDate_receivedAt_idx" ON "MlbMarketSnapshot"("slateDate", "receivedAt");
CREATE INDEX "MlbMarketSnapshot_modelPayloadHash_idx" ON "MlbMarketSnapshot"("modelPayloadHash");
ALTER TABLE "MlbMarketSnapshot" ADD CONSTRAINT "MlbMarketSnapshot_modelPayloadHash_fkey" FOREIGN KEY ("modelPayloadHash") REFERENCES "MlbGsimResult"("payloadHash") ON DELETE RESTRICT ON UPDATE CASCADE;
