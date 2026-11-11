'use client';

import { BookOpen, ChartNoAxesColumn, ClipboardList, Clock, Layers, LineChart, Link2, Plus, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  basculerActivationCatalogueAction,
  supprimerCatalogueAction,
} from '@/lib/actions/catalogue';
import { LIBELLE_PERIODICITE, PERIODICITES } from '@/lib/catalogue/schemas';
import { DialoguePublication } from './dialogue-publication';
import { DialogueIndicateur } from './dialogue-indicateur';

export type Structure = {
  id: string;
  nom: string;
  sigle: string;
  profondeur: number;
};

export type Domaine = { id: string; nom: string };

export type Publication = {
  id: string;
  nom: string;
  description: string | null;
  structureId: string;
  domaineId: string;
  periodicite: string;
  nombreAnneesPeriodicite: number | null;
  delaiJours: number;
  delaiType: string;
  reportSiWeekendOuFerie: boolean;
  actif: boolean;
  structure: { sigle: string } | null;
  domaine: { nom: string } | null;
  pointFocal: { nom: string; prenoms: string } | null;
  _count: { indicateursAffilies: number };
};

export type Indicateur = {
  id: string;
  nom: string;
  description: string | null;
  structureId: string;
  publicationId: string | null;
  domaineId: string;
  periodicite: string;
  nombreAnneesPeriodicite: number | null;
  delaiJours: number;
  delaiType: string;
  reportSiWeekendOuFerie: boolean;
  unite: string | null;
  sourceDonnees: string | null;
  actif: boolean;
  structure: { sigle: string } | null;
  domaine: { nom: string } | null;
  publication: { nom: string } | null;
};

/** Case- and accent-insensitive search, as expected when typing "economie". */
function normaliser(valeur: string): string {
  return valeur
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function VueCatalogue({
  publications,
  indicateurs,
  domaines,
  structures,
  familles,
}: {
  publications: Publication[];
  indicateurs: Indicateur[];
  domaines: Domaine[];
  structures: Structure[];
  /** Pour chaque structure, elle-même et ses structures rattachées. */
  familles: Record<string, string[]>;
}) {
  const [onglet, setOnglet] = useState<'publications' | 'indicateurs'>(
    'publications',
  );
  const [recherche, setRecherche] = useState('');
  const [domaineFiltre, setDomaineFiltre] = useState('toutes');
  const [periodiciteFiltre, setPeriodiciteFiltre] = useState('toutes');
  const [structureFiltre, setStructureFiltre] = useState('toutes');
  const [enCours, demarrer] = useTransition();

  const correspond = (element: {
    structureId: string;
    nom: string;
    domaineId: string;
    periodicite: string;
    domaine: { nom: string } | null;
  }): boolean => {
    // Une structure parente inclut ses structures rattachées.
    if (
      structureFiltre !== 'toutes' &&
      !(familles[structureFiltre] ?? [structureFiltre]).includes(element.structureId)
    ) {
      return false;
    }

    if (domaineFiltre !== 'toutes' && element.domaineId !== domaineFiltre) {
      return false;
    }

    if (
      periodiciteFiltre !== 'toutes' &&
      element.periodicite !== periodiciteFiltre
    ) {
      return false;
    }

    if (recherche.trim() === '') {
      return true;
    }

    const terme = normaliser(recherche);

    return (
      normaliser(element.nom).includes(terme) ||
      normaliser(element.domaine?.nom ?? '').includes(terme) ||
      normaliser(
        LIBELLE_PERIODICITE[
          element.periodicite as keyof typeof LIBELLE_PERIODICITE
        ] ?? '',
      ).includes(terme)
    );
  };

  const publicationsVisibles = useMemo(
    () => publications.filter(correspond),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [publications, recherche, domaineFiltre, periodiciteFiltre, structureFiltre],
  );

  const indicateursVisibles = useMemo(
    () => indicateurs.filter(correspond),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [indicateurs, recherche, domaineFiltre, periodiciteFiltre, structureFiltre],
  );

  const basculer = (
    type: 'publication' | 'indicateur',
    id: string,
    nom: string,
    actif: boolean,
  ) => {
    if (
      actif &&
      !window.confirm(
        `Désactiver « ${nom} » ?\n\nIl ne sera plus proposé lors de la génération d'un calendrier. Les lignes déjà générées restent intactes.`,
      )
    ) {
      return;
    }

    demarrer(async () => {
      const resultat = await basculerActivationCatalogueAction(type, id);
      if (resultat.erreur) {
        toast.error(resultat.erreur);
      } else {
        toast.success(resultat.message ?? 'Terminé.');
      }
    });
  };

  const supprimer = (type: 'publication' | 'indicateur', id: string, nom: string) => {
    if (
      !window.confirm(
        `Supprimer « ${nom} » du catalogue ?\n\nImpossible tant qu’une ligne de calendrier en cours lui est rattachée ; les lignes déjà publiées ne bloquent pas.`,
      )
    ) {
      return;
    }

    demarrer(async () => {
      const resultat = await supprimerCatalogueAction(type, id);
      if (resultat.erreur) {
        toast.error(resultat.erreur);
      } else {
        toast.success(resultat.message ?? 'Supprimé.');
      }
    });
  };

  const delaiLisible = (element: {
    delaiJours: number;
    delaiType: string;
    reportSiWeekendOuFerie: boolean;
  }) =>
    `${element.delaiJours} j ${element.delaiType === 'OUVRES' ? 'ouvrés' : 'calendaires'}${
      element.reportSiWeekendOuFerie ? ' · reporté' : ''
    }`;

  const periodiciteLisible = (element: {
    periodicite: string;
    nombreAnneesPeriodicite: number | null;
  }) => {
    const libelle =
      LIBELLE_PERIODICITE[
        element.periodicite as keyof typeof LIBELLE_PERIODICITE
      ] ?? element.periodicite;

    return element.periodicite === 'PLURIANNUELLE' && element.nombreAnneesPeriodicite
      ? `${libelle} (${element.nombreAnneesPeriodicite} ans)`
      : libelle;
  };

  // Résumé compact, calculé sur ce qui est affiché : il suit les filtres.
  const visibles = [...publicationsVisibles, ...indicateursVisibles];
  const delaiMoyen = visibles.length
    ? Math.round(visibles.reduce((somme, element) => somme + element.delaiJours, 0) / visibles.length)
    : null;
  const domainesCouverts = new Set(visibles.map((element) => element.domaineId)).size;
  const resume = [
    { icone: Layers, valeur: visibles.length, libelle: 'produits' },
    { icone: BookOpen, valeur: publicationsVisibles.length, libelle: 'publications' },
    { icone: LineChart, valeur: indicateursVisibles.length, libelle: 'indicateurs' },
    { icone: Clock, valeur: delaiMoyen === null ? '—' : `${delaiMoyen} j`, libelle: 'délai moyen' },
  ];

  return (
    <>
      <section
        aria-label="Statistiques du catalogue"
        className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border bg-card px-3 py-2.5 shadow-[var(--elevation-1,0_1px_2px_rgb(0_0_0/0.05))]"
      >
        {resume.map(({ icone: Icone, valeur, libelle }) => (
          <span key={libelle} className="inline-flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-1.5 text-sm">
            <Icone className="size-4 text-primary" aria-hidden />
            <span className="font-semibold tabular-nums">{valeur}</span>
            <span className="text-muted-foreground">{libelle}</span>
          </span>
        ))}
        <span className="hidden text-xs text-muted-foreground sm:inline">· {domainesCouverts} domaine(s)</span>
        <Link
          href="/tableau-de-bord"
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-primary hover:bg-primary/10"
        >
          <ChartNoAxesColumn className="size-4" aria-hidden />
          Statistiques détaillées
        </Link>
      </section>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1 space-y-2">
          <Label htmlFor="recherche">Rechercher</Label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="recherche"
              value={recherche}
              onChange={(evenement) => setRecherche(evenement.target.value)}
              placeholder="Nom, domaine, périodicité…"
              className="pl-8"
            />
          </div>
        </div>

        {structures.length > 1 && (
          <div className="w-56 space-y-2">
            <Label htmlFor="filtreStructure">Structure</Label>
            <Select value={structureFiltre} onValueChange={setStructureFiltre}>
              <SelectTrigger id="filtreStructure" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="toutes">Toutes les structures</SelectItem>
                {structures.map((structure) => (
                  <SelectItem key={structure.id} value={structure.id}>
                    <span style={{ paddingLeft: `${structure.profondeur * 0.75}rem` }}>
                      {structure.sigle || structure.nom}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="w-48 space-y-2">
          <Label htmlFor="filtreDomaine">Domaine</Label>
          <Select value={domaineFiltre} onValueChange={setDomaineFiltre}>
            <SelectTrigger id="filtreDomaine" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="toutes">Tous les domaines</SelectItem>
              {domaines.map((domaine) => (
                <SelectItem key={domaine.id} value={domaine.id}>
                  {domaine.nom}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-48 space-y-2">
          <Label htmlFor="filtrePeriodicite">Périodicité</Label>
          <Select value={periodiciteFiltre} onValueChange={setPeriodiciteFiltre}>
            <SelectTrigger id="filtrePeriodicite" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="toutes">Toutes</SelectItem>
              {PERIODICITES.map((periodicite) => (
                <SelectItem key={periodicite} value={periodicite}>
                  {LIBELLE_PERIODICITE[periodicite]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b">
        <div role="tablist" aria-label="Type d’élément" className="flex gap-1">
          {(
            [
              ['publications', `Publications (${publicationsVisibles.length})`],
              ['indicateurs', `Indicateurs (${indicateursVisibles.length})`],
            ] as const
          ).map(([cle, libelle]) => (
            <button
              key={cle}
              role="tab"
              type="button"
              aria-selected={onglet === cle}
              onClick={() => setOnglet(cle)}
              className={
                onglet === cle
                  ? 'border-b-2 border-primary px-3 py-2 text-sm font-medium'
                  : 'border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:text-foreground'
              }
            >
              {libelle}
            </button>
          ))}
        </div>

        <div className="flex gap-2 pb-2">
          {onglet === 'publications' ? (
            <DialoguePublication
              domaines={domaines}
              structures={structures}
              declencheur={
                <Button disabled={structures.length === 0}>
                  <Plus aria-hidden />
                  Nouvelle publication
                </Button>
              }
            />
          ) : (
            <DialogueIndicateur
              domaines={domaines}
              structures={structures}
              publications={publications}
              declencheur={
                <Button disabled={structures.length === 0}>
                  <Plus aria-hidden />
                  Nouvel indicateur
                </Button>
              }
            />
          )}
        </div>
      </div>

      {onglet === 'publications' ? (
        publicationsVisibles.length === 0 ? (
          <EtatVide
            titre={
              publications.length === 0
                ? 'Aucune publication au catalogue'
                : 'Aucune publication ne correspond à votre recherche'
            }
            texte={
              publications.length === 0
                ? 'Déclarez vos publications avec leur périodicité et leur délai de mise à disposition : ce sont ces deux informations qui produiront automatiquement votre calendrier de diffusion.'
                : 'Modifiez les filtres ou effacez la recherche pour voir davantage de résultats.'
            }
          />
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Publication</TableHead>
                  <TableHead>Domaine</TableHead>
                  <TableHead>Périodicité</TableHead>
                  <TableHead>Délai</TableHead>
                  <TableHead className="text-right">Indicateurs</TableHead>
                  <TableHead className="w-40 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {publicationsVisibles.map((publication) => (
                  <TableRow
                    key={publication.id}
                    className={publication.actif ? '' : 'opacity-55'}
                  >
                    <TableCell>
                      <span className="font-medium">{publication.nom}</span>
                      <p className="text-xs text-muted-foreground">
                        {publication.structure?.sigle}
                        {publication.pointFocal
                          ? ` · ${publication.pointFocal.prenoms} ${publication.pointFocal.nom}`
                          : ' · aucun point focal'}
                      </p>
                      {!publication.actif && (
                        <Badge variant="secondary" className="mt-1">
                          Désactivée
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {publication.domaine?.nom}
                    </TableCell>
                    <TableCell className="text-sm">
                      {periodiciteLisible(publication)}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums">
                      {delaiLisible(publication)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {publication._count.indicateursAffilies}
                    </TableCell>
                    <TableCell className="text-right">
                      <DialoguePublication
                        domaines={domaines}
                        structures={structures}
                        publication={publication}
                        declencheur={
                          <Button variant="ghost" size="sm">
                            Modifier
                          </Button>
                        }
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={enCours}
                        onClick={() =>
                          basculer(
                            'publication',
                            publication.id,
                            publication.nom,
                            publication.actif,
                          )
                        }
                      >
                        {publication.actif ? 'Désactiver' : 'Réactiver'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={enCours}
                        className="text-destructive hover:text-destructive"
                        onClick={() => supprimer('publication', publication.id, publication.nom)}
                        aria-label={`Supprimer ${publication.nom}`}
                        title="Supprimer"
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )
      ) : indicateursVisibles.length === 0 ? (
        <EtatVide
          titre={
            indicateurs.length === 0
              ? 'Aucun indicateur au catalogue'
              : 'Aucun indicateur ne correspond à votre recherche'
          }
          texte={
            indicateurs.length === 0
              ? 'Un indicateur rattaché à une publication en reprend automatiquement la périodicité et le délai. Un indicateur autonome porte les siens et obtiendra sa propre ligne de calendrier.'
              : 'Modifiez les filtres ou effacez la recherche pour voir davantage de résultats.'
          }
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Indicateur</TableHead>
                <TableHead>Rattachement</TableHead>
                <TableHead>Périodicité</TableHead>
                <TableHead>Délai</TableHead>
                <TableHead className="w-40 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {indicateursVisibles.map((indicateur) => (
                <TableRow
                  key={indicateur.id}
                  className={indicateur.actif ? '' : 'opacity-55'}
                >
                  <TableCell>
                    <span className="font-medium">{indicateur.nom}</span>
                    <p className="text-xs text-muted-foreground">
                      {indicateur.structure?.sigle}
                      {indicateur.unite ? ` · ${indicateur.unite}` : ''}
                    </p>
                    {!indicateur.actif && (
                      <Badge variant="secondary" className="mt-1">
                        Désactivé
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {indicateur.publication ? (
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        <Link2 className="size-3.5" aria-hidden />
                        {indicateur.publication.nom}
                      </span>
                    ) : (
                      <Badge variant="outline">Autonome</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {periodiciteLisible(indicateur)}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {delaiLisible(indicateur)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DialogueIndicateur
                      domaines={domaines}
                      structures={structures}
                      publications={publications}
                      indicateur={indicateur}
                      declencheur={
                        <Button variant="ghost" size="sm">
                          Modifier
                        </Button>
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={enCours}
                      onClick={() =>
                        basculer(
                          'indicateur',
                          indicateur.id,
                          indicateur.nom,
                          indicateur.actif,
                        )
                      }
                    >
                      {indicateur.actif ? 'Désactiver' : 'Réactiver'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={enCours}
                      className="text-destructive hover:text-destructive"
                      onClick={() => supprimer('indicateur', indicateur.id, indicateur.nom)}
                      aria-label={`Supprimer ${indicateur.nom}`}
                      title="Supprimer"
                    >
                      <Trash2 aria-hidden />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </>
  );
}

function EtatVide({ titre, texte }: { titre: string; texte: string }) {
  return (
    <div className="rounded-lg border border-dashed p-10 text-center">
      <ClipboardList className="mx-auto size-8 text-muted-foreground" aria-hidden />
      <h2 className="mt-4 font-medium">{titre}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">{texte}</p>
    </div>
  );
}
