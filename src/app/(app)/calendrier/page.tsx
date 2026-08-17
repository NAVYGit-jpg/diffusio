import { CalendarDays } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { perimetreStructures } from '@/lib/auth/permissions';
import { exigerActeur } from '@/lib/auth/session';
import { nombreDeLignes } from '@/lib/calendrier/moteur';
import { prisma } from '@/lib/prisma';
import { TOUTES, estConsolide } from '@/lib/calendrier/consolidation';
import { VueCalendrier } from './vue-calendrier';
import { VueConsolidee } from './vue-consolidee';

export const metadata: Metadata = {
  title: 'Calendrier de diffusion — DIFFUSIO',
};

const ANNEE_PAR_DEFAUT = 2026;

export default async function PageCalendrier({
  searchParams,
}: {
  searchParams: Promise<{ structure?: string; annee?: string }>;
}) {
  const acteur = await exigerActeur();
  const parametres = await searchParams;
  const perimetre = perimetreStructures(acteur);

  const structures = await prisma.structure.findMany({
    where: {
      organisationId: acteur.organisationId,
      deletedAt: null,
      actif: true,
      ...(perimetre === null ? {} : { id: { in: perimetre } }),
    },
    select: { id: true, nom: true, sigle: true },
    orderBy: { nom: 'asc' },
  });

  // `TOUTES` sur l'une ou l'autre bascule vers la vue consolidee : un
  // calendrier appartient a une structure et a une annee, donc des qu'on en
  // couvre plusieurs, il n'y a plus un calendrier a generer ni a valider.
  const structureChoisie = parametres.structure ?? structures[0]?.id ?? '';
  const anneeChoisie = parametres.annee ?? String(ANNEE_PAR_DEFAUT);
  const consolide = estConsolide(structureChoisie, anneeChoisie);

  const structureId = consolide ? '' : structureChoisie;
  const annee = consolide
    ? ANNEE_PAR_DEFAUT
    : Number(anneeChoisie) || ANNEE_PAR_DEFAUT;

  if (structures.length === 0) {
    // The message has to match who is reading it: telling a super admin to
    // "contact their administrator" sends them looking for somebody who does
    // not exist, and reads like a failure rather than a next step.
    const peutCreerDesStructures = acteur.role === 'SUPER_ADMIN';

    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-semibold tracking-tight">
          Calendrier de diffusion
        </h1>

        <div className="mt-6 rounded-lg border border-dashed p-10 text-center">
          <CalendarDays
            className="mx-auto size-8 text-muted-foreground"
            aria-hidden
          />
          <h2 className="mt-4 font-medium">
            {peutCreerDesStructures
              ? 'Commencez par déclarer une structure'
              : 'Aucune structure ne vous est rattachée'}
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            {peutCreerDesStructures
              ? 'Un calendrier de diffusion appartient à une structure. Créez la première, puis renseignez ses publications avant de générer son calendrier.'
              : 'Votre compte n’est rattaché à aucune structure active. Demandez à votre administrateur de vous en affecter une.'}
          </p>

          {peutCreerDesStructures && (
            <Button asChild className="mt-6">
              <Link href="/structures">Créer une structure</Link>
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (consolide) {
    const perimetreIds = structures.map((structure) => structure.id);

    const lignes = await prisma.ligneCalendrier.findMany({
      where: {
        calendrier: {
          organisationId: acteur.organisationId,
          structureId:
            structureChoisie === TOUTES
              ? { in: perimetreIds }
              : structureChoisie,
          ...(anneeChoisie === TOUTES ? {} : { annee: Number(anneeChoisie) }),
        },
      },
      include: {
        calendrier: {
          select: {
            annee: true,
            structure: { select: { nom: true, sigle: true } },
          },
        },
        publication: { select: { nom: true } },
        indicateur: { select: { nom: true } },
      },
      orderBy: [{ dateDiffusionPrevue: 'asc' }],
    });

    const annees = [
      ...new Set(lignes.map((ligne) => ligne.calendrier.annee)),
    ].sort((a, b) => b - a);

    return (
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Calendrier de diffusion
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Vue consolidée de plusieurs structures ou de plusieurs années.
          </p>
        </header>

        <VueConsolidee
          structures={structures}
          annees={annees.length > 0 ? annees : [ANNEE_PAR_DEFAUT]}
          structureChoisie={structureChoisie}
          anneeChoisie={anneeChoisie}
          role={acteur.role}
          lignes={lignes.map((ligne) => ({
            id: ligne.id,
            structureNom: ligne.calendrier.structure.nom,
            structureSigle: ligne.calendrier.structure.sigle,
            annee: ligne.calendrier.annee,
            nomElement:
              ligne.publication?.nom ?? ligne.indicateur?.nom ?? 'Élément',
            elementType: ligne.elementType,
            libellePeriode: ligne.libellePeriode,
            dateDebutCouverture: ligne.dateDebutCouverture.toISOString(),
            dateFinCouverture: ligne.dateFinCouverture.toISOString(),
            dateDiffusionPrevue: ligne.dateDiffusionPrevue.toISOString(),
            dateDiffusionReelle:
              ligne.dateDiffusionReelle?.toISOString() ?? null,
            statut: ligne.statut,
          }))}
        />
      </div>
    );
  }

  const [publications, indicateurs, calendrier] = await Promise.all([
    prisma.publication.findMany({
      where: {
        organisationId: acteur.organisationId,
        structureId,
        deletedAt: null,
        actif: true,
      },
      select: {
        id: true,
        nom: true,
        periodicite: true,
        nombreAnneesPeriodicite: true,
        delaiJours: true,
        delaiType: true,
        domaine: { select: { nom: true } },
      },
      orderBy: { nom: 'asc' },
    }),
    prisma.indicateur.findMany({
      where: {
        organisationId: acteur.organisationId,
        structureId,
        deletedAt: null,
        actif: true,
        // §5.1 — only unaffiliated indicators get a line of their own.
        publicationId: null,
      },
      select: {
        id: true,
        nom: true,
        periodicite: true,
        nombreAnneesPeriodicite: true,
        delaiJours: true,
        delaiType: true,
        domaine: { select: { nom: true } },
      },
      orderBy: { nom: 'asc' },
    }),
    prisma.calendrier.findUnique({
      where: { structureId_annee: { structureId, annee } },
      include: {
        lignes: {
          orderBy: { dateDiffusionPrevue: 'asc' },
          include: {
            publication: {
              select: {
                nom: true,
                indicateursAffilies: {
                  where: { deletedAt: null, actif: true },
                  select: { id: true, nom: true, unite: true },
                },
              },
            },
            indicateur: { select: { id: true, nom: true, unite: true } },
            fichiers: {
              where: { deletedAt: null },
              orderBy: [{ type: 'asc' }, { version: 'desc' }],
            },
            valeurs: true,
          },
        },
      },
    }),
  ]);

  const decorer = (element: (typeof publications)[number]) => ({
    id: element.id,
    nom: element.nom,
    periodicite: element.periodicite,
    delaiJours: element.delaiJours,
    delaiType: element.delaiType,
    domaine: element.domaine?.nom ?? '',
    lignesAttendues: nombreDeLignes(
      element.periodicite,
      element.nombreAnneesPeriodicite,
      annee,
    ),
  });

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Calendrier de diffusion
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Les dates sont calculées à partir de la périodicité et du délai saisis
          dans le catalogue. Rien n&apos;est enregistré avant votre confirmation.
        </p>
      </header>

      <VueCalendrier
        structures={structures}
        structureId={structureId}
        annee={annee}
        role={acteur.role}
        publications={publications.map(decorer)}
        indicateurs={indicateurs.map(decorer)}
        calendrier={
          calendrier
            ? {
                id: calendrier.id,
                statut: calendrier.statut,
                commentaireValidation: calendrier.commentaireValidation,
                demandeDeblocage: calendrier.demandeDeblocage,
                demandeDeblocageMotif: calendrier.demandeDeblocageMotif,
                lignes: calendrier.lignes.map((ligne) => ({
                  id: ligne.id,
                  nomElement:
                    ligne.publication?.nom ?? ligne.indicateur?.nom ?? 'Élément',
                  elementType: ligne.elementType,
                  libellePeriode: ligne.libellePeriode,
                  dateDebutCouverture: ligne.dateDebutCouverture.toISOString(),
                  dateFinCouverture: ligne.dateFinCouverture.toISOString(),
                  dateDiffusionPrevue: ligne.dateDiffusionPrevue.toISOString(),
                  statut: ligne.statut,
                  modifieManuellement: ligne.modifieManuellement,
                  commentaire: ligne.commentaire,
                  lienPublication: ligne.lienPublication,
                  fichiers: ligne.fichiers.map((fichier) => ({
                    id: fichier.id,
                    type: fichier.type,
                    nomOriginal: fichier.nomOriginal,
                    version: fichier.version,
                    tailleOctets: fichier.tailleOctets,
                    televerseAt: fichier.televerseAt.toISOString(),
                  })),
                  valeurs: ligne.valeurs.map((valeur) => ({
                    indicateurId: valeur.indicateurId,
                    valeur: valeur.valeur?.toString() ?? null,
                    valeurTexte: valeur.valeurTexte,
                    commentaire: valeur.commentaire,
                    nonDisponible: valeur.nonDisponible,
                  })),
                  // Une publication fait saisir ses indicateurs affilies ; un
                  // indicateur autonome fait saisir sa propre valeur.
                  indicateursASaisir: ligne.publication
                    ? ligne.publication.indicateursAffilies
                    : ligne.indicateur
                      ? [ligne.indicateur]
                      : [],
                })),
              }
            : null
        }
      />
    </div>
  );
}
