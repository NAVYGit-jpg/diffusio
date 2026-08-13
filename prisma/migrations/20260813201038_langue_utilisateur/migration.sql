-- CreateEnum
CREATE TYPE "Langue" AS ENUM ('FR', 'EN', 'PT');

-- AlterTable
ALTER TABLE "utilisateurs" ADD COLUMN     "langue" "Langue" NOT NULL DEFAULT 'FR';
