'use client';

import { CircleAlert, Info, LoaderCircle } from 'lucide-react';
import { type ReactNode, useActionState, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  enregistrerIndicateurAction,
  type EtatCatalogue,
} from '@/lib/actions/catalogue';
import {
  LIBELLE_PERIODICITE,
  LIBELLE_TYPE_DELAI,
  PERIODICITES,
  TYPES_DELAI,
} from '@/lib/catalogue/schemas';
import type { Domaine, Indicateur, Publication, Structure } from './vue-catalogue';

const ETAT_INITIAL: EtatCatalogue = {};

export function DialogueIndicateur({
  domaines,
  structures,
  publications,
  indicateur,
  declencheur,
}: {
  domaines: Domaine[];
  structures: Structure[];
  publications: Publication[];
  indicateur?: Indicateur;
  declencheur: ReactNode;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [structureId, setStructureId] = useState(
    indicateur?.structureId ?? structures[0]?.id ?? '',
  );
  const [publicationId, setPublicationId] = useState(
    indicateur?.publicationId ?? 'aucune',
  );
  const [periodicite, setPeriodicite] = useState(
    indicateur?.periodicite ?? 'MENSUELLE',
  );
  // Scheduling fields are controlled from the start. Swapping an input between
  // `value` and `defaultValue` depending on inheritance would make React switch
  // it from controlled to uncontrolled and lose track of it.
  const [domaineId, setDomaineId] = useState(indicateur?.domaineId ?? '');
  const [delaiJours, setDelaiJours] = useState(
    String(indicateur?.delaiJours ?? 10),
  );
  const [delaiType, setDelaiType] = useState(
    indicateur?.delaiType ?? 'CALENDAIRES',
  );
  const [etat, action, enCours] = useActionState(
    enregistrerIndicateurAction,
    ETAT_INITIAL,
  );

  useEffect(() => {
    if (etat.succes) {
      setOuvert(false);
      toast.success(etat.message ?? 'Enregistré.');
    }
  }, [etat]);

  // §4.5 — a publication may only be chosen inside the same structure.
  const publicationsEligibles = useMemo(
    () =>
      publications.filter(
        (publication) =>
          publication.structureId === structureId && publication.actif,
      ),
    [publications, structureId],
  );

  const publicationChoisie =
    publicationId === 'aucune'
      ? null
      : (publications.find((p) => p.id === publicationId) ?? null);

  const herite = publicationChoisie !== null;
  const champs = etat.erreursChamps;
  const soumis = etat.valeurs;
  const valeur = (cle: string, defaut: string | number | null | undefined) =>
    soumis?.[cle] ?? (defaut === null || defaut === undefined ? '' : String(defaut));

  // Inherited fields are shown read-only, but the server recomputes them
  // anyway: displaying is not enforcing.
  const periodiciteAffichee = herite
    ? publicationChoisie!.periodicite
    : periodicite;
  const delaiAffiche = herite ? String(publicationChoisie!.delaiJours) : delaiJours;
  const delaiTypeAffiche = herite ? publicationChoisie!.delaiType : delaiType;
  const domaineAffiche = herite ? publicationChoisie!.domaineId : domaineId;

  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogTrigger asChild>{declencheur}</DialogTrigger>

      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {indicateur ? "Modifier l'indicateur" : 'Nouvel indicateur'}
          </DialogTitle>
          <DialogDescription>
            Rattaché à une publication, l&apos;indicateur en reprend le calendrier.
            Autonome, il obtient sa propre ligne.
          </DialogDescription>
        </DialogHeader>

        {etat.erreur && (
          <Alert variant="destructive">
            <CircleAlert aria-hidden />
            <AlertDescription>{etat.erreur}</AlertDescription>
          </Alert>
        )}

        <form key={indicateur?.id ?? 'creation'} action={action} className="space-y-4">
          {indicateur && <input type="hidden" name="id" value={indicateur.id} />}

          <div className="space-y-2">
            <Label htmlFor="nomIndicateur">Nom de l&apos;indicateur</Label>
            <Input
              id="nomIndicateur"
              name="nom"
              defaultValue={valeur('nom', indicateur?.nom)}
              required
              aria-invalid={Boolean(champs?.nom)}
            />
            {champs?.nom && (
              <p className="text-sm text-destructive">{champs.nom[0]}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="structureIndicateur">Structure</Label>
              <Select
                name="structureId"
                value={structureId}
                onValueChange={(nouvelle) => {
                  setStructureId(nouvelle);
                  // Changing structure invalidates the chosen publication.
                  setPublicationId('aucune');
                }}
              >
                <SelectTrigger id="structureIndicateur" className="w-full">
                  <SelectValue placeholder="À sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {structures.map((structure) => (
                    <SelectItem key={structure.id} value={structure.id}>
                      {structure.nom} ({structure.sigle})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {champs?.structureId && (
                <p className="text-sm text-destructive">{champs.structureId[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="publicationId">Publication de rattachement</Label>
              <Select
                name="publicationId"
                value={publicationId}
                onValueChange={setPublicationId}
              >
                <SelectTrigger id="publicationId" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aucune">Aucune (autonome)</SelectItem>
                  {publicationsEligibles.map((publication) => (
                    <SelectItem key={publication.id} value={publication.id}>
                      {publication.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {champs?.publicationId && (
                <p className="text-sm text-destructive">{champs.publicationId[0]}</p>
              )}
            </div>
          </div>

          {herite && (
            <Alert>
              <Info aria-hidden />
              <AlertDescription>
                Domaine, périodicité et délai sont repris de «{' '}
                {publicationChoisie!.nom} » et se mettront à jour automatiquement
                si elle change. Cet indicateur n&apos;aura pas de ligne de
                calendrier propre : sa valeur se saisit sur celle de la
                publication.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="domaineIndicateur">Domaine statistique</Label>
              <Select
                name="domaineId"
                value={domaineAffiche}
                onValueChange={setDomaineId}
                disabled={herite}
              >
                <SelectTrigger id="domaineIndicateur" className="w-full">
                  <SelectValue placeholder="À sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {domaines.map((domaine) => (
                    <SelectItem key={domaine.id} value={domaine.id}>
                      {domaine.nom}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {champs?.domaineId && (
                <p className="text-sm text-destructive">{champs.domaineId[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="periodiciteIndicateur">Périodicité</Label>
              <Select
                name="periodicite"
                value={periodiciteAffichee}
                onValueChange={setPeriodicite}
                disabled={herite}
              >
                <SelectTrigger id="periodiciteIndicateur" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIODICITES.map((valeurPeriodicite) => (
                    <SelectItem key={valeurPeriodicite} value={valeurPeriodicite}>
                      {LIBELLE_PERIODICITE[valeurPeriodicite]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {periodiciteAffichee === 'PLURIANNUELLE' && (
            <div className="space-y-2">
              <Label htmlFor="anneesIndicateur">Tous les combien ? (années)</Label>
              <Input
                id="anneesIndicateur"
                name="nombreAnneesPeriodicite"
                type="number"
                min={2}
                max={50}
                disabled={herite}
                defaultValue={
                  herite
                    ? (publicationChoisie!.nombreAnneesPeriodicite ?? '')
                    : valeur(
                        'nombreAnneesPeriodicite',
                        indicateur?.nombreAnneesPeriodicite,
                      )
                }
                aria-invalid={Boolean(champs?.nombreAnneesPeriodicite)}
              />
              {champs?.nombreAnneesPeriodicite && (
                <p className="text-sm text-destructive">
                  {champs.nombreAnneesPeriodicite[0]}
                </p>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="delaiIndicateur">Délai de mise à disposition</Label>
              <Input
                id="delaiIndicateur"
                name="delaiJours"
                type="number"
                min={0}
                value={delaiAffiche}
                onChange={(evenement) => setDelaiJours(evenement.target.value)}
                disabled={herite}
                required
                aria-invalid={Boolean(champs?.delaiJours)}
              />
              {champs?.delaiJours && (
                <p className="text-sm text-destructive">{champs.delaiJours[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="delaiTypeIndicateur">Type de délai</Label>
              <Select
                name="delaiType"
                value={delaiTypeAffiche}
                onValueChange={setDelaiType}
                disabled={herite}
              >
                <SelectTrigger id="delaiTypeIndicateur" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPES_DELAI.map((type) => (
                    <SelectItem key={type} value={type}>
                      {LIBELLE_TYPE_DELAI[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!herite && (
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="reportIndicateur">
                  Reporter au jour ouvré suivant
                </Label>
                <p className="text-xs text-muted-foreground">
                  Si la date calculée tombe un week-end ou un jour férié.
                </p>
              </div>
              <Switch
                id="reportIndicateur"
                name="reportSiWeekendOuFerie"
                defaultChecked={indicateur?.reportSiWeekendOuFerie ?? false}
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="unite">Unité (facultatif)</Label>
              <Input
                id="unite"
                name="unite"
                placeholder="%, FCFA, habitants…"
                defaultValue={valeur('unite', indicateur?.unite)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sourceDonnees">Source des données (facultatif)</Label>
              <Input
                id="sourceDonnees"
                name="sourceDonnees"
                defaultValue={valeur('sourceDonnees', indicateur?.sourceDonnees)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="descriptionIndicateur">Description (facultatif)</Label>
            <Textarea
              id="descriptionIndicateur"
              name="description"
              rows={2}
              defaultValue={valeur('description', indicateur?.description)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOuvert(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={enCours}>
              {enCours && <LoaderCircle className="animate-spin" aria-hidden />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
