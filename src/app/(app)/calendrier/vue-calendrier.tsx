'use client';

import {
  CalendarDays,
  CircleAlert,
  LoaderCircle,
  Pencil,
  Search,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
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
  type EtatCalendrier,
  genererCalendrierAction,
  previsualiserCalendrierAction,
} from '@/lib/actions/calendrier';
import { ANNEES_DISPONIBLES } from '@/lib/calendrier/annees';
import { LIBELLE_PERIODICITE } from '@/lib/catalogue/schemas';

type Element = {
  id: string;
  nom: string;
  periodicite: string;
  delaiJours: number;
  delaiType: string;
  domaine: string;
  lignesAttendues: number;
};

type LigneCalendrier = {
  id: string;
  nomElement: string;
  elementType: string;
  libellePeriode: string;
  dateDebutCouverture: string;
  dateFinCouverture: string;
  dateDiffusionPrevue: string;
  statut: string;
  modifieManuellement: boolean;
};

const ETAT_INITIAL: EtatCalendrier = {};

const LIBELLE_STATUT: Record<string, string> = {
  PLANIFIE: 'Planifié',
  A_VENIR: 'À venir',
  TELEVERSE: 'Téléversé',
  MIS_EN_LIGNE: 'Mis en ligne',
  EN_RETARD: 'En retard',
  ANNULE: 'Annulé',
};

/** DD/MM/YYYY from an ISO calendar day, read in UTC to avoid a shift. */
function formaterDate(iso: string): string {
  const date = new Date(iso);
  const j = String(date.getUTCDate()).padStart(2, '0');
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${j}/${m}/${date.getUTCFullYear()}`;
}

function normaliser(valeur: string): string {
  return valeur
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function VueCalendrier({
  structures,
  structureId,
  annee,
  publications,
  indicateurs,
  calendrier,
}: {
  structures: { id: string; nom: string; sigle: string }[];
  structureId: string;
  annee: number;
  publications: Element[];
  indicateurs: Element[];
  calendrier: { statut: string; lignes: LigneCalendrier[] } | null;
}) {
  const router = useRouter();
  const [recherche, setRecherche] = useState('');
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [apercu, previsualiser, previsualisationEnCours] = useActionState(
    previsualiserCalendrierAction,
    ETAT_INITIAL,
  );
  const [resultat, generer, generationEnCours] = useActionState(
    genererCalendrierAction,
    ETAT_INITIAL,
  );

  // The preview must reappear on every new run, including after a save:
  // gating it on `!resultat.applique` would hide it for good once a calendar
  // has been generated, making an update (§5.5) impossible without a reload.
  const [apercuVisible, setApercuVisible] = useState(false);

  useEffect(() => {
    if (apercu.apercu && apercu.apercu.length > 0) {
      setApercuVisible(true);
    }
  }, [apercu]);

  useEffect(() => {
    if (resultat.applique) {
      setApercuVisible(false);
      toast.success(`${resultat.nombreLignes} ligne(s) enregistrée(s).`);
      router.refresh();
    }
  }, [resultat, router]);

  const tousLesElements = useMemo(
    () => [
      ...publications.map((element) => ({ ...element, type: 'PUBLICATION' as const })),
      ...indicateurs.map((element) => ({ ...element, type: 'INDICATEUR' as const })),
    ],
    [publications, indicateurs],
  );

  const visibles = useMemo(() => {
    if (recherche.trim() === '') {
      return tousLesElements;
    }

    const terme = normaliser(recherche);

    return tousLesElements.filter(
      (element) =>
        normaliser(element.nom).includes(terme) ||
        normaliser(element.domaine).includes(terme) ||
        normaliser(
          LIBELLE_PERIODICITE[
            element.periodicite as keyof typeof LIBELLE_PERIODICITE
          ] ?? '',
        ).includes(terme),
    );
  }, [tousLesElements, recherche]);

  const basculer = (identifiant: string) => {
    setSelection((precedente) => {
      const suivante = new Set(precedente);
      if (suivante.has(identifiant)) {
        suivante.delete(identifiant);
      } else {
        suivante.add(identifiant);
      }
      return suivante;
    });
  };

  const toutSelectionner = (coche: boolean) => {
    setSelection(
      coche
        ? new Set(visibles.map((element) => `${element.type}::${element.id}`))
        : new Set(),
    );
  };

  const selectionnes = tousLesElements.filter((element) =>
    selection.has(`${element.type}::${element.id}`),
  );
  const lignesAttendues = selectionnes.reduce(
    (total, element) => total + element.lignesAttendues,
    0,
  );

  const naviguer = (nouvelleStructure: string, nouvelleAnnee: number) => {
    router.push(
      `/calendrier?structure=${nouvelleStructure}&annee=${nouvelleAnnee}`,
    );
  };

  /** Hidden fields shared by the preview and the generation forms. */
  const champsSelection = (
    <>
      <input type="hidden" name="annee" value={annee} />
      <input type="hidden" name="structureId" value={structureId} />
      {selectionnes
        .filter((element) => element.type === 'PUBLICATION')
        .map((element) => (
          <input
            key={element.id}
            type="hidden"
            name="publications"
            value={element.id}
          />
        ))}
      {selectionnes
        .filter((element) => element.type === 'INDICATEUR')
        .map((element) => (
          <input
            key={element.id}
            type="hidden"
            name="indicateurs"
            value={element.id}
          />
        ))}
    </>
  );

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end gap-3">
        {structures.length > 1 && (
          <div className="w-64 space-y-2">
            <Label htmlFor="choixStructure">Structure</Label>
            <Select
              value={structureId}
              onValueChange={(valeur) => naviguer(valeur, annee)}
            >
              <SelectTrigger id="choixStructure" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {structures.map((structure) => (
                  <SelectItem key={structure.id} value={structure.id}>
                    {structure.nom} ({structure.sigle})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="w-40 space-y-2">
          <Label htmlFor="choixAnnee">Année</Label>
          <Select
            value={String(annee)}
            onValueChange={(valeur) => naviguer(structureId, Number(valeur))}
          >
            <SelectTrigger id="choixAnnee" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {ANNEES_DISPONIBLES.map((valeur) => (
                <SelectItem key={valeur} value={String(valeur)}>
                  {valeur}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {calendrier && (
          <Badge variant={calendrier.statut === 'VALIDE' ? 'default' : 'secondary'}>
            {calendrier.statut === 'VALIDE'
              ? 'Calendrier validé'
              : calendrier.statut === 'SOUMIS'
                ? 'Soumis pour validation'
                : 'Brouillon'}
          </Badge>
        )}
      </div>

      <section className="mb-8 rounded-lg border p-4">
        <h2 className="font-medium">Générer le calendrier de diffusion</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cochez les éléments à inscrire au calendrier {annee}. Les publications
          ponctuelles et les indicateurs rattachés à une publication
          n&apos;apparaissent pas : ils n&apos;ont pas de ligne propre.
        </p>

        {tousLesElements.length === 0 ? (
          <Alert className="mt-4">
            <CircleAlert aria-hidden />
            <AlertDescription>
              Aucune publication ni indicateur autonome dans cette structure.
              Renseignez d&apos;abord le catalogue.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div className="min-w-56 flex-1 space-y-2">
                <Label htmlFor="rechercheElements">Rechercher</Label>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    id="rechercheElements"
                    value={recherche}
                    onChange={(evenement) => setRecherche(evenement.target.value)}
                    placeholder="Nom, domaine, périodicité…"
                    className="pl-8"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 pb-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4"
                  checked={
                    visibles.length > 0 &&
                    visibles.every((element) =>
                      selection.has(`${element.type}::${element.id}`),
                    )
                  }
                  onChange={(evenement) => toutSelectionner(evenement.target.checked)}
                />
                Tout sélectionner
              </label>
            </div>

            <div className="mt-3 max-h-72 overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>Élément</TableHead>
                    <TableHead>Périodicité</TableHead>
                    <TableHead>Délai</TableHead>
                    <TableHead className="text-right">Lignes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibles.map((element) => {
                    const identifiant = `${element.type}::${element.id}`;
                    return (
                      <TableRow key={identifiant}>
                        <TableCell>
                          <input
                            type="checkbox"
                            className="size-4"
                            aria-label={`Inclure ${element.nom}`}
                            checked={selection.has(identifiant)}
                            onChange={() => basculer(identifiant)}
                          />
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{element.nom}</span>
                          <p className="text-xs text-muted-foreground">
                            {element.type === 'INDICATEUR' ? 'Indicateur · ' : ''}
                            {element.domaine}
                          </p>
                        </TableCell>
                        <TableCell className="text-sm">
                          {LIBELLE_PERIODICITE[
                            element.periodicite as keyof typeof LIBELLE_PERIODICITE
                          ] ?? element.periodicite}
                        </TableCell>
                        <TableCell className="text-sm tabular-nums">
                          {element.delaiJours} j{' '}
                          {element.delaiType === 'OUVRES' ? 'ouvrés' : 'calendaires'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {element.lignesAttendues}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {selectionnes.length} élément(s) sélectionné(s) ·{' '}
                <strong className="text-foreground">{lignesAttendues}</strong> ligne(s)
                seront générées
              </p>

              <form action={previsualiser}>
                {champsSelection}
                <Button
                  type="submit"
                  disabled={selectionnes.length === 0 || previsualisationEnCours}
                >
                  {previsualisationEnCours && (
                    <LoaderCircle className="animate-spin" aria-hidden />
                  )}
                  Générer
                </Button>
              </form>
            </div>
          </>
        )}

        {apercu.erreur && (
          <Alert variant="destructive" className="mt-4">
            <CircleAlert aria-hidden />
            <AlertDescription>{apercu.erreur}</AlertDescription>
          </Alert>
        )}

        {resultat.erreur && (
          <Alert variant="destructive" className="mt-4">
            <CircleAlert aria-hidden />
            <AlertDescription>{resultat.erreur}</AlertDescription>
          </Alert>
        )}

        {apercuVisible && apercu.apercu && apercu.apercu.length > 0 && (
          <div className="mt-6 rounded-md border border-primary/40 bg-primary/5 p-4">
            <h3 className="font-medium">
              Prévisualisation — {apercu.apercu.length} ligne(s)
            </h3>

            {apercu.resume && (
              <ul className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                {apercu.resume.map((element) => (
                  <li key={element}>· {element}</li>
                ))}
              </ul>
            )}

            {apercu.aConfirmer && apercu.aConfirmer.length > 0 && (
              <Alert variant="destructive" className="mt-3">
                <CircleAlert aria-hidden />
                <AlertDescription>
                  {apercu.aConfirmer.length} ligne(s) ont été modifiée(s) à la
                  main. Confirmez pour que le calcul reprenne la main dessus.
                </AlertDescription>
              </Alert>
            )}

            <div className="mt-3 max-h-80 overflow-y-auto rounded-md border bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Élément</TableHead>
                    <TableHead>Période</TableHead>
                    <TableHead>Couverture</TableHead>
                    <TableHead>Diffusion prévue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apercu.apercu.map((ligne, index) => (
                    <TableRow key={`${ligne.elementId}-${index}`}>
                      <TableCell className="text-sm">{ligne.nomElement}</TableCell>
                      <TableCell className="text-sm">{ligne.libellePeriode}</TableCell>
                      <TableCell className="text-sm tabular-nums text-muted-foreground">
                        {formaterDate(ligne.dateDebutCouverture)} –{' '}
                        {formaterDate(ligne.dateFinCouverture)}
                      </TableCell>
                      <TableCell className="text-sm font-medium tabular-nums">
                        {formaterDate(ligne.dateDiffusionPrevue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <form action={generer} className="mt-4 flex flex-wrap justify-end gap-2">
              {champsSelection}
              {apercu.aConfirmer && apercu.aConfirmer.length > 0 && (
                <input type="hidden" name="ecraserManuelles" value="1" />
              )}
              <Button type="submit" disabled={generationEnCours}>
                {generationEnCours && (
                  <LoaderCircle className="animate-spin" aria-hidden />
                )}
                Confirmer et enregistrer
              </Button>
            </form>
          </div>
        )}

      </section>

      <section>
        <h2 className="mb-3 font-medium">Calendrier {annee}</h2>

        {!calendrier || calendrier.lignes.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <CalendarDays
              className="mx-auto size-8 text-muted-foreground"
              aria-hidden
            />
            <h3 className="mt-4 font-medium">Aucun calendrier pour {annee}</h3>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
              Sélectionnez vos publications et indicateurs ci-dessus, puis
              cliquez sur « Générer » pour obtenir un calendrier proposé que
              vous pourrez vérifier avant enregistrement.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Élément</TableHead>
                  <TableHead>Période</TableHead>
                  <TableHead>Couverture</TableHead>
                  <TableHead>Diffusion prévue</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calendrier.lignes.map((ligne) => (
                  <TableRow key={ligne.id}>
                    <TableCell className="text-sm">
                      {ligne.nomElement}
                      {ligne.elementType === 'INDICATEUR' && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          (indicateur)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{ligne.libellePeriode}</TableCell>
                    <TableCell className="text-sm tabular-nums text-muted-foreground">
                      {formaterDate(ligne.dateDebutCouverture)} –{' '}
                      {formaterDate(ligne.dateFinCouverture)}
                    </TableCell>
                    <TableCell className="text-sm font-medium tabular-nums">
                      {formaterDate(ligne.dateDiffusionPrevue)}
                      {ligne.modifieManuellement && (
                        <Pencil
                          className="ml-1.5 inline size-3 text-muted-foreground"
                          aria-label="Date modifiée manuellement"
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          ligne.statut === 'MIS_EN_LIGNE'
                            ? 'default'
                            : ligne.statut === 'EN_RETARD'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {LIBELLE_STATUT[ligne.statut] ?? ligne.statut}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </>
  );
}
