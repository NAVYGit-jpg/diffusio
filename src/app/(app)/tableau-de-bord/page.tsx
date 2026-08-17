import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileUp,
  Globe2,
  TrendingUp,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formaterJJMMAAAA } from '@/lib/calendrier/dates';
import {
  COULEUR_STATUT,
  LIBELLE_STATUT_PLURIEL,
} from '@/lib/calendrier/statuts';
import {
  LogoOrganisation,
  chargerIdentiteOrganisation,
} from '@/components/layout/logo-organisation';
import { exigerActeur } from '@/lib/auth/session';
import { chargerActiviteRecente } from '@/lib/tableau-bord/donnees';
import { anneesProposees, lireFiltres } from '@/lib/tableau-bord/filtres-url';
import { libellePeriode } from '@/lib/tableau-bord/periode';
import { assemblerRapport } from '@/lib/tableau-bord/rapport';
import { BoutonsRapport } from './boutons-rapport';
import { BarreAvancement, CarteIndicateur } from './cartes';
import { CommentaireAffiche } from './commentaire-affiche';
import { FiltresTableauDeBord } from './filtres';
import { BarresRepartition, BarresStatut, CourbeRespect } from './graphiques';

/**
 * The tab title, and with it the name the browser proposes when printing to
 * PDF. Carrying the period means a folder of downloaded reports can be told
 * apart without opening a single one.
 */
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const filtres = lireFiltres(await searchParams);

  return {
    title: `Tableau de bord — ${libellePeriode(
      filtres.annee,
      filtres.mois,
    )} — DIFFUSIO`,
  };
}

function tonDuTaux(taux: number | null): 'neutre' | 'positif' | 'alerte' {
  if (taux === null) {
    return 'neutre';
  }

  return taux >= 80 ? 'positif' : taux < 50 ? 'alerte' : 'neutre';
}

export default async function PageTableauDeBord({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const acteur = await exigerActeur();
  const parametres = await searchParams;

  const filtres = lireFiltres(parametres);
  const annee = filtres.annee;

  const aujourdhui = new Date();

  // Same assembly as the Excel and PDF exports, so the three never disagree.
  const rapport = await assemblerRapport(acteur, filtres, aujourdhui);
  const activite = await chargerActiviteRecente(acteur.organisationId);
  const identite = await chargerIdentiteOrganisation();

  const {
    contexte,
    lignes,
    respect,
    retards,
    echeances,
    etat,
    nombres,
    avancement,
    courbe,
    classement,
    parDomaine,
    parPeriodicite,
    parStructure,
  } = rapport;

  // Labels and colours come from the shared status table, so the chart matches
  // the badges on the calendar screen.
  const partsStatut = (
    [
      { statut: 'PLANIFIE', nombre: nombres.planifiees },
      { statut: 'TELEVERSE', nombre: nombres.televersees },
      { statut: 'MIS_EN_LIGNE', nombre: nombres.misesEnLigne },
      { statut: 'EN_RETARD', nombre: nombres.enRetard },
      { statut: 'ANNULE', nombre: nombres.annulees },
    ] as const
  ).map((part) => ({
    libelle: LIBELLE_STATUT_PLURIEL[part.statut],
    nombre: part.nombre,
    couleur: COULEUR_STATUT[part.statut],
  }));

  const echeancesProches = [...lignes]
    .filter(
      (ligne) =>
        ligne.dateDiffusionReelle === null &&
        ligne.dateDiffusionPrevue.getTime() >= aujourdhui.getTime() - 86_400_000,
    )
    .sort(
      (a, b) => a.dateDiffusionPrevue.getTime() - b.dateDiffusionPrevue.getTime(),
    )
    .slice(0, 6);

  const vide = contexte.lignes.length === 0;

  // An empty screen has two very different causes, and telling them apart
  // matters: inviting somebody to "generate the calendar" when one already
  // exists and their filters simply exclude everything sends them off to redo
  // work that is already done.
  const filtresActifs =
    filtres.mois.length +
    filtres.structureIds.length +
    filtres.domaineIds.length +
    filtres.periodicites.length +
    filtres.typesElement.length;

  return (
    <div className="mx-auto max-w-6xl">
      {/* ------------------------------------------------- page de garde (PDF)
          Sur papier seulement. Un rapport quitte l'application : il circule par
          messagerie, il est imprimé, il est archivé. Il doit donc porter sur sa
          première page ce que l'écran n'a pas besoin de dire, parce que
          l'écran, lui, a toujours ses filtres sous les yeux : ce qu'il couvre,
          sur quel périmètre, et à quelle date il a été arrêté. */}
      {!vide && (
        <section className="hidden print:flex print:min-h-[240mm] print:break-after-page print:flex-col print:justify-between">
          <div className="flex items-center justify-between gap-4 border-b border-zinc-300 pb-6">
            <LogoOrganisation identite={identite} hauteur={44} />
            <span className="text-right text-sm text-zinc-600">
              {identite.nom}
            </span>
          </div>

          <div className="py-10">
            <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">
              Rapport de diffusion
            </p>
            {/* Un <p>, pas un <h1> : le seul titre de niveau 1 du document est
                celui de l'écran, et deux h1 dans le DOM pour n'en montrer qu'un
                à la fois se paierait sur tous les outils qui lisent la page. */}
            <p className="mt-4 text-4xl font-semibold leading-tight tracking-tight">
              Tableau de bord du calendrier de diffusion
            </p>

            {/* La période est l'information la plus grande de la page après le
                titre : c'est elle qui distingue deux rapports par ailleurs
                identiques, et c'est elle qu'on cherche des semaines plus tard
                dans une pile de PDF. */}
            <p className="mt-8 text-2xl font-medium">{rapport.periode}</p>

            <dl className="mt-10 space-y-3 text-sm">
              <div className="flex gap-3">
                <dt className="w-40 shrink-0 text-zinc-500">Périmètre</dt>
                <dd className="font-medium">{rapport.perimetre}</dd>
              </div>

              {/* Énumérés un par un, jamais résumés en « 3 filtres actifs » :
                  un lecteur qui reçoit le fichier n'a aucun moyen de deviner
                  lesquels, et un chiffre inexpliqué ne se vérifie pas. */}
              <div className="flex gap-3">
                <dt className="w-40 shrink-0 text-zinc-500">Filtres</dt>
                <dd>
                  {rapport.filtresLisibles.length === 0 ? (
                    <span className="text-zinc-500">
                      Aucun — le rapport couvre tout le périmètre
                    </span>
                  ) : (
                    <ul className="space-y-1">
                      {rapport.filtresLisibles.map((filtre) => (
                        <li key={filtre} className="font-medium">
                          {filtre}
                        </li>
                      ))}
                    </ul>
                  )}
                </dd>
              </div>

              <div className="flex gap-3">
                <dt className="w-40 shrink-0 text-zinc-500">Lignes retenues</dt>
                <dd className="font-medium">
                  {nombres.total} ligne{nombres.total > 1 ? 's' : ''} du
                  calendrier
                </dd>
              </div>

              <div className="flex gap-3">
                <dt className="w-40 shrink-0 text-zinc-500">Édité le</dt>
                <dd className="font-medium">
                  {formaterJJMMAAAA(rapport.genereLe)}
                </dd>
              </div>

              <div className="flex gap-3">
                <dt className="w-40 shrink-0 text-zinc-500">Édité par</dt>
                <dd className="font-medium">{acteur.nomComplet}</dd>
              </div>
            </dl>
          </div>

          <p className="border-t border-zinc-300 pt-4 text-xs text-zinc-500">
            Document produit par DIFFUSIO. Les chiffres portent sur les
            structures rattachées au compte qui a édité le rapport.
          </p>
        </section>
      )}

      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight print:text-xl">
            Tableau de bord
          </h1>
          <p className="mt-1 text-sm text-muted-foreground print:hidden">
            Bonjour {acteur.nomComplet}. Les chiffres ci-dessous portent
            uniquement sur les structures qui vous sont rattachées.
          </p>
          {/* Rappel court en tête des pages de chiffres : la page de garde est
              restée deux pages en arrière quand on lit le classement. */}
          <p className="mt-1 hidden text-sm text-zinc-600 print:block">
            {rapport.periode} — {rapport.perimetre}
          </p>
        </div>

        {!vide && <BoutonsRapport />}
      </header>

      <div className="print:hidden">
        <FiltresTableauDeBord
          etat={filtres}
          annees={anneesProposees(contexte.anneesDisponibles, annee)}
          structures={contexte.structures}
          domaines={contexte.domaines}
        />
      </div>

      {vide && filtresActifs > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Aucune ligne ne correspond à vos filtres</CardTitle>
            <CardDescription>
              Le calendrier {annee} contient des lignes, mais aucune ne réunit{' '}
              {filtresActifs > 1
                ? `les ${filtresActifs} critères que vous avez choisis`
                : 'le critère que vous avez choisi'}
              .
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm" variant="outline">
              <Link href={`/tableau-de-bord?annee=${annee}`}>
                Retirer tous les filtres
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : vide ? (
        <Card>
          <CardHeader>
            <CardTitle>Aucune donnée pour {annee}</CardTitle>
            <CardDescription>
              Le tableau de bord se remplit dès qu&apos;un calendrier de
              diffusion existe pour cette année.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Commencez par déclarer vos publications et vos indicateurs dans le
              catalogue, puis générez le calendrier de l&apos;année.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" variant="outline">
                <Link href="/catalogue">Aller au catalogue</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={`/calendrier?annee=${annee}`}>
                  Générer le calendrier {annee}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* --------------------------------------------------- indicateurs */}
          <section
            aria-label="Indicateurs clés"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <CarteIndicateur
              misEnAvant
              libelle="Taux de respect des délais"
              valeur={respect.taux}
              unite="%"
              precision={
                respect.base === 0
                  ? 'Aucune échéance passée'
                  : `${respect.respectees} sur ${respect.base} ligne(s) jugeable(s)`
              }
              icone={CheckCircle2}
              ton={tonDuTaux(respect.taux)}
            />
            {/* §10 — deux natures de retard, comptées à part : celui qui dure
                encore et celui qui est soldé. Les additionner masquerait la
                seule question qui appelle une action aujourd'hui. */}
            <CarteIndicateur
              libelle="En retard, non publiées"
              valeur={etat.nonPubliees}
              precision={
                etat.nonPubliees === 0
                  ? 'Rien ne reste en attente'
                  : 'Échéance passée, toujours rien en ligne'
              }
              icone={AlertTriangle}
              ton={etat.nonPubliees > 0 ? 'alerte' : 'positif'}
            />
            <CarteIndicateur
              libelle="Publiées après échéance"
              valeur={etat.publieesApresEcheance}
              precision={
                etat.total === 0
                  ? 'Aucun retard constaté'
                  : `Sur ${etat.total} ligne(s) en retard au total`
              }
              icone={Clock}
              ton={
                etat.publieesApresEcheance > 0 && etat.nonPubliees === 0
                  ? 'neutre'
                  : 'neutre'
              }
            />
            <CarteIndicateur
              libelle="Échéances à 30 jours"
              valeur={echeances.j30}
              precision={
                retards.moyen === null
                  ? `${echeances.j7} sous 7 jours, ${echeances.j15} sous 15 jours`
                  : `${echeances.j15} sous 15 jours · retard moyen ${retards.moyen} j, max ${retards.maximum} j`
              }
              icone={CalendarClock}
            />
          </section>

          <section
            aria-label="Volumes"
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <CarteIndicateur
              libelle="Au catalogue"
              valeur={contexte.catalogue.publications + contexte.catalogue.indicateurs}
              precision={`${contexte.catalogue.publications} publication(s), ${contexte.catalogue.indicateurs} indicateur(s)`}
              icone={BookOpen}
            />
            <CarteIndicateur
              libelle="Lignes prévues"
              valeur={nombres.total}
              precision={rapport.periode}
              icone={CalendarClock}
            />
            <CarteIndicateur
              libelle="Livrées"
              valeur={nombres.televersees}
              precision="En attente de confirmation de publication"
              icone={FileUp}
            />
            <CarteIndicateur
              libelle="Publiées"
              valeur={nombres.misesEnLigne}
              precision={`${avancement} % du calendrier`}
              icone={Globe2}
              ton={nombres.misesEnLigne > 0 ? 'positif' : 'neutre'}
            />
          </section>

          {/* ------------------------------------------------- commentaire */}
          <CommentaireAffiche observations={rapport.commentaire} />

          {/* -------------------------------------------------- avancement */}
          <Card>
            <CardHeader className="pb-3">
              {/* La période, pas l'année : filtré sur janvier, « avancement de
                  l'année 2026 » annoncerait un chiffre que la carte ne montre
                  pas. */}
              <CardTitle className="text-base">
                Avancement — {rapport.periode}
              </CardTitle>
              <CardDescription>
                {nombres.misesEnLigne} ligne(s) mise(s) en ligne sur{' '}
                {nombres.total} inscrite(s) au calendrier.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <BarreAvancement
                pourcentage={avancement}
                libelle={`Avancement — ${rapport.periode} : ${avancement} %`}
              />
              <p className="mt-2 text-right text-sm font-medium tabular-nums">
                {avancement} %
              </p>
            </CardContent>
          </Card>

          {/* ---------------------------------------------------- graphiques */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="size-4 text-muted-foreground" aria-hidden />
                  Évolution mensuelle du taux de respect
                </CardTitle>
                <CardDescription>
                  Chaque ligne est comptée dans le mois où elle était attendue.
                  Les mois sans publication prévue sont laissés vides.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CourbeRespect points={courbe} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Répartition par statut</CardTitle>
                <CardDescription>
                  État actuel des {nombres.total} ligne(s) du calendrier.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BarresStatut parts={partsStatut} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Répartition par domaine</CardTitle>
              </CardHeader>
              <CardContent>
                <BarresRepartition parts={parDomaine} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Répartition par périodicité
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BarresRepartition parts={parPeriodicite} />
              </CardContent>
            </Card>

            {contexte.structures.length > 1 && (
              <Card className="lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    Répartition par structure
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <BarresRepartition parts={parStructure} />
                </CardContent>
              </Card>
            )}
          </div>

          {/* ---------------------------------------------------- classement */}
          {contexte.classementVisible && classement.length > 1 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Classement des structures
                </CardTitle>
                <CardDescription>
                  Par taux de respect des délais. Une structure sans échéance
                  passée n&apos;est pas encore mesurable.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12 pl-6">#</TableHead>
                      <TableHead>Structure</TableHead>
                      <TableHead className="text-right">Jugeables</TableHead>
                      <TableHead className="text-right">Respectées</TableHead>
                      <TableHead className="text-right">En retard</TableHead>
                      <TableHead className="pr-6 text-right">Taux</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classement.map((rang, index) => (
                      <TableRow key={rang.structureId}>
                        <TableCell className="pl-6 text-muted-foreground tabular-nums">
                          {rang.taux === null ? '—' : index + 1}
                        </TableCell>
                        <TableCell className="font-medium">
                          {rang.structureNom}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {rang.base}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {rang.respectees}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {rang.retards}
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          {rang.taux === null ? (
                            <span className="text-muted-foreground">
                              Non mesurable
                            </span>
                          ) : (
                            <Badge
                              variant={
                                rang.taux >= 80
                                  ? 'default'
                                  : rang.taux < 50
                                    ? 'destructive'
                                    : 'secondary'
                              }
                            >
                              {rang.taux} %
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* ----------------------------------------- échéances et activité */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Prochaines échéances</CardTitle>
                <CardDescription>
                  Les six diffusions attendues les plus proches, non encore
                  mises en ligne.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {echeancesProches.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucune échéance à venir sur ce périmètre.
                  </p>
                ) : (
                  echeancesProches.map((ligne) => (
                    <div
                      key={ligne.id}
                      className="flex items-center justify-between gap-3 border-b pb-2 last:border-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {ligne.structureNom}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {ligne.domaine ?? 'Sans domaine'}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                        {formaterJJMMAAAA(ligne.dateDiffusionPrevue)}
                      </span>
                    </div>
                  ))
                )}

                <Button asChild size="sm" variant="outline" className="mt-1">
                  <Link href={`/calendrier?annee=${annee}`}>
                    Ouvrir le calendrier
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Activité récente</CardTitle>
                <CardDescription>
                  Les dernières actions enregistrées dans l&apos;organisation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {activite.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Rien à afficher pour l&apos;instant.
                  </p>
                ) : (
                  activite.map((entree) => (
                    <div
                      key={entree.id}
                      className="flex items-start justify-between gap-3 border-b pb-2 last:border-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm">
                          {entree.action}{' '}
                          <span className="text-muted-foreground">
                            ({entree.entite})
                          </span>
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {entree.auteur ?? 'Compte supprimé'}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {formaterJJMMAAAA(entree.quand)}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
