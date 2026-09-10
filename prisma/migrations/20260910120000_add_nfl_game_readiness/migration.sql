-- Optional per-game readiness preserves compatibility with existing slate payloads
-- while allowing later game-window deliveries to update only their target games.
ALTER TABLE "NflGsimGame"
  ADD COLUMN "snapshotStatus" TEXT,
  ADD COLUMN "weatherStatus" TEXT,
  ADD COLUMN "injuryFeedAvailable" BOOLEAN,
  ADD COLUMN "decisionUse" TEXT;

CREATE INDEX "NflGsimGame_gameId_idx" ON "NflGsimGame"("gameId");
