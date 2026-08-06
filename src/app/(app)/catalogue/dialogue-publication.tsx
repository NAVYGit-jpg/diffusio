'use client';

import { CircleAlert, LoaderCircle } from 'lucide-react';
import { type ReactNode, useActionState, useEffect, useState } from 'react';
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
  enregistrerPublicationAction,
  type EtatCatalogue,
} from '@/lib/actions/catalogue';
import {
  LIBELLE_PERIODICITE,
  LIBELLE_TYPE_DELAI,
  PERIODICITES,
  TYPES_DELAI,
} from '@/lib/catalogue/schemas';
import type { Domaine, Publication, Structure } from './vue-catalogue';

const ETAT_INITIAL: EtatCatalogue = {};

export function DialoguePublication({
  domaines,
  structures,
  publication,
  declencheur,
}: {
  domaines: Domaine[];
  structures: Structure[];
  publication?: Publication;
  declencheur: ReactNode;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [periodicite, setPeriodicite] = useState(
    publication?.periodicite ?? 'MENSUELLE',
  );
  const [etat, action, enCours] = useActionState(
    enregistrerPublicationAction,
    ETAT_INITIAL,
  );

  useEffect(() => {
    if (etat.succes) {
      setOuvert(false);
      toast.success(etat.message ?? 'Enregistré.');
    }
  }, [etat]);

  const champs = etat.erreursChamps;
  const soumis = etat.valeurs;
  const valeur = (cle: string, defaut: string | number | null | undefined) =>
    soumis?.[cle] ?? (defaut === null || defaut === undefined ? '' : String(defaut));

  return (
    <Dialog open={ouvert} onOpenChange={setOuvert}>
      <DialogTrigger asChild>{declencheur}</DialogTrigger>

      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {publication ? 'Modifier la publication' : 'Nouvelle publication'}
          </DialogTitle>
          <DialogDescription>
            La périodicité et le délai déterminent les dates du calendrier. Les
            indicateurs rattachés en hériteront automatiquement.
          </DialogDescription>
        </DialogHeader>

        {etat.erreur && (
          <Alert variant="destructive">
            <CircleAlert aria-hidden />
            <AlertDescription>{etat.erreur}</AlertDescription>
          </Alert>
        )}

        <form key={publication?.id ?? 'creation'} action={action} className="space-y-4">
          {publication && <input type="hidden" name="id" value={publication.id} />}

          <div className="space-y-2">
            <Label htmlFor="nom">Nom de la publication</Label>
            <Input
              id="nom"
              name="nom"
              defaultValue={valeur('nom', publication?.nom)}
              required
              aria-invalid={Boolean(champs?.nom)}
            />
            {champs?.nom && (
              <p className="text-sm text-destructive">{champs.nom[0]}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="structureId">Structure</Label>
              <Select
                name="structureId"
                defaultValue={valeur('structureId', publication?.structureId) || undefined}
              >
                <SelectTrigger id="structureId" className="w-full">
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
              <Label htmlFor="domaineId">Domaine statistique</Label>
              <Select
                name="domaineId"
                defaultValue={valeur('domaineId', publication?.domaineId) || undefined}
              >
                <SelectTrigger id="domaineId" className="w-full">
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
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="periodicite">Périodicité</Label>
              <Select
                name="periodicite"
                value={periodicite}
                onValueChange={setPeriodicite}
              >
                <SelectTrigger id="periodicite" className="w-full">
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

            {periodicite === 'PLURIANNUELLE' && (
              <div className="space-y-2">
                <Label htmlFor="nombreAnneesPeriodicite">Tous les combien ?</Label>
                <Input
                  id="nombreAnneesPeriodicite"
                  name="nombreAnneesPeriodicite"
                  type="number"
                  min={2}
                  max={50}
                  placeholder="5"
                  defaultValue={valeur(
                    'nombreAnneesPeriodicite',
                    publication?.nombreAnneesPeriodicite,
                  )}
                  aria-invalid={Boolean(champs?.nombreAnneesPeriodicite)}
                />
                <p className="text-xs text-muted-foreground">
                  En années. Exemple : 5 pour un recensement quinquennal.
                </p>
                {champs?.nombreAnneesPeriodicite && (
                  <p className="text-sm text-destructive">
                    {champs.nombreAnneesPeriodicite[0]}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="delaiJours">Délai de mise à disposition</Label>
              <Input
                id="delaiJours"
                name="delaiJours"
                type="number"
                min={0}
                defaultValue={valeur('delaiJours', publication?.delaiJours ?? 10)}
                required
                aria-invalid={Boolean(champs?.delaiJours)}
              />
              <p className="text-xs text-muted-foreground">
                Nombre de jours après la fin de la période couverte.
              </p>
              {champs?.delaiJours && (
                <p className="text-sm text-destructive">{champs.delaiJours[0]}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="delaiType">Type de délai</Label>
              <Select
                name="delaiType"
                defaultValue={valeur('delaiType', publication?.delaiType ?? 'CALENDAIRES')}
              >
                <SelectTrigger id="delaiType" className="w-full">
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

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label htmlFor="reportSiWeekendOuFerie">
                Reporter au jour ouvré suivant
              </Label>
              <p className="text-xs text-muted-foreground">
                Si la date calculée tombe un samedi, un dimanche ou un jour férié.
              </p>
            </div>
            <Switch
              id="reportSiWeekendOuFerie"
              name="reportSiWeekendOuFerie"
              defaultChecked={publication?.reportSiWeekendOuFerie ?? false}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (facultatif)</Label>
            <Textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={valeur('description', publication?.description)}
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
