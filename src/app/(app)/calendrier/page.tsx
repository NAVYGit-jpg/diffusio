import type { Metadata } from 'next';

import { perimetreStructures } from '@/lib/auth/permissions';
import { exigerActeur } from '@/lib/auth/session';
import { nombreDeLignes } from '@/lib/calendrier/moteur';
import { prisma } from '@/lib/prisma';
import { VueCalendrier } from './vue-calendrier';

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

  const structureId = parametres.structure ?? structures[0]?.id ?? '';
  const annee = Number(parametres.annee) || ANNEE_PAR_DEFAUT;

  if (structures.length === 0) {
    return (
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-semibold tracking-tight">
          Calendrier de diffusion
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Aucune structure ne vous est rattachée. Contactez votre administrateur.
        </p>
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
            publication: { select: { nom: true } },
            indicateur: { select: { nom: true } },
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
                })),
              }
            : null
        }
      />
    </div>
  );
}
