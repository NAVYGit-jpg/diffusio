-- Cancellation of a calendar line: requested by the point focal, decided by
-- an administrator.
ALTER TABLE "lignes_calendrier"
  ADD COLUMN "annulationDemandee" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "motifAnnulation" TEXT,
  ADD COLUMN "annulationDemandeeAt" TIMESTAMP(3),
  ADD COLUMN "annulationDemandeePar" TEXT,
  ADD COLUMN "annuleeAt" TIMESTAMP(3);
