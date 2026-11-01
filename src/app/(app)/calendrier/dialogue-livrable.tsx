'use client';

import type { Role } from '@prisma/client';
import {
  CircleAlert,
  CircleCheck,
  Download,
  FileText,
  FolderUp,
  Gauge,
  Globe,
  LoaderCircle,
  Save,
} from 'lucide-react';
import { useActionState, useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formaterJJMMAAAA } from '@/lib/calendrier/dates';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { DepotFichier } from './depot-fichier';
import {
  type EtatLivrable,
  enregistrerLivrableAction,
  obtenirLienFichierAction,
} from '@/lib/actions/livrables';
import {
  type EtatMiseEnLigne,
  listeDiffusionExistanteAction,
  mettreEnLigneAction,
} from '@/lib/actions/mise-en-ligne';

export type FichierLigne = {
  id: string;
  type: string;
  nomOriginal: string;
  version: number;
  tailleOctets: number;
  televerseAt: string;
};

export type ValeurLigne = {
  indicateurId: string;
  valeur: string | null;
  valeurTexte: string | null;
  commentaire: string | null;
  nonDisponible: boolean;
};

export type IndicateurLigne = {
  id: string;
  nom: string;
  unite: string | null;
};

export type DetailLigne = {
  id: string;
  nomElement: string;
  elementType: string;
  libellePeriode: string;
  statut: string;
  dateDiffusionPrevue: string;
  lienPublication: string | null;
  fichiers: FichierLigne[];
  valeurs: ValeurLigne[];
  indicateursASaisir: IndicateurLigne[];
};

const ETAT_LIVRABLE: EtatLivrable = {};
const ETAT_MISE_EN_LIGNE: EtatMiseEnLigne = {};

function formaterTaille(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
  return `${(octets / 1024 / 1024).toFixed(1)} Mo`;
}

export function DialogueLivrable({
  ligne,
  role,
  ouvert,
  onOuvertChange,
}: {
  ligne: DetailLigne;
  role: Role;
  ouvert: boolean;
  onOuvertChange: (ouvert: boolean) => void;
}) {
  // One action for the whole screen: files and values are saved together.
  const [etatLivrable, actionLivrable, enregistrementEnCours] = useActionState(
    enregistrerLivrableAction,
    ETAT_LIVRABLE,
  );
  const [etatMiseEnLigne, actionMiseEnLigne, miseEnLigneEnCours] = useActionState(
    mettreEnLigneAction,
    ETAT_MISE_EN_LIGNE,
  );
  const [telechargementEnCours, demarrerTelechargement] = useTransition();
  const [modaleMiseEnLigne, setModaleMiseEnLigne] = useState(false);
  const [emails, setEmails] = useState('');

  const estAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
  const dejaEnLigne = ligne.statut === 'MIS_EN_LIGNE';

  const aUnPdf = ligne.fichiers.some((fichier) => fichier.type === 'PDF');
  const aUnExcel = ligne.fichiers.some((fichier) => fichier.type === 'EXCEL');

  useEffect(() => {
    if (etatLivrable.succes) {
      toast.success(etatLivrable.message ?? 'Modifications enregistrées.');
    }
    if (etatLivrable.erreur) {
      toast.error(etatLivrable.erreur);
    }
  }, [etatLivrable]);

  useEffect(() => {
    if (etatMiseEnLigne.succes) {
      toast.success(etatMiseEnLigne.message ?? 'Mise en ligne confirmée.');
      setModaleMiseEnLigne(false);
      onOuvertChange(false);
    }
  }, [etatMiseEnLigne, onOuvertChange]);

  // §7 — the list saved for a previous period comes back pre-filled.
  const ouvrirMiseEnLigne = () => {
    setModaleMiseEnLigne(true);

    demarrerTelechargement(async () => {
      const resultat = await listeDiffusionExistanteAction(ligne.id);
      if (resultat.emails.length > 0) {
        setEmails(resultat.emails.join('\n'));
      }
    });
  };

  const telecharger = (fichierId: string) => {
    demarrerTelechargement(async () => {
      const resultat = await obtenirLienFichierAction(fichierId);

      if (resultat.erreur || !resultat.url) {
        toast.error(resultat.erreur ?? 'Lien indisponible.');
        return;
      }

      window.open(resultat.url, '_blank', 'noopener');
    });
  };

  const valeurDe = (indicateurId: string) => {
    const existante = ligne.valeurs.find(
      (valeur) => valeur.indicateurId === indicateurId,
    );

    return {
      valeur: existante?.valeur ?? existante?.valeurTexte ?? '',
      commentaire: existante?.commentaire ?? '',
      nonDisponible: existante?.nonDisponible ?? false,
    };
  };

  return (
    <>
      <Dialog open={ouvert} onOpenChange={onOuvertChange}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{ligne.nomElement}</DialogTitle>
            <DialogDescription>
              {ligne.libellePeriode} · diffusion prévue le{' '}
              {formaterJJMMAAAA(new Date(ligne.dateDiffusionPrevue))}
            </DialogDescription>
          </DialogHeader>

          {dejaEnLigne && (
            <Alert>
              <CircleCheck aria-hidden />
              <AlertDescription>
                Cette publication est en ligne
                {ligne.lienPublication && (
                  <>
                    {' — '}
                    <a
                      href={ligne.lienPublication}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-4"
                    >
                      la consulter
                    </a>
                  </>
                )}
                . Son contenu ne peut plus être remplacé.
              </AlertDescription>
            </Alert>
          )}

          {/* Un seul formulaire pour tout l'écran : fichiers et valeurs
              partent ensemble, avec un unique bouton d'enregistrement. */}
          <form action={actionLivrable} className="space-y-4">
            <input type="hidden" name="ligneId" value={ligne.id} />

            {etatLivrable.messagesCompletude &&
              etatLivrable.messagesCompletude.length > 0 && (
                <Alert variant="destructive">
                  <CircleAlert aria-hidden />
                  <AlertDescription>
                    <p className="mb-1">
                      Enregistré, mais il manque encore ceci pour que la ligne
                      passe au statut « Livré » :
                    </p>
                    <ul className="space-y-0.5">
                      {etatLivrable.messagesCompletude.map((message) => (
                        <li key={message}>· {message}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

            {/* -------------------------------------------------- fichiers */}
            <section className="space-y-3">
              <EnTeteSection
                Icone={FolderUp}
                titre="Fichiers"
                teinte="bg-sky-500/12 text-sky-700 dark:text-sky-400"
              />

              {ligne.fichiers.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun fichier déposé.
                  {ligne.elementType === 'PUBLICATION' &&
                    ' Le PDF de la publication est obligatoire.'}
                </p>
              ) : (
                <ul className="space-y-1">
                  {ligne.fichiers.map((fichier) => (
                    <li
                      key={fichier.id}
                      className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <FileText
                          className="size-4 shrink-0 text-muted-foreground"
                          aria-hidden
                        />
                        <span className="truncate">{fichier.nomOriginal}</span>
                        <Badge variant="outline">v{fichier.version}</Badge>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formaterTaille(fichier.tailleOctets)}
                        </span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={telechargementEnCours}
                        onClick={() => telecharger(fichier.id)}
                        aria-label={`Télécharger ${fichier.nomOriginal}`}
                      >
                        <Download aria-hidden />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}

              {!dejaEnLigne && (
                // Two named slots rather than one generic picker: a publication
                // travels with its PDF and, most of the time, the spreadsheet of
                // its figures. A single "add a file" field never says that.
                <div className="space-y-3">
                  <DepotFichier
                    identifiant={`pdf-${ligne.id}`}
                    champ="fichierPdf"
                    intitule="Fichier PDF de la publication"
                    precision={
                      ligne.elementType === 'PUBLICATION'
                        ? 'Obligatoire — 20 Mo maximum'
                        : 'Facultatif — 20 Mo maximum'
                    }
                    accept=".pdf"
                    depose={aUnPdf}
                    genre="pdf"
                  />

                  <DepotFichier
                    identifiant={`excel-${ligne.id}`}
                    champ="fichierExcel"
                    intitule="Fichier Excel des données"
                    precision="Facultatif — .xlsx, .xls ou .csv, 20 Mo maximum"
                    accept=".xlsx,.xls,.csv"
                    depose={aUnExcel}
                    genre="tableur"
                  />
                </div>
              )}
            </section>

            {/* --------------------------------------------------- valeurs */}
            {ligne.indicateursASaisir.length > 0 && (
              <>
                <Separator />

                <section className="space-y-3">
                  <EnTeteSection
                    Icone={Gauge}
                    titre={
                      ligne.elementType === 'PUBLICATION'
                        ? 'Valeurs des indicateurs rattachés'
                        : 'Valeur de l’indicateur'
                    }
                    teinte="bg-violet-500/12 text-violet-700 dark:text-violet-400"
                    compteur={ligne.indicateursASaisir.length}
                  />

                  {ligne.indicateursASaisir.map((indicateur) => {
                    const existante = valeurDe(indicateur.id);

                    return (
                      <CarteIndicateur
                        key={indicateur.id}
                        indicateur={indicateur}
                        existante={existante}
                        verrouille={dejaEnLigne}
                      />
                    );
                  })}

                </section>
              </>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOuvertChange(false)}
              >
                Fermer
              </Button>

              {estAdmin && !dejaEnLigne && ligne.statut === 'TELEVERSE' && (
                <Button type="button" onClick={ouvrirMiseEnLigne}>
                  <Globe aria-hidden />
                  Publier
                </Button>
              )}

              {/* L'unique bouton d'enregistrement de l'écran : il envoie les
                  fichiers choisis et les valeurs saisies en une seule fois. */}
              {!dejaEnLigne && (
                <Button type="submit" disabled={enregistrementEnCours}>
                  {enregistrementEnCours ? (
                    <LoaderCircle className="animate-spin" aria-hidden />
                  ) : (
                    <Save aria-hidden />
                  )}
                  Enregistrer
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------- mise en ligne */}
      <Dialog open={modaleMiseEnLigne} onOpenChange={setModaleMiseEnLigne}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirmer la publication</DialogTitle>
            <DialogDescription>
              Un message sera envoyé au point focal, avec les adresses ci-dessous
              en copie. La liste sera mémorisée pour les périodes suivantes.
            </DialogDescription>
          </DialogHeader>

          {etatMiseEnLigne.erreur && (
            <Alert variant="destructive">
              <CircleAlert aria-hidden />
              <AlertDescription>{etatMiseEnLigne.erreur}</AlertDescription>
            </Alert>
          )}

          <form action={actionMiseEnLigne} className="space-y-4">
            <input type="hidden" name="ligneId" value={ligne.id} />

            <div className="space-y-2">
              <Label htmlFor="lienPublication">Lien vers la publication</Label>
              <Input
                id="lienPublication"
                name="lien"
                type="url"
                placeholder="https://…"
                required
              />
              <p className="text-xs text-muted-foreground">
                Un QR code sera généré à partir de ce lien et joint au message.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailsDiffusion">Destinataires en copie</Label>
              <Textarea
                id="emailsDiffusion"
                name="emails"
                rows={5}
                value={emails}
                onChange={(evenement) => setEmails(evenement.target.value)}
                placeholder="Une adresse par ligne, ou séparées par des virgules"
              />
              <p className="text-xs text-muted-foreground">
                Vous pouvez coller une liste entière : virgules, points-virgules,
                espaces et retours à la ligne sont acceptés.
              </p>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModaleMiseEnLigne(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={miseEnLigneEnCours}>
                {miseEnLigneEnCours && (
                  <LoaderCircle className="animate-spin" aria-hidden />
                )}
                Notifier
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Section title with a tinted icon chip: the dialog reads as distinct blocks. */
function EnTeteSection({
  Icone,
  titre,
  teinte,
  compteur,
}: {
  Icone: typeof FolderUp;
  titre: string;
  teinte: string;
  compteur?: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn('flex size-9 items-center justify-center rounded-xl shadow-[var(--elevation-1)]', teinte)}>
        <Icone className="size-[18px]" aria-hidden />
      </span>
      <h3 className="text-[15px] font-semibold tracking-tight">{titre}</h3>
      {compteur !== undefined && (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {compteur}
        </span>
      )}
    </div>
  );
}

/**
 * One indicator to fill in. Marking the figure unavailable turns the card
 * amber and moves the eye to the comment, which then becomes mandatory.
 */
function CarteIndicateur({
  indicateur,
  existante,
  verrouille,
}: {
  indicateur: IndicateurLigne;
  existante: { valeur: string; commentaire: string; nonDisponible: boolean };
  verrouille: boolean;
}) {
  const [indisponible, setIndisponible] = useState(existante.nonDisponible);

  return (
    <div
      className={cn(
        'relative space-y-3 overflow-hidden rounded-2xl border bg-card p-4 pl-5 shadow-[var(--elevation-2)] transition-colors',
        indisponible && 'border-amber-300/70 bg-amber-50/60 dark:bg-amber-500/5',
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-1"
        style={{
          backgroundImage: indisponible
            ? 'linear-gradient(180deg, #f59e0b, #d97706)'
            : 'var(--gradient-primaire)',
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label htmlFor={`valeur_${indicateur.id}`} className="text-sm font-semibold">
          {indicateur.nom}
        </Label>
        {indicateur.unite && (
          <span className="rounded-full bg-[var(--couleur-primaire-douce)] px-2.5 py-0.5 text-xs font-medium text-[var(--couleur-primaire-lisible)]">
            {indicateur.unite}
          </span>
        )}
      </div>

      <Input
        id={`valeur_${indicateur.id}`}
        name={`valeur_${indicateur.id}`}
        defaultValue={existante.valeur}
        disabled={verrouille}
        placeholder={indisponible ? 'Non disponible' : 'Saisissez la valeur'}
        className={cn('text-base font-medium tabular-nums', indisponible && 'opacity-50')}
      />

      <div className="flex items-center gap-2.5 rounded-xl bg-muted/50 px-3 py-2">
        <Switch
          id={`indisponible_${indicateur.id}`}
          name={`indisponible_${indicateur.id}`}
          defaultChecked={existante.nonDisponible}
          onCheckedChange={setIndisponible}
          disabled={verrouille}
        />
        <Label htmlFor={`indisponible_${indicateur.id}`} className="text-sm font-normal">
          Donnée non disponible
        </Label>
      </div>

      <Textarea
        name={`commentaire_${indicateur.id}`}
        rows={2}
        defaultValue={existante.commentaire}
        disabled={verrouille}
        placeholder={
          indisponible
            ? 'Expliquez pourquoi la donnée n’est pas disponible (obligatoire)'
            : 'Commentaire (facultatif)'
        }
        className={cn('rounded-xl', indisponible && 'border-amber-400 ring-2 ring-amber-400/20')}
      />
    </div>
  );
}
