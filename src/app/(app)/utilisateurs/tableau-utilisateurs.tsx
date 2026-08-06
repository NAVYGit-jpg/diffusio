'use client';

import { CircleAlert, LoaderCircle, MailPlus, Pencil, Plus, Users } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  basculerActivationUtilisateurAction,
  enregistrerUtilisateurAction,
  renvoyerInvitationAction,
  type EtatUtilisateur,
} from '@/lib/actions/utilisateurs';
import { LIBELLE_ROLE, ROLES } from '@/lib/utilisateurs/schemas';

type Structure = {
  id: string;
  nom: string;
  sigle: string;
  profondeur: number;
};

type Utilisateur = {
  id: string;
  nom: string;
  prenoms: string;
  email: string;
  telephone: string | null;
  fonction: string | null;
  role: string;
  structureId: string | null;
  emailSuperieur: string | null;
  estTitulaire: boolean;
  actif: boolean;
  derniereConnexion: string | null;
  enAttenteActivation: boolean;
  structure: { nom: string; sigle: string } | null;
  structuresAdmin: string[];
};

const ETAT_INITIAL: EtatUtilisateur = {};

export function TableauUtilisateurs({
  utilisateurs,
  structures,
  quotaSuperAdmin,
}: {
  utilisateurs: Utilisateur[];
  structures: Structure[];
  quotaSuperAdmin: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [enEdition, setEnEdition] = useState<Utilisateur | null>(null);
  const [role, setRole] = useState<string>('POINT_FOCAL');
  const [etat, action, enCours] = useActionState(
    enregistrerUtilisateurAction,
    ETAT_INITIAL,
  );
  const [enCoursAction, demarrer] = useTransition();

  useEffect(() => {
    if (etat.succes) {
      setOuvert(false);
      setEnEdition(null);
      toast.success(etat.message ?? 'Enregistré.');
    }
  }, [etat]);

  const ouvrirCreation = () => {
    setEnEdition(null);
    setRole('POINT_FOCAL');
    setOuvert(true);
  };

  const ouvrirEdition = (utilisateur: Utilisateur) => {
    setEnEdition(utilisateur);
    setRole(utilisateur.role);
    setOuvert(true);
  };

  const executer = (
    operation: () => Promise<EtatUtilisateur>,
    confirmation?: string,
  ) => {
    if (confirmation && !window.confirm(confirmation)) {
      return;
    }

    demarrer(async () => {
      const resultat = await operation();

      if (resultat.erreur) {
        toast.error(resultat.erreur);
      } else {
        toast.success(resultat.message ?? 'Terminé.');
      }
    });
  };

  const champs = etat.erreursChamps;
  const estPointFocal = role === 'POINT_FOCAL';
  const estAdmin = role === 'ADMIN';

  /**
   * Value to preload in a field.
   *
   * React 19 resets an uncontrolled form once its action resolves, so after a
   * validation error the fields would come back empty. The action echoes what
   * was submitted, and the reset then restores exactly that.
   */
  const soumis = etat.valeurs;
  const valeurTexte = (
    cle: string,
    depuisEdition: string | null | undefined,
  ): string => {
    const echo = soumis?.[cle];
    if (typeof echo === 'string') {
      return echo;
    }
    return depuisEdition ?? '';
  };
  const structuresCochees =
    (soumis?.structuresAdmin as string[] | undefined) ??
    enEdition?.structuresAdmin ??
    [];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Super administrateurs : <strong>{quotaSuperAdmin}</strong>
        </p>
        <Button onClick={ouvrirCreation} disabled={structures.length === 0}>
          <Plus aria-hidden />
          Nouvel utilisateur
        </Button>
      </div>

      {structures.length === 0 && (
        <Alert className="mb-4">
          <CircleAlert aria-hidden />
          <AlertDescription>
            Créez d&apos;abord au moins une structure : un point focal doit y être
            rattaché et un administrateur doit en superviser au moins une.
          </AlertDescription>
        </Alert>
      )}

      {utilisateurs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Users className="mx-auto size-8 text-muted-foreground" aria-hidden />
          <h2 className="mt-4 font-medium">Aucun utilisateur enregistré</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Créez les points focaux qui alimenteront le catalogue, puis les
            administrateurs qui valideront leurs calendriers.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Adresse e-mail</TableHead>
                <TableHead>Profil</TableHead>
                <TableHead>Périmètre</TableHead>
                <TableHead>État</TableHead>
                <TableHead className="w-56 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {utilisateurs.map((utilisateur) => (
                <TableRow
                  key={utilisateur.id}
                  className={utilisateur.actif ? '' : 'opacity-55'}
                >
                  <TableCell>
                    <span className="font-medium">
                      {utilisateur.prenoms} {utilisateur.nom}
                    </span>
                    {utilisateur.estTitulaire && (
                      <Badge variant="outline" className="ml-2">
                        Titulaire
                      </Badge>
                    )}
                    {utilisateur.fonction && (
                      <p className="text-xs text-muted-foreground">
                        {utilisateur.fonction}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{utilisateur.email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {LIBELLE_ROLE[utilisateur.role as keyof typeof LIBELLE_ROLE]}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {utilisateur.role === 'SUPER_ADMIN'
                      ? 'Toutes les structures'
                      : utilisateur.role === 'ADMIN'
                        ? `${utilisateur.structuresAdmin.length} structure(s)`
                        : (utilisateur.structure?.sigle ?? '—')}
                  </TableCell>
                  <TableCell>
                    {!utilisateur.actif ? (
                      <Badge variant="secondary">Désactivé</Badge>
                    ) : utilisateur.enAttenteActivation ? (
                      <Badge variant="outline">Invitation en attente</Badge>
                    ) : utilisateur.derniereConnexion ? (
                      <span className="text-xs text-muted-foreground">
                        Connecté le{' '}
                        {new Date(utilisateur.derniereConnexion).toLocaleDateString(
                          'fr-FR',
                        )}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Jamais connecté
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => ouvrirEdition(utilisateur)}
                      aria-label={`Modifier ${utilisateur.prenoms} ${utilisateur.nom}`}
                    >
                      <Pencil aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={enCoursAction}
                      onClick={() =>
                        executer(() => renvoyerInvitationAction(utilisateur.id))
                      }
                      aria-label={`Renvoyer une invitation à ${utilisateur.email}`}
                    >
                      <MailPlus aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={enCoursAction}
                      onClick={() =>
                        executer(
                          () => basculerActivationUtilisateurAction(utilisateur.id),
                          utilisateur.actif
                            ? `Désactiver le compte de ${utilisateur.prenoms} ${utilisateur.nom} ?\n\nIl ne pourra plus se connecter, mais ses données restent conservées.`
                            : undefined,
                        )
                      }
                    >
                      {utilisateur.actif ? 'Désactiver' : 'Réactiver'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={ouvert} onOpenChange={setOuvert}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {enEdition ? 'Modifier le compte' : 'Nouvel utilisateur'}
            </DialogTitle>
            <DialogDescription>
              {enEdition
                ? 'Les modifications sont tracées dans le journal d’audit.'
                : "Un e-mail d'invitation sera envoyé pour que la personne choisisse son mot de passe. Aucun mot de passe ne circule par e-mail."}
            </DialogDescription>
          </DialogHeader>

          {etat.erreur && (
            <Alert variant="destructive">
              <CircleAlert aria-hidden />
              <AlertDescription>{etat.erreur}</AlertDescription>
            </Alert>
          )}

          <form key={enEdition?.id ?? 'creation'} action={action} className="space-y-4">
            {enEdition && <input type="hidden" name="id" value={enEdition.id} />}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="prenoms">Prénoms</Label>
                <Input
                  id="prenoms"
                  name="prenoms"
                  defaultValue={valeurTexte('prenoms', enEdition?.prenoms)}
                  required
                  aria-invalid={Boolean(champs?.prenoms)}
                />
                {champs?.prenoms && (
                  <p className="text-sm text-destructive">{champs.prenoms[0]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="nom">Nom</Label>
                <Input
                  id="nom"
                  name="nom"
                  defaultValue={valeurTexte('nom', enEdition?.nom)}
                  required
                  aria-invalid={Boolean(champs?.nom)}
                />
                {champs?.nom && (
                  <p className="text-sm text-destructive">{champs.nom[0]}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Adresse e-mail</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={valeurTexte('email', enEdition?.email)}
                required
                aria-invalid={Boolean(champs?.email)}
              />
              {champs?.email && (
                <p className="text-sm text-destructive">{champs.email[0]}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="telephone">Téléphone (facultatif)</Label>
                <Input
                  id="telephone"
                  name="telephone"
                  defaultValue={valeurTexte('telephone', enEdition?.telephone)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fonction">Fonction (facultatif)</Label>
                <Input
                  id="fonction"
                  name="fonction"
                  defaultValue={valeurTexte('fonction', enEdition?.fonction)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Profil</Label>
              <Select name="role" value={role} onValueChange={setRole}>
                <SelectTrigger id="role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((valeur) => (
                    <SelectItem key={valeur} value={valeur}>
                      {LIBELLE_ROLE[valeur]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {estPointFocal && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="structureId">Structure de rattachement</Label>
                  <Select
                    name="structureId"
                    defaultValue={valeurTexte('structureId', enEdition?.structureId) || 'aucune'}
                  >
                    <SelectTrigger id="structureId" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aucune">— À sélectionner —</SelectItem>
                      {structures.map((structure) => (
                        <SelectItem key={structure.id} value={structure.id}>
                          {' '.repeat(structure.profondeur * 2)}
                          {structure.nom} ({structure.sigle})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {champs?.structureId && (
                    <p className="text-sm text-destructive">
                      {champs.structureId[0]}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emailSuperieur">
                    Adresse e-mail du supérieur
                  </Label>
                  <Input
                    id="emailSuperieur"
                    name="emailSuperieur"
                    type="email"
                    defaultValue={valeurTexte('emailSuperieur', enEdition?.emailSuperieur)}
                    aria-invalid={Boolean(champs?.emailSuperieur)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Si la personne est son propre supérieur, indiquez sa propre
                    adresse.
                  </p>
                  {champs?.emailSuperieur && (
                    <p className="text-sm text-destructive">
                      {champs.emailSuperieur[0]}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <Label htmlFor="estTitulaire">Point focal titulaire</Label>
                    <p className="text-xs text-muted-foreground">
                      Le titulaire reçoit les rappels et les relances. Les
                      suppléants peuvent saisir et téléverser.
                    </p>
                  </div>
                  <Switch
                    id="estTitulaire"
                    name="estTitulaire"
                    defaultChecked={soumis ? soumis.estTitulaire === 'on' : (enEdition?.estTitulaire ?? false)}
                  />
                </div>
              </>
            )}

            {estAdmin && (
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">
                  Structures supervisées
                </legend>
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-3">
                  {structures.map((structure) => (
                    <label
                      key={structure.id}
                      className="flex items-center gap-2 text-sm"
                      style={{ paddingLeft: `${structure.profondeur * 1}rem` }}
                    >
                      <input
                        type="checkbox"
                        name="structuresAdmin"
                        value={structure.id}
                        defaultChecked={structuresCochees.includes(structure.id)}
                        className="size-4"
                      />
                      {structure.nom}{' '}
                      <span className="text-xs text-muted-foreground">
                        {structure.sigle}
                      </span>
                    </label>
                  ))}
                </div>
                {champs?.structuresAdmin && (
                  <p className="text-sm text-destructive">
                    {champs.structuresAdmin[0]}
                  </p>
                )}
              </fieldset>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOuvert(false)}
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
    </>
  );
}
