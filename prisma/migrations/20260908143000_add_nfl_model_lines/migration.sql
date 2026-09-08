CREATE TABLE "NflGsimTotalLine" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "overProbability" DOUBLE PRECISION NOT NULL,
    "underProbability" DOUBLE PRECISION NOT NULL,
    "pushProbability" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "NflGsimTotalLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NflGsimSpreadLine" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "homeHandicap" DOUBLE PRECISION NOT NULL,
    "homeCoverProbability" DOUBLE PRECISION NOT NULL,
    "awayCoverProbability" DOUBLE PRECISION NOT NULL,
    "pushProbability" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "NflGsimSpreadLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NflGsimPlayerProjection" (
    "id" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "sourceGameId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "team" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "trialCount" INTEGER NOT NULL,
    "passingYards" DOUBLE PRECISION NOT NULL,
    "rushingYards" DOUBLE PRECISION NOT NULL,
    "receivingYards" DOUBLE PRECISION NOT NULL,
    "receptions" DOUBLE PRECISION NOT NULL,
    "totalTouchdowns" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "NflGsimPlayerProjection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NflGsimPlayerThreshold" (
    "id" TEXT NOT NULL,
    "projectionId" TEXT NOT NULL,
    "statistic" TEXT NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "overProbability" DOUBLE PRECISION NOT NULL,
    "underProbability" DOUBLE PRECISION NOT NULL,
    "pushProbability" DOUBLE PRECISION NOT NULL,
    CONSTRAINT "NflGsimPlayerThreshold_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NflGsimTotalLine_gameId_threshold_key" ON "NflGsimTotalLine"("gameId", "threshold");
CREATE UNIQUE INDEX "NflGsimSpreadLine_gameId_homeHandicap_key" ON "NflGsimSpreadLine"("gameId", "homeHandicap");
CREATE UNIQUE INDEX "NflGsimPlayerProjection_resultId_sourceGameId_playerId_key" ON "NflGsimPlayerProjection"("resultId", "sourceGameId", "playerId");
CREATE INDEX "NflGsimPlayerProjection_resultId_team_position_idx" ON "NflGsimPlayerProjection"("resultId", "team", "position");
CREATE UNIQUE INDEX "NflGsimPlayerThreshold_projectionId_statistic_threshold_key" ON "NflGsimPlayerThreshold"("projectionId", "statistic", "threshold");

ALTER TABLE "NflGsimTotalLine" ADD CONSTRAINT "NflGsimTotalLine_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "NflGsimGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NflGsimSpreadLine" ADD CONSTRAINT "NflGsimSpreadLine_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "NflGsimGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NflGsimPlayerProjection" ADD CONSTRAINT "NflGsimPlayerProjection_resultId_fkey" FOREIGN KEY ("resultId") REFERENCES "NflGsimResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NflGsimPlayerThreshold" ADD CONSTRAINT "NflGsimPlayerThreshold_projectionId_fkey" FOREIGN KEY ("projectionId") REFERENCES "NflGsimPlayerProjection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
