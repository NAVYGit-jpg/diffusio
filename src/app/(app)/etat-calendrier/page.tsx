import { AlarmClock, Ban, CalendarClock, CircleCheck, PackageCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { perimetreStructures } from '@/lib/auth/permissions';
import { exigerActeur } from '@/lib/auth/session';
import { normaliserJour } from '@/lib/calendrier/dates';
import {
  estChargeeIncompletement,
  estImminente,
  joursAvantEcheance,
} from '@/lib/calendrier/selection';
import { chargerLignesLivrables, critereSelection } from '@/lib/livrables/vues';
import { equipeOrganisation } from '@/lib/notifications/destinataires';
import { prisma } from '@/lib/prisma';
import { cn } from '@/lib/utils';
import { ListeLivrables } from '../_livrables/liste-livrables';
import { ContenuRetards } from '../retards/contenu';
import { ListeAnnulations } from './liste-annulations';

export const metadata: Metadata = {
  title: 'État du calendrier — DIFFUSIO',
};

const ONGLETS = [
  { cle: 'retard', libelle: 'En retard', Icone: AlarmClock, teinte: 'text-red-600' },
  { cle: 'imminentes', libelle: 'Imminentes', Icone: CalendarClock, teinte: 'text-amber-600' },
  { cle: 'livrees', libelle: 'Livrées, non publiées', Icone: PackageCheck, teinte: 'text-sky-600' },
  { cle: 'publiees', libelle: 'Publiées', Icone: CircleCheck, teinte: 'text-emerald-600' },
  { cle: 'annulees', libelle: 'Annulées', Icone: Ban, teinte: 'text-zinc-500' },
] as const;

type CleOnglet = (typeof ONGLETS)[number]['cle'];

/**
 * « État du calendrier » (replaces the separate imminent and late screens):
 * every line of the calendar, by where it stands. Moving a line — delivering,
 * publishing, cancelling — moves it from one tab to the next, and the
 * calendar's own status column says the same thing.
 */
export default async function PageEtatCalendrier({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const acteur = await exigerActeur();
  const parametres = await searchParams;
  const demande = typeof parametres.onglet === 'string' ? parametres.onglet : 'retard';
  const onglet: CleOnglet = ONGLETS.some((o) => o.cle === demande) ? (demande as CleOnglet) : 'retard';
  const aujourdhui = new Date();
  const jour = normaliserJour(aujourdhui).getTime();
  const perimetre = perimetreStructures(acteur);

  const [toutes, membresCoordination, annulations] = await Promise.all([
    chargerLignesLivrables(acteur, {}),
    equipeOrganisation(acteur.organisationId),
    perimetre !== null && perimetre.length === 0
      ? []
      : prisma.ligneCalendrier.findMany({
          where: {
            OR: [{ statut: 'ANNULE' }, { annulationDemandee: true }],
            calendrier: {
              organisationId: acteur.organisationId,
              ...(perimetre === null ? {} : { structureId: { in: perimetre } }),
            },
          },
          select: {
            id: true,
            statut: true,
            libellePeriode: true,
            dateDiffusionPrevue: true,
            motifAnnulation: true,
            annulationDemandeeAt: true,
            annulationDemandeePar: true,
            annuleeAt: true,
            calendrier: { select: { structure: { select: { sigle: true } } } },
            publication: { select: { nom: true } },
            indicateur: { select: { nom: true } },
          },
          orderBy: { dateDiffusionPrevue: 'desc' },
        }),
  ]);

  const enListe = (ligne: (typeof toutes)[number]) => ({
    ...ligne,
    joursRestants: joursAvantEcheance(
      { dateDiffusionPrevue: new Date(ligne.dateDiffusionPrevue) },
      aujourdhui,
    ),
    incomplet: estChargeeIncompletement(critereSelection(ligne)),
    publieeEnRetard:
      ligne.dateDiffusionReelle !== null &&
      normaliserJour(new Date(ligne.dateDiffusionReelle)).getTime() >
        normaliserJour(new Date(ligne.dateDiffusionPrevue)).getTime(),
  });

  const actives = toutes.filter((ligne) => ligne.statut !== 'ANNULE');
  const listes = {
    retard: actives.filter(
      (ligne) =>
        ligne.statut !== 'MIS_EN_LIGNE' &&
        ligne.statut !== 'TELEVERSE' &&
        ligne.dateDiffusionReelle === null &&
        normaliserJour(new Date(ligne.dateDiffusionPrevue)).getTime() < jour,
    ),
    imminentes: actives.filter((ligne) => estImminente(critereSelection(ligne), aujourdhui)),
    livrees: actives.filter((ligne) => ligne.statut === 'TELEVERSE'),
    publiees: actives.filter((ligne) => ligne.statut === 'MIS_EN_LIGNE'),
  };

  const auteurs = await prisma.utilisateur.findMany({
    where: { id: { in: annulations.flatMap((a) => (a.annulationDemandeePar ? [a.annulationDemandeePar] : [])) } },
    select: { id: true, prenoms: true, nom: true },
  });
  const nomAuteur = new Map(auteurs.map((a) => [a.id, `${a.prenoms} ${a.nom}`]));
  const versAnnulation = (ligne: (typeof annulations)[number], date: Date | null) => ({
    id: ligne.id,
    nomElement: ligne.publication?.nom ?? ligne.indicateur?.nom ?? 'Élément',
    structure: ligne.calendrier.structure.sigle,
    libellePeriode: ligne.libellePeriode,
    dateDiffusionPrevue: ligne.dateDiffusionPrevue.toISOString(),
    motif: ligne.motifAnnulation,
    demandeur: ligne.annulationDemandeePar ? (nomAuteur.get(ligne.annulationDemandeePar) ?? null) : null,
    date: date?.toISOString() ?? null,
  });
  const demandes = annulations
    .filter((ligne) => ligne.statut !== 'ANNULE')
    .map((ligne) => versAnnulation(ligne, ligne.annulationDemandeeAt));
  const annulees = annulations
    .filter((ligne) => ligne.statut === 'ANNULE')
    .map((ligne) => versAnnulation(ligne, ligne.annuleeAt));

  const compteurs: Record<CleOnglet, number> = {
    retard: listes.retard.length,
    imminentes: listes.imminentes.length,
    livrees: listes.livrees.length,
    publiees: listes.publiees.length,
    annulees: annulees.length + demandes.length,
  };
  const plusieursStructures = new Set(actives.map((ligne) => ligne.structureId)).size > 1;

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">État du calendrier</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Chaque diffusion selon où elle en est. Livrer, publier ou annuler fait passer la
          ligne d&apos;un onglet à l&apos;autre, et le calendrier affiche le même état.
        </p>
      </header>

      <nav aria-label="États" className="mb-6 flex flex-wrap gap-2">
        {ONGLETS.map(({ cle, libelle, Icone, teinte }) => {
          const actif = cle === onglet;

          return (
            <Link
              key={cle}
              href={`/etat-calendrier?onglet=${cle}`}
              aria-current={actif ? 'page' : undefined}
              className={cn(
                'inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium no-underline transition-all duration-200',
                actif
                  ? 'bg-foreground text-background shadow-[var(--elevation-3)]'
                  : 'bg-card shadow-[var(--elevation-1)] hover:-translate-y-0.5 hover:shadow-[var(--elevation-2)]',
              )}
            >
              <Icone className={cn('size-4', actif ? 'text-background' : teinte)} aria-hidden />
              {libelle}
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-xs tabular-nums',
                  actif ? 'bg-background/20' : 'bg-muted text-muted-foreground',
                )}
              >
                {compteurs[cle]}
              </span>
            </Link>
          );
        })}
      </nav>

      {onglet === 'retard' && <ContenuRetards avecEntete={false} />}

      {(onglet === 'imminentes' || onglet === 'livrees' || onglet === 'publiees') &&
        (listes[onglet].length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
            Aucune diffusion dans cet état pour le moment.
          </div>
        ) : (
          <ListeLivrables
            lignes={listes[onglet].map(enListe)}
            role={acteur.role}
            colonneEcheance={onglet === 'imminentes' ? 'imminente' : 'chargee'}
            afficherStructure={plusieursStructures}
            membresCoordination={membresCoordination}
          />
        ))}

      {onglet === 'annulees' && (
        <ListeAnnulations
          demandes={demandes}
          annulees={annulees}
          estAdmin={acteur.role === 'ADMIN' || acteur.role === 'SUPER_ADMIN'}
        />
      )}
    </div>
  );
}
