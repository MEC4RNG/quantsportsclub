-- AlterTable
ALTER TABLE "public"."Bet" ADD COLUMN     "bookOdds" INTEGER,
ADD COLUMN     "edgePct" DECIMAL(8,4),
ADD COLUMN     "fairOdds" INTEGER;
