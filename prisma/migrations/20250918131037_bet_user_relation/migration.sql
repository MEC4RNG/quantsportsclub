/*
  Warnings:

  - You are about to drop the column `event` on the `Bet` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Bet` table. All the data in the column will be lost.
  - You are about to drop the column `result` on the `Bet` table. All the data in the column will be lost.
  - You are about to drop the column `settledAt` on the `Bet` table. All the data in the column will be lost.
  - You are about to drop the column `side` on the `Bet` table. All the data in the column will be lost.
  - Added the required column `pick` to the `Bet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sport` to the `Bet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Bet` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Bet" DROP CONSTRAINT "Bet_userId_fkey";

-- AlterTable
ALTER TABLE "public"."Bet" DROP COLUMN "event",
DROP COLUMN "price",
DROP COLUMN "result",
DROP COLUMN "settledAt",
DROP COLUMN "side",
ADD COLUMN     "eventId" TEXT,
ADD COLUMN     "league" TEXT,
ADD COLUMN     "market" TEXT,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "oddsAmerican" INTEGER,
ADD COLUMN     "oddsDecimal" DOUBLE PRECISION,
ADD COLUMN     "pick" TEXT NOT NULL,
ADD COLUMN     "realizedUnits" DOUBLE PRECISION,
ADD COLUMN     "sport" TEXT NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "Bet_userId_createdAt_idx" ON "public"."Bet"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."Bet" ADD CONSTRAINT "Bet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
