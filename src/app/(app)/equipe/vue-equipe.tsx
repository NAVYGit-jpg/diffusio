'use client';

import {
  CircleAlert,
  Download,
  FileSpreadsheet,
  LoaderCircle,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  type EtatEquipe,
  type EtatImportEquipe,
  enregistrerMembreAction,
  importerEquipeAction,
  retirerMembreAction,
} from '@/lib/actions/equipe';

const ETAT: EtatEquipe = {};
const ETAT_IMPORT: EtatImportEquipe = {};

export type Membre = {
  id: string;
  nom: string;
  fonction: string;
  email: string;
  ajouteLe: string;
};

export function VueEquipe({
  portee,
  structures,
  peutTenirEquipeOrganisation,
  membres,
}: {
  portee: string;
  structures: { id: string; nom: string; sigle: string }[];
  peutTenirEquipeOrganisation: boolean;
  membres: Membre[];
}) {
  const router = useRouter();

  const [etat, action, enCours] = useActionState(enregistrerMembreAction, ETAT);
  const [etatRetrait, actionRetrait] = useActionState(retirerMembreAction, ETAT);
  const [etatImport, actionImport, importEnCours] = useActionState(
    importerEquipeAction,
    ETAT_IMPORT,
  );

  const [modaleMembre, setModaleMembre] = useState(false);
  const [membreEdite, setMembreEdite] = useState<Membre | null>(null);
  const [aRetirer, setARetirer] = useState<Membre | null>(null);

  useEffect(() => {
    if (etat.succes) {
      toast.success(etat.message ?? 'Enregistré.');
      setModaleMembre(false);
      setMembreEdite(null);
    }
    if (etat.erreur && !etat.erreursChamps) {
      toast.error(etat.erreur);
    }
  }, [etat]);

  useEffect(() => {
    if (etatRetrait.succes) {
      toast.success(etatRetrait.message ?? 'Membre retiré.');
      setARetirer(null);
    }
    if (etatRetrait.erreur) {
      toast.error(etatRetrait.erreur);
    }
  }, [etatRetrait]);

  useEffect(() => {
    if (etatImport.applique) {
      toast.success(
        etatImport.nombreCrees === 0
          ? 'Aucun nouveau membre à ajouter.'
          : `${etatImport.nombreCrees} membre(s) ajouté(s).`,
      );
    }
    if (etatImport.erreur) {
      toast.error(etatImport.erreur);
    }
  }, [etatImport]);

  const ouvrirAjout = () => {
    setMembreEdite(null);
    setModaleMembre(true);
  };

  const ouvrirEdition = (membre: Membre) => {
    setMembreEdite(membre);
    setModaleMembre(true);
  };

  const rapport = etatImport.rapport;
  const importPret =
    rapport !== undefined &&
    !etatImport.applique &&
    rapport.colonnesManquantes.length === 0 &&
    rapport.aCreer.length > 0;

  return (
    <>
      {/* ------------------------------------------------------- portée */}
      {(structures.length > 1 || peutTenirEquipeOrganisation) && (
        <div className="mb-6 w-full max-w-md space-y-2">
          <Label htmlFor="choixPortee">Équipe affichée</Label>
          <Select
            value={portee}
            onValueChange={(valeur) => router.push(`/equipe?portee=${valeur}`)}
          >
            <SelectTrigger id="choixPortee" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {peutTenirEquipeOrganisation && (
                <SelectItem value="ORGANISATION">
                  Équipe de l’organisation (toutes structures)
                </SelectItem>
              )}
              {structures.map((structure) => (
                <SelectItem key={structure.id} value={structure.id}>
                  {structure.nom} ({structure.sigle})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {portee === 'ORGANISATION' && (
            <p className="text-xs text-muted-foreground">
              Ces membres sont prévenus de <strong>toutes</strong> les mises en
              ligne, quelle que soit la structure.
            </p>
          )}
        </div>
      )}

      {/* -------------------------------------------------------- import */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Charger depuis un fichier Excel</CardTitle>
          <CardDescription>
            Trois colonnes : Nom, Fonction, Adresse e-mail. Rien n&apos;est
            enregistré avant votre confirmation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button asChild variant="outline" size="sm">
            <a href="/api/modeles/equipe" download>
              <Download aria-hidden />
              Télécharger le modèle
            </a>
          </Button>

          <form action={actionImport} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="portee" value={portee} />
            <div className="min-w-56 flex-1 space-y-1.5">
              <Label htmlFor="fichierEquipe">Fichier Excel (.xlsx)</Label>
              <Input
                id="fichierEquipe"
                name="fichier"
                type="file"
                accept=".xlsx,.xlsm"
                required
              />
            </div>
            <Button type="submit" variant="secondary" disabled={importEnCours}>
              {importEnCours ? (
                <LoaderCircle className="animate-spin" aria-hidden />
              ) : (
                <FileSpreadsheet aria-hidden />
              )}
              Analyser
            </Button>
          </form>

          {rapport && !etatImport.applique && (
            <RapportImport
              rapport={rapport}
              portee={portee}
              action={actionImport}
              enCours={importEnCours}
              pret={importPret}
            />
          )}
        </CardContent>
      </Card>

      {/* -------------------------------------------------------- membres */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {membres.length === 0
            ? 'Aucun membre pour l’instant.'
            : `${membres.length} membre${membres.length > 1 ? 's' : ''}.`}
        </p>
        <Button size="sm" onClick={ouvrirAjout}>
          <UserPlus aria-hidden />
          Ajouter un membre
        </Button>
      </div>

      {membres.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Users className="mx-auto size-8 text-muted-foreground" aria-hidden />
          <h2 className="mt-4 font-medium">Personne à prévenir pour l’instant</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            Ajoutez les personnes qui doivent recevoir l’annonce dès qu’une
            publication est mise en ligne : hiérarchie, communication,
            partenaires. Elles n’ont pas besoin de compte.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Fonction</TableHead>
                <TableHead>Adresse e-mail</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {membres.map((membre) => (
                <TableRow key={membre.id}>
                  <TableCell className="font-medium">{membre.nom}</TableCell>
                  <TableCell className="text-sm">{membre.fonction}</TableCell>
                  <TableCell className="text-sm">{membre.email}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => ouvrirEdition(membre)}
                    >
                      Modifier
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setARetirer(membre)}
                      aria-label={`Retirer ${membre.nom}`}
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

      {/* --------------------------------------------------- modale membre */}
      <Dialog open={modaleMembre} onOpenChange={setModaleMembre}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {membreEdite ? 'Modifier le membre' : 'Ajouter un membre'}
            </DialogTitle>
            <DialogDescription>
              Cette personne recevra l’e-mail de mise en ligne. Elle n’aura pas
              accès à l’application.
            </DialogDescription>
          </DialogHeader>

          {etat.erreur && (
            <Alert variant="destructive">
              <CircleAlert aria-hidden />
              <AlertDescription>{etat.erreur}</AlertDescription>
            </Alert>
          )}

          <form action={action} className="space-y-4">
            <input type="hidden" name="portee" value={portee} />
            <input type="hidden" name="membreId" value={membreEdite?.id ?? ''} />

            <ChampTexte
              nom="nom"
              libelle="Nom et prénoms"
              defaut={etat.valeurs?.nom ?? membreEdite?.nom ?? ''}
              erreurs={etat.erreursChamps?.nom}
              placeholder="Awa Koné"
            />
            <ChampTexte
              nom="fonction"
              libelle="Fonction"
              defaut={etat.valeurs?.fonction ?? membreEdite?.fonction ?? ''}
              erreurs={etat.erreursChamps?.fonction}
              placeholder="Directrice de cabinet"
            />
            <ChampTexte
              nom="email"
              libelle="Adresse e-mail"
              type="email"
              defaut={etat.valeurs?.email ?? membreEdite?.email ?? ''}
              erreurs={etat.erreursChamps?.email}
              placeholder="awa.kone@exemple.ci"
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModaleMembre(false)}
              >
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

      {/* ------------------------------------------------- confirmation */}
      <Dialog open={aRetirer !== null} onOpenChange={() => setARetirer(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Retirer ce membre ?</DialogTitle>
            <DialogDescription>
              {aRetirer?.nom} ne recevra plus les annonces de mise en ligne. Les
              messages déjà envoyés ne sont pas affectés.
            </DialogDescription>
          </DialogHeader>

          <form action={actionRetrait}>
            <input type="hidden" name="portee" value={portee} />
            <input type="hidden" name="membreId" value={aRetirer?.id ?? ''} />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setARetirer(null)}
              >
                Annuler
              </Button>
              <Button type="submit" variant="destructive">
                Retirer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ChampTexte({
  nom,
  libelle,
  defaut,
  erreurs,
  type = 'text',
  placeholder,
}: {
  nom: string;
  libelle: string;
  defaut: string;
  erreurs?: string[];
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={nom}>{libelle}</Label>
      <Input
        id={nom}
        name={nom}
        type={type}
        defaultValue={defaut}
        placeholder={placeholder}
        aria-invalid={Boolean(erreurs)}
        required
      />
      {erreurs && <p className="text-sm text-destructive">{erreurs[0]}</p>}
    </div>
  );
}

/** What the file contains, before anything is written. */
function RapportImport({
  rapport,
  portee,
  action,
  enCours,
  pret,
}: {
  rapport: NonNullable<EtatImportEquipe['rapport']>;
  portee: string;
  action: (donnees: FormData) => void;
  enCours: boolean;
  pret: boolean;
}) {
  if (rapport.colonnesManquantes.length > 0) {
    return (
      <Alert variant="destructive">
        <CircleAlert aria-hidden />
        <AlertDescription>
          Colonnes introuvables : {rapport.colonnesManquantes.join(', ')}.
          Téléchargez le modèle et conservez la ligne d’en-tête.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <p className="text-sm">
        <strong>{rapport.aCreer.length}</strong> membre(s) à ajouter,{' '}
        <strong>{rapport.dejaPresents.length}</strong> déjà présent(s),{' '}
        <strong>{rapport.erreurs.length}</strong> ligne(s) en erreur.
      </p>

      {rapport.erreurs.length > 0 && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertDescription>
            <ul className="space-y-0.5">
              {rapport.erreurs.slice(0, 8).map((erreur, index) => (
                <li key={index}>
                  Ligne {erreur.ligne}
                  {erreur.colonne ? ` — ${erreur.colonne}` : ''} : {erreur.message}
                </li>
              ))}
              {rapport.erreurs.length > 8 && (
                <li>… et {rapport.erreurs.length - 8} autre(s).</li>
              )}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {rapport.aCreer.length > 0 && (
        <div className="max-h-48 overflow-y-auto rounded border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Fonction</TableHead>
                <TableHead>Adresse e-mail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rapport.aCreer.map((membre) => (
                <TableRow key={membre.ligne}>
                  <TableCell>{membre.nom}</TableCell>
                  <TableCell>{membre.fonction}</TableCell>
                  <TableCell>{membre.email}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {pret && (
        <form action={action}>
          <input type="hidden" name="portee" value={portee} />
          <input type="hidden" name="confirmer" value="1" />
          {/* The file is re-read on confirmation: keeping the parsed rows in a
              hidden field would let a crafted request write anything. */}
          <div className="space-y-1.5">
            <Label htmlFor="fichierConfirme">
              Rechargez le même fichier pour confirmer
            </Label>
            <Input
              id="fichierConfirme"
              name="fichier"
              type="file"
              accept=".xlsx,.xlsm"
              required
            />
          </div>
          <Button type="submit" className="mt-2" disabled={enCours}>
            {enCours && <LoaderCircle className="animate-spin" aria-hidden />}
            Confirmer l’ajout de {rapport.aCreer.length} membre(s)
          </Button>
        </form>
      )}
    </div>
  );
}
