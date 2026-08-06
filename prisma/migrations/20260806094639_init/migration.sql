-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'POINT_FOCAL');

-- CreateEnum
CREATE TYPE "TypeStructure" AS ENUM ('DIRECTION', 'SOUS_DIRECTION', 'MINISTERE', 'SERVICE', 'AUTRE');

-- CreateEnum
CREATE TYPE "Periodicite" AS ENUM ('MENSUELLE', 'TRIMESTRIELLE', 'SEMESTRIELLE', 'ANNUELLE', 'PLURIANNUELLE', 'PONCTUELLE');

-- CreateEnum
CREATE TYPE "TypeDelai" AS ENUM ('CALENDAIRES', 'OUVRES');

-- CreateEnum
CREATE TYPE "DensiteInterface" AS ENUM ('COMPACTE', 'CONFORTABLE');

-- CreateEnum
CREATE TYPE "StatutCalendrier" AS ENUM ('BROUILLON', 'SOUMIS', 'VALIDE');

-- CreateEnum
CREATE TYPE "TypeElement" AS ENUM ('PUBLICATION', 'INDICATEUR');

-- CreateEnum
CREATE TYPE "StatutLigne" AS ENUM ('PLANIFIE', 'A_VENIR', 'TELEVERSE', 'MIS_EN_LIGNE', 'EN_RETARD', 'ANNULE');

-- CreateEnum
CREATE TYPE "TypeFichier" AS ENUM ('PDF', 'EXCEL', 'AUTRE');

-- CreateEnum
CREATE TYPE "StatutAvancement" AS ENUM ('EN_COURS', 'NON_DEBUTEE');

-- CreateEnum
CREATE TYPE "TypeEnvoiEmail" AS ENUM ('RAPPEL_J15', 'RAPPEL_J10', 'RAPPEL_J5', 'RAPPEL_J3', 'RAPPEL_J1', 'RELANCE_RETARD', 'MISE_EN_LIGNE', 'ALERTE_MANUELLE', 'INVITATION', 'REINITIALISATION_MOT_DE_PASSE');

-- CreateEnum
CREATE TYPE "StatutEnvoiEmail" AS ENUM ('ENVOYE', 'ECHEC');

-- CreateTable
CREATE TABLE "organisations" (
    "id" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "sigle" TEXT NOT NULL,
    "pays" TEXT NOT NULL,
    "fuseauHoraire" TEXT NOT NULL DEFAULT 'Africa/Abidjan',
    "logoUrl" TEXT,
    "couleurPrimaire" TEXT NOT NULL DEFAULT '#1e40af',
    "couleurSecondaire" TEXT NOT NULL DEFAULT '#475569',
    "couleurAccent" TEXT NOT NULL DEFAULT '#0891b2',
    "police" TEXT NOT NULL DEFAULT 'Geist',
    "densiteInterface" "DensiteInterface" NOT NULL DEFAULT 'CONFORTABLE',
    "radiusInterface" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "emailExpediteur" TEXT,
    "signatureEmail" TEXT,
    "delaiTypeParDefaut" "TypeDelai" NOT NULL DEFAULT 'CALENDAIRES',
    "reportSiWeekendOuFerieDefaut" BOOLEAN NOT NULL DEFAULT false,
    "espacePublicActif" BOOLEAN NOT NULL DEFAULT false,
    "slugPublic" TEXT,
    "joursRappel" INTEGER[] DEFAULT ARRAY[15, 10, 5, 3, 1]::INTEGER[],
    "frequenceRelanceRetardJours" INTEGER NOT NULL DEFAULT 2,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "organisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "structures" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "sigle" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "TypeStructure" NOT NULL DEFAULT 'AUTRE',
    "parentId" TEXT,
    "description" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "structures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "utilisateurs" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenoms" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telephone" TEXT,
    "motDePasseHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "structureId" TEXT,
    "emailSuperieur" TEXT,
    "estTitulaire" BOOLEAN NOT NULL DEFAULT false,
    "fonction" TEXT,
    "avatarUrl" TEXT,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "derniereConnexion" TIMESTAMP(3),
    "tentativesConnexionEchouees" INTEGER NOT NULL DEFAULT 0,
    "bloqueJusqua" TIMESTAMP(3),
    "totpSecret" TEXT,
    "totpActif" BOOLEAN NOT NULL DEFAULT false,
    "jetonMotDePasse" TEXT,
    "jetonMotDePasseExpire" TIMESTAMP(3),
    "preferencesNotification" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "utilisateurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_structures" (
    "adminId" TEXT NOT NULL,
    "structureId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_structures_pkey" PRIMARY KEY ("adminId","structureId")
);

-- CreateTable
CREATE TABLE "domaines" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "domaines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jours_feries" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "libelle" TEXT NOT NULL,
    "recurrentAnnuel" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jours_feries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "publications" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "structureId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "domaineId" TEXT NOT NULL,
    "periodicite" "Periodicite" NOT NULL,
    "nombreAnneesPeriodicite" INTEGER,
    "delaiJours" INTEGER NOT NULL,
    "delaiType" "TypeDelai" NOT NULL DEFAULT 'CALENDAIRES',
    "reportSiWeekendOuFerie" BOOLEAN NOT NULL DEFAULT false,
    "pointFocalId" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indicateurs" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "structureId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT,
    "publicationId" TEXT,
    "domaineId" TEXT NOT NULL,
    "periodicite" "Periodicite" NOT NULL,
    "nombreAnneesPeriodicite" INTEGER,
    "delaiJours" INTEGER NOT NULL,
    "delaiType" "TypeDelai" NOT NULL DEFAULT 'CALENDAIRES',
    "reportSiWeekendOuFerie" BOOLEAN NOT NULL DEFAULT false,
    "unite" TEXT,
    "sourceDonnees" TEXT,
    "pointFocalId" TEXT,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "indicateurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendriers" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "structureId" TEXT NOT NULL,
    "annee" INTEGER NOT NULL,
    "statut" "StatutCalendrier" NOT NULL DEFAULT 'BROUILLON',
    "generePar" TEXT,
    "generatedAt" TIMESTAMP(3),
    "validePar" TEXT,
    "valideAt" TIMESTAMP(3),
    "commentaireValidation" TEXT,
    "demandeDeblocage" BOOLEAN NOT NULL DEFAULT false,
    "demandeDeblocageMotif" TEXT,
    "demandeDeblocageAt" TIMESTAMP(3),
    "publieEnLigne" BOOLEAN NOT NULL DEFAULT false,
    "publieEnLigneAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendriers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lignes_calendrier" (
    "id" TEXT NOT NULL,
    "calendrierId" TEXT NOT NULL,
    "elementType" "TypeElement" NOT NULL,
    "publicationId" TEXT,
    "indicateurId" TEXT,
    "libellePeriode" TEXT NOT NULL,
    "dateDebutCouverture" DATE NOT NULL,
    "dateFinCouverture" DATE NOT NULL,
    "dateDiffusionPrevue" DATE NOT NULL,
    "dateDiffusionInitiale" DATE NOT NULL,
    "dateDiffusionReelle" TIMESTAMP(3),
    "statut" "StatutLigne" NOT NULL DEFAULT 'PLANIFIE',
    "lienPublication" TEXT,
    "qrCodeUrl" TEXT,
    "modifieManuellement" BOOLEAN NOT NULL DEFAULT false,
    "commentaire" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lignes_calendrier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fichiers" (
    "id" TEXT NOT NULL,
    "ligneCalendrierId" TEXT NOT NULL,
    "type" "TypeFichier" NOT NULL,
    "nomOriginal" TEXT NOT NULL,
    "cheminStockage" TEXT NOT NULL,
    "tailleOctets" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "televersePar" TEXT NOT NULL,
    "televerseAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "fichiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "valeurs_indicateur" (
    "id" TEXT NOT NULL,
    "ligneCalendrierId" TEXT NOT NULL,
    "indicateurId" TEXT NOT NULL,
    "valeur" DECIMAL(20,6),
    "valeurTexte" TEXT,
    "unite" TEXT,
    "commentaire" TEXT,
    "nonDisponible" BOOLEAN NOT NULL DEFAULT false,
    "saisiPar" TEXT NOT NULL,
    "saisiAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "valeurs_indicateur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "retards" (
    "id" TEXT NOT NULL,
    "ligneCalendrierId" TEXT NOT NULL,
    "detecteAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statutAvancement" "StatutAvancement",
    "justification" TEXT,
    "prochaineDateDiffusion" DATE,
    "publie" BOOLEAN NOT NULL DEFAULT false,
    "datePublication" TIMESTAMP(3),
    "nombreRelancesEnvoyees" INTEGER NOT NULL DEFAULT 0,
    "derniereRelanceAt" TIMESTAMP(3),
    "relancesSuspendues" BOOLEAN NOT NULL DEFAULT false,
    "nombreReports" INTEGER NOT NULL DEFAULT 0,
    "historiqueReports" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "retards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "destinataireId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "lien" TEXT,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "luAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "structureId" TEXT NOT NULL,
    "sujet" TEXT NOT NULL,
    "dernierMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "auteurId" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "pieceJointeUrl" TEXT,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listes_diffusion_email" (
    "id" TEXT NOT NULL,
    "elementType" "TypeElement" NOT NULL,
    "elementId" TEXT NOT NULL,
    "emails" TEXT[],
    "majPar" TEXT NOT NULL,
    "majAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listes_diffusion_email_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_email" (
    "id" TEXT NOT NULL,
    "ligneCalendrierId" TEXT,
    "typeEnvoi" "TypeEnvoiEmail" NOT NULL,
    "destinataires" TEXT[],
    "sujet" TEXT NOT NULL,
    "statut" "StatutEnvoiEmail" NOT NULL,
    "erreur" TEXT,
    "envoyeAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "jourEnvoi" DATE NOT NULL,

    CONSTRAINT "journal_email_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_audit" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "utilisateurId" TEXT,
    "action" TEXT NOT NULL,
    "entite" TEXT NOT NULL,
    "entiteId" TEXT,
    "avant" JSONB,
    "apres" JSONB,
    "adresseIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modeles_email" (
    "id" TEXT NOT NULL,
    "organisationId" TEXT NOT NULL,
    "typeEnvoi" "TypeEnvoiEmail" NOT NULL,
    "sujet" TEXT NOT NULL,
    "corpsHtml" TEXT NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modeles_email_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organisations_slugPublic_key" ON "organisations"("slugPublic");

-- CreateIndex
CREATE INDEX "structures_organisationId_actif_idx" ON "structures"("organisationId", "actif");

-- CreateIndex
CREATE INDEX "structures_parentId_idx" ON "structures"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "structures_organisationId_code_key" ON "structures"("organisationId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_email_key" ON "utilisateurs"("email");

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_jetonMotDePasse_key" ON "utilisateurs"("jetonMotDePasse");

-- CreateIndex
CREATE INDEX "utilisateurs_organisationId_role_actif_idx" ON "utilisateurs"("organisationId", "role", "actif");

-- CreateIndex
CREATE INDEX "utilisateurs_structureId_idx" ON "utilisateurs"("structureId");

-- CreateIndex
CREATE INDEX "admin_structures_structureId_idx" ON "admin_structures"("structureId");

-- CreateIndex
CREATE UNIQUE INDEX "domaines_organisationId_code_key" ON "domaines"("organisationId", "code");

-- CreateIndex
CREATE INDEX "jours_feries_organisationId_idx" ON "jours_feries"("organisationId");

-- CreateIndex
CREATE UNIQUE INDEX "jours_feries_organisationId_date_key" ON "jours_feries"("organisationId", "date");

-- CreateIndex
CREATE INDEX "publications_organisationId_structureId_actif_idx" ON "publications"("organisationId", "structureId", "actif");

-- CreateIndex
CREATE INDEX "publications_domaineId_idx" ON "publications"("domaineId");

-- CreateIndex
CREATE INDEX "indicateurs_organisationId_structureId_actif_idx" ON "indicateurs"("organisationId", "structureId", "actif");

-- CreateIndex
CREATE INDEX "indicateurs_publicationId_idx" ON "indicateurs"("publicationId");

-- CreateIndex
CREATE INDEX "calendriers_organisationId_annee_statut_idx" ON "calendriers"("organisationId", "annee", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "calendriers_structureId_annee_key" ON "calendriers"("structureId", "annee");

-- CreateIndex
CREATE INDEX "lignes_calendrier_calendrierId_statut_idx" ON "lignes_calendrier"("calendrierId", "statut");

-- CreateIndex
CREATE INDEX "lignes_calendrier_dateDiffusionPrevue_statut_idx" ON "lignes_calendrier"("dateDiffusionPrevue", "statut");

-- CreateIndex
CREATE INDEX "lignes_calendrier_publicationId_idx" ON "lignes_calendrier"("publicationId");

-- CreateIndex
CREATE INDEX "lignes_calendrier_indicateurId_idx" ON "lignes_calendrier"("indicateurId");

-- CreateIndex
CREATE INDEX "fichiers_ligneCalendrierId_version_idx" ON "fichiers"("ligneCalendrierId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "valeurs_indicateur_ligneCalendrierId_indicateurId_key" ON "valeurs_indicateur"("ligneCalendrierId", "indicateurId");

-- CreateIndex
CREATE UNIQUE INDEX "retards_ligneCalendrierId_key" ON "retards"("ligneCalendrierId");

-- CreateIndex
CREATE INDEX "retards_publie_relancesSuspendues_idx" ON "retards"("publie", "relancesSuspendues");

-- CreateIndex
CREATE INDEX "notifications_destinataireId_lu_createdAt_idx" ON "notifications"("destinataireId", "lu", "createdAt");

-- CreateIndex
CREATE INDEX "conversations_organisationId_structureId_dernierMessageAt_idx" ON "conversations"("organisationId", "structureId", "dernierMessageAt");

-- CreateIndex
CREATE INDEX "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "listes_diffusion_email_elementType_elementId_key" ON "listes_diffusion_email"("elementType", "elementId");

-- CreateIndex
CREATE INDEX "journal_email_envoyeAt_idx" ON "journal_email"("envoyeAt");

-- CreateIndex
CREATE UNIQUE INDEX "journal_email_ligneCalendrierId_typeEnvoi_jourEnvoi_key" ON "journal_email"("ligneCalendrierId", "typeEnvoi", "jourEnvoi");

-- CreateIndex
CREATE INDEX "journal_audit_organisationId_createdAt_idx" ON "journal_audit"("organisationId", "createdAt");

-- CreateIndex
CREATE INDEX "journal_audit_entite_entiteId_idx" ON "journal_audit"("entite", "entiteId");

-- CreateIndex
CREATE UNIQUE INDEX "modeles_email_organisationId_typeEnvoi_key" ON "modeles_email"("organisationId", "typeEnvoi");

-- AddForeignKey
ALTER TABLE "structures" ADD CONSTRAINT "structures_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "structures" ADD CONSTRAINT "structures_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "structures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utilisateurs" ADD CONSTRAINT "utilisateurs_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "utilisateurs" ADD CONSTRAINT "utilisateurs_structureId_fkey" FOREIGN KEY ("structureId") REFERENCES "structures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_structures" ADD CONSTRAINT "admin_structures_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_structures" ADD CONSTRAINT "admin_structures_structureId_fkey" FOREIGN KEY ("structureId") REFERENCES "structures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domaines" ADD CONSTRAINT "domaines_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jours_feries" ADD CONSTRAINT "jours_feries_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_structureId_fkey" FOREIGN KEY ("structureId") REFERENCES "structures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_domaineId_fkey" FOREIGN KEY ("domaineId") REFERENCES "domaines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publications" ADD CONSTRAINT "publications_pointFocalId_fkey" FOREIGN KEY ("pointFocalId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicateurs" ADD CONSTRAINT "indicateurs_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicateurs" ADD CONSTRAINT "indicateurs_structureId_fkey" FOREIGN KEY ("structureId") REFERENCES "structures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicateurs" ADD CONSTRAINT "indicateurs_domaineId_fkey" FOREIGN KEY ("domaineId") REFERENCES "domaines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicateurs" ADD CONSTRAINT "indicateurs_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "publications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicateurs" ADD CONSTRAINT "indicateurs_pointFocalId_fkey" FOREIGN KEY ("pointFocalId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendriers" ADD CONSTRAINT "calendriers_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendriers" ADD CONSTRAINT "calendriers_structureId_fkey" FOREIGN KEY ("structureId") REFERENCES "structures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendriers" ADD CONSTRAINT "calendriers_generePar_fkey" FOREIGN KEY ("generePar") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendriers" ADD CONSTRAINT "calendriers_validePar_fkey" FOREIGN KEY ("validePar") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_calendrier" ADD CONSTRAINT "lignes_calendrier_calendrierId_fkey" FOREIGN KEY ("calendrierId") REFERENCES "calendriers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_calendrier" ADD CONSTRAINT "lignes_calendrier_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "publications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lignes_calendrier" ADD CONSTRAINT "lignes_calendrier_indicateurId_fkey" FOREIGN KEY ("indicateurId") REFERENCES "indicateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fichiers" ADD CONSTRAINT "fichiers_ligneCalendrierId_fkey" FOREIGN KEY ("ligneCalendrierId") REFERENCES "lignes_calendrier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fichiers" ADD CONSTRAINT "fichiers_televersePar_fkey" FOREIGN KEY ("televersePar") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valeurs_indicateur" ADD CONSTRAINT "valeurs_indicateur_ligneCalendrierId_fkey" FOREIGN KEY ("ligneCalendrierId") REFERENCES "lignes_calendrier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valeurs_indicateur" ADD CONSTRAINT "valeurs_indicateur_indicateurId_fkey" FOREIGN KEY ("indicateurId") REFERENCES "indicateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "valeurs_indicateur" ADD CONSTRAINT "valeurs_indicateur_saisiPar_fkey" FOREIGN KEY ("saisiPar") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "retards" ADD CONSTRAINT "retards_ligneCalendrierId_fkey" FOREIGN KEY ("ligneCalendrierId") REFERENCES "lignes_calendrier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_destinataireId_fkey" FOREIGN KEY ("destinataireId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_structureId_fkey" FOREIGN KEY ("structureId") REFERENCES "structures"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_auteurId_fkey" FOREIGN KEY ("auteurId") REFERENCES "utilisateurs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_email" ADD CONSTRAINT "journal_email_ligneCalendrierId_fkey" FOREIGN KEY ("ligneCalendrierId") REFERENCES "lignes_calendrier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_audit" ADD CONSTRAINT "journal_audit_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_audit" ADD CONSTRAINT "journal_audit_utilisateurId_fkey" FOREIGN KEY ("utilisateurId") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modeles_email" ADD CONSTRAINT "modeles_email_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
