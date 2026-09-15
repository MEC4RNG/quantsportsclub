-- Store only the narrow qsc.nfl_gsim.results.v1 presentation contract.
CREATE TABLE "NflGsimResult" (
    "id" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "payloadHash" CHAR(64) NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "season" INTEGER NOT NULL,
    "week" INTEGER NOT NULL,
    "trialsPerGame" INTEGER NOT NULL,
    "masterSeed" INTEGER NOT NULL,
    "marketIndependent" BOOLEAN NOT NULL,
    "scheduledGames" INTEGER NOT NULL,
    "simulatedGames" INTEGER NOT NULL,
    "snapshotStatus" TEXT NOT NULL,
    "weatherStatus" TEXT NOT NULL,
    "injuryFeedAvailable" BOOLEAN NOT NULL,
    "refreshArtifactHash" TEXT NOT NULL,
    "visibility" TEXT NOT NULL,
    "decisionUse" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NflGsimResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NflGsimGame" (
    "id" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "scheduledStartDate" DATE NOT NULL,
    "awayTeam" TEXT NOT NULL,
    "homeTeam" TEXT NOT NULL,
    "awayWinProbability" DOUBLE PRECISION NOT NULL,
    "homeWinProbability" DOUBLE PRECISION NOT NULL,
    "tieProbability" DOUBLE PRECISION NOT NULL,
    "projectedAwayScore" DOUBLE PRECISION NOT NULL,
    "projectedHomeScore" DOUBLE PRECISION NOT NULL,
    "projectedMarginHome" DOUBLE PRECISION NOT NULL,
    "projectedTotalRaw" DOUBLE PRECISION NOT NULL,
    "projectedTotalCalibrated" DOUBLE PRECISION NOT NULL,
    "totalP10" DOUBLE PRECISION NOT NULL,
    "totalP50" DOUBLE PRECISION NOT NULL,
    "totalP90" DOUBLE PRECISION NOT NULL,
    "validTrials" INTEGER NOT NULL,
    "invalidTrials" INTEGER NOT NULL,
    "provisional" BOOLEAN NOT NULL,
    "modelRelease" TEXT NOT NULL,
    "runtimeArtifactHash" TEXT NOT NULL,
    CONSTRAINT "NflGsimGame_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NflGsimBlockedGame" (
    "id" TEXT NOT NULL,
    "resultId" TEXT NOT NULL,
    "sourceGameId" TEXT NOT NULL,
    "failure" TEXT NOT NULL,
    CONSTRAINT "NflGsimBlockedGame_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NflGsimResult_payloadHash_key" ON "NflGsimResult"("payloadHash");
CREATE INDEX "NflGsimResult_season_week_generatedAt_idx" ON "NflGsimResult"("season", "week", "generatedAt");
CREATE UNIQUE INDEX "NflGsimGame_resultId_gameId_key" ON "NflGsimGame"("resultId", "gameId");
CREATE INDEX "NflGsimGame_scheduledStartDate_idx" ON "NflGsimGame"("scheduledStartDate");
CREATE UNIQUE INDEX "NflGsimBlockedGame_resultId_sourceGameId_key" ON "NflGsimBlockedGame"("resultId", "sourceGameId");

ALTER TABLE "NflGsimGame" ADD CONSTRAINT "NflGsimGame_resultId_fkey"
FOREIGN KEY ("resultId") REFERENCES "NflGsimResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NflGsimBlockedGame" ADD CONSTRAINT "NflGsimBlockedGame_resultId_fkey"
FOREIGN KEY ("resultId") REFERENCES "NflGsimResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;
