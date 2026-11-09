'use client';

import { CircleAlert, Info, LoaderCircle } from 'lucide-react';
import { useActionState } from 'react';

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
import { premiereConnexionAction, type EtatFormulaire } from '@/lib/actions/auth';

const ETAT_INITIAL: EtatFormulaire = {};

/** Renders the first error of a field, if any. */
function MessageErreur({ id, erreurs }: { id: string; erreurs?: string[] }) {
  if (!erreurs?.length) {
    return null;
  }

  return (
    <p id={id} className="text-sm text-destructive">
      {erreurs[0]}
    </p>
  );
}

export function FormulairePremiereConnexion({
  emailActuel,
}: {
  emailActuel: string;
}) {
  const [etat, action, enCours] = useActionState(
    premiereConnexionAction,
    ETAT_INITIAL,
  );

  const champs = etat.erreursChamps;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sécurisez votre compte</CardTitle>
        <CardDescription>
          Avant d&apos;accéder à l&apos;application, renseignez votre identité et
          choisissez un mot de passe personnel.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Alert className="mb-4">
          <Info aria-hidden />
          <AlertDescription>
            Le mot de passe doit contenir au moins 12 caractères, dont une
            minuscule, une majuscule et un chiffre.
          </AlertDescription>
        </Alert>

        {etat.erreur && (
          <Alert variant="destructive" className="mb-4">
            <CircleAlert aria-hidden />
            <AlertDescription>{etat.erreur}</AlertDescription>
          </Alert>
        )}

        <form action={action} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="prenoms">Prénoms</Label>
              <Input
                id="prenoms"
                name="prenoms"
                autoComplete="given-name"
                required
                aria-invalid={Boolean(champs?.prenoms)}
                aria-describedby={champs?.prenoms ? 'erreur-prenoms' : undefined}
              />
              <MessageErreur id="erreur-prenoms" erreurs={champs?.prenoms} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nom">Nom</Label>
              <Input
                id="nom"
                name="nom"
                autoComplete="family-name"
                required
                aria-invalid={Boolean(champs?.nom)}
                aria-describedby={champs?.nom ? 'erreur-nom' : undefined}
              />
              <MessageErreur id="erreur-nom" erreurs={champs?.nom} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Adresse e-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={emailActuel}
              autoComplete="username"
              required
              aria-invalid={Boolean(champs?.email)}
              aria-describedby={champs?.email ? 'erreur-email' : undefined}
            />
            <MessageErreur id="erreur-email" erreurs={champs?.email} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="motDePasseActuel">Mot de passe actuel</Label>
            <Input
              id="motDePasseActuel"
              name="motDePasseActuel"
              type="password"
              autoComplete="current-password"
              required
              aria-invalid={Boolean(champs?.motDePasseActuel)}
              aria-describedby={
                champs?.motDePasseActuel ? 'erreur-motDePasseActuel' : undefined
              }
            />
            <MessageErreur
              id="erreur-motDePasseActuel"
              erreurs={champs?.motDePasseActuel}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nouveauMotDePasse">Nouveau mot de passe</Label>
            <Input
              id="nouveauMotDePasse"
              name="nouveauMotDePasse"
              type="password"
              autoComplete="new-password"
              required
              aria-invalid={Boolean(champs?.nouveauMotDePasse)}
              aria-describedby={
                champs?.nouveauMotDePasse ? 'erreur-nouveauMotDePasse' : undefined
              }
            />
            <MessageErreur
              id="erreur-nouveauMotDePasse"
              erreurs={champs?.nouveauMotDePasse}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmation">Confirmer le nouveau mot de passe</Label>
            <Input
              id="confirmation"
              name="confirmation"
              type="password"
              autoComplete="new-password"
              required
              aria-invalid={Boolean(champs?.confirmation)}
              aria-describedby={
                champs?.confirmation ? 'erreur-confirmation' : undefined
              }
            />
            <MessageErreur id="erreur-confirmation" erreurs={champs?.confirmation} />
          </div>

          <Button type="submit" className="w-full" disabled={enCours}>
            {enCours && <LoaderCircle className="animate-spin" aria-hidden />}
            {enCours ? 'Enregistrement…' : 'Valider et continuer'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
