-- CreateTable
CREATE TABLE "visites_onglet" (
    "id" TEXT NOT NULL,
    "utilisateurId" TEXT NOT NULL,
    "onglet" TEXT NOT NULL,
    "vuAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visites_onglet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "visites_onglet_utilisateurId_onglet_key" ON "visites_onglet"("utilisateurId", "onglet");

-- AddForeignKey
ALTER TABLE "visites_onglet" ADD CONSTRAINT "visites_onglet_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
