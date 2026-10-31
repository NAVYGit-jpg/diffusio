-- Photo de profil propre a chaque utilisateur.
ALTER TABLE "utilisateurs" ADD COLUMN IF NOT EXISTS "photoFichier" BYTEA;
ALTER TABLE "utilisateurs" ADD COLUMN IF NOT EXISTS "photoMimeType" TEXT;
ALTER TABLE "utilisateurs" ADD COLUMN IF NOT EXISTS "photoMajAt" TIMESTAMP(3);
