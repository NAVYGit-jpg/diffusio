'use client';

import type { Role } from '@prisma/client';
import { CircleAlert, Info, LoaderCircle } from 'lucide-react';
import { useActionState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  changerMotDePasseAction,
  enregistrerCoordonneesAction,
  type EtatProfil,
} from '@/lib/actions/profil';

type Utilisateur = {
  nom: string;
  prenoms: string;
  email: string;
  telephone: string | null;
  fonction: string | null;
  emailSuperieur: string | null;
  role: Role;
  structure: string | null;
  derniereConnexion: string | null;
};

const ETAT_INITIAL: EtatProfil = {};

const LIBELLE_ROLE: Record<Role, string> = {
  SUPER_ADMIN: 'Super administrateur',
  ADMIN: 'Administrateur',
  POINT_FOCAL: 'Point focal',
};

function MessageErreur({ erreurs }: { erreurs?: string[] }) {
  if (!erreurs?.length) {
    return null;
  }

  return <p className="text-sm text-destructive">{erreurs[0]}</p>;
}

export function FormulairesProfil({ utilisateur }: { utilisateur: Utilisateur }) {
  const [etatCoordonnees, actionCoordonnees, coordonneesEnCours] = useActionState(
    enregistrerCoordonneesAction,
    ETAT_INITIAL,
  );
  const [etatMotDePasse, actionMotDePasse, motDePasseEnCours] = useActionState(
    changerMotDePasseAction,
    ETAT_INITIAL,
  );

  useEffect(() => {
    if (etatCoordonnees.succes) {
      toast.success(etatCoordonnees.message ?? 'Enregistré.');
    }
  }, [etatCoordonnees]);

  useEffect(() => {
    if (etatMotDePasse.succes) {
      toast.success(etatMotDePasse.message ?? 'Mot de passe modifié.');
    }
  }, [etatMotDePasse]);

  const estPointFocal = utilisateur.role === 'POINT_FOCAL';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Coordonnées</CardTitle>
          <CardDescription>
            {LIBELLE_ROLE[utilisateur.role]}
            {utilisateur.structure && ` · ${utilisateur.structure}`}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Alert className="mb-4">
            <Info aria-hidden />
            <AlertDescription>
              Votre adresse de connexion est <strong>{utilisateur.email}</strong>.
              Seul un administrateur peut la modifier — elle sert à vous
              identifier, et la changer vous-même pourrait vous priver d&apos;accès.
            </AlertDescription>
          </Alert>

          <form action={actionCoordonnees} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="prenoms">Prénoms</Label>
                <Input
                  id="prenoms"
                  name="prenoms"
                  defaultValue={utilisateur.prenoms}
                  required
                />
                <MessageErreur erreurs={etatCoordonnees.erreursChamps?.prenoms} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nom">Nom</Label>
                <Input
                  id="nom"
                  name="nom"
                  defaultValue={utilisateur.nom}
                  required
                />
                <MessageErreur erreurs={etatCoordonnees.erreursChamps?.nom} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="telephone">Téléphone</Label>
                <Input
                  id="telephone"
                  name="telephone"
                  defaultValue={utilisateur.telephone ?? ''}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fonction">Fonction</Label>
                <Input
                  id="fonction"
                  name="fonction"
                  defaultValue={utilisateur.fonction ?? ''}
                />
              </div>
            </div>

            {estPointFocal && (
              <div className="space-y-2">
                <Label htmlFor="emailSuperieur">
                  Adresse e-mail de votre supérieur
                </Label>
                <Input
                  id="emailSuperieur"
                  name="emailSuperieur"
                  type="email"
                  defaultValue={utilisateur.emailSuperieur ?? ''}
                />
                <p className="text-xs text-muted-foreground">
                  Elle est mise en copie des alertes envoyées par vos
                  administrateurs. Si vous êtes votre propre supérieur, indiquez
                  votre propre adresse.
                </p>
                <MessageErreur
                  erreurs={etatCoordonnees.erreursChamps?.emailSuperieur}
                />
              </div>
            )}

            <Button type="submit" disabled={coordonneesEnCours}>
              {coordonneesEnCours && (
                <LoaderCircle className="animate-spin" aria-hidden />
              )}
              Enregistrer
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mot de passe</CardTitle>
          <CardDescription>
            Au moins 12 caractères, dont une minuscule, une majuscule et un
            chiffre.
          </CardDescription>
        </CardHeader>

        <CardContent>
          {etatMotDePasse.erreur && (
            <Alert variant="destructive" className="mb-4">
              <CircleAlert aria-hidden />
              <AlertDescription>{etatMotDePasse.erreur}</AlertDescription>
            </Alert>
          )}

          <form action={actionMotDePasse} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="motDePasseActuel">Mot de passe actuel</Label>
              <Input
                id="motDePasseActuel"
                name="motDePasseActuel"
                type="password"
                autoComplete="current-password"
                required
              />
              <MessageErreur
                erreurs={etatMotDePasse.erreursChamps?.motDePasseActuel}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nouveauMotDePasse">Nouveau mot de passe</Label>
                <Input
                  id="nouveauMotDePasse"
                  name="nouveauMotDePasse"
                  type="password"
                  autoComplete="new-password"
                  required
                />
                <MessageErreur
                  erreurs={etatMotDePasse.erreursChamps?.nouveauMotDePasse}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmation">Confirmer</Label>
                <Input
                  id="confirmation"
                  name="confirmation"
                  type="password"
                  autoComplete="new-password"
                  required
                />
                <MessageErreur
                  erreurs={etatMotDePasse.erreursChamps?.confirmation}
                />
              </div>
            </div>

            <Button type="submit" disabled={motDePasseEnCours}>
              {motDePasseEnCours && (
                <LoaderCircle className="animate-spin" aria-hidden />
              )}
              Changer le mot de passe
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
