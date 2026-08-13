-- CreateEnum
CREATE TYPE "StyleInterface" AS ENUM ('MODERNE', 'CLASSIQUE', 'MINIMALISTE');

-- AlterTable
ALTER TABLE "organisations" ADD COLUMN     "couleurBouton" TEXT,
ADD COLUMN     "couleurFond" TEXT NOT NULL DEFAULT '#ffffff',
ADD COLUMN     "logoFichier" BYTEA,
ADD COLUMN     "logoMimeType" TEXT,
ADD COLUMN     "paletteAutomatique" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "slogan" TEXT NOT NULL DEFAULT 'Calendrier de diffusion statistique',
ADD COLUMN     "styleInterface" "StyleInterface" NOT NULL DEFAULT 'MODERNE';
