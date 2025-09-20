-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "emailVerified" TIMESTAMP(3),
ALTER COLUMN "email" DROP NOT NULL;
