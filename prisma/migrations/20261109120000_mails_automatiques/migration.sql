ALTER TABLE "organisations" ADD COLUMN "mailsRappelsActifs" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "organisations" ADD COLUMN "mailsRetardsActifs" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "organisations" ADD COLUMN "mailsMiseEnLigneActifs" BOOLEAN NOT NULL DEFAULT true;
