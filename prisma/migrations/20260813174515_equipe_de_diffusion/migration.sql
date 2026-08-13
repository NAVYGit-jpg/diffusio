-- CreateTable
CREATE TABLE "membres_equipe" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "structureId" TEXT,
    "nom" TEXT NOT NULL,
    "fonction" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "creePar" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "membres_equipe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "membres_equipe_organisationId_structureId_actif_idx" ON "membres_equipe"("organisationId", "structureId", "actif");

-- CreateIndex
CREATE INDEX "membres_equipe_email_idx" ON "membres_equipe"("email");

-- AddForeignKey
ALTER TABLE "membres_equipe" ADD CONSTRAINT "membres_equipe_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "membres_equipe" ADD CONSTRAINT "membres_equipe_structureId_fkey" FOREIGN KEY ("structureId") REFERENCES "structures"("id") ON DELETE CASCADE ON UPDATE CASCADE;
