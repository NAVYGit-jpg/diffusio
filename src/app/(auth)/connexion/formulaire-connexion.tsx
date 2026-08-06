'use client';

import { CircleAlert, CircleCheck, LoaderCircle } from 'lucide-react';
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
import { connexionAction, type EtatFormulaire } from '@/lib/actions/auth';

const ETAT_INITIAL: EtatFormulaire = {};

export function FormulaireConnexion({
  motDePasseChange,
}: {
  motDePasseChange: boolean;
}) {
  const [etat, action, enCours] = useActionState(connexionAction, ETAT_INITIAL);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connexion</CardTitle>
        <CardDescription>
          Saisissez vos identifiants pour accéder à votre espace.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {motDePasseChange && (
          <Alert className="mb-4">
            <CircleCheck aria-hidden />
            <AlertDescription>
              Votre mot de passe a été modifié. Connectez-vous avec vos nouveaux
              identifiants.
            </AlertDescription>
          </Alert>
        )}

        {etat.erreur && (
          <Alert variant="destructive" className="mb-4">
            <CircleAlert aria-hidden />
            <AlertDescription>{etat.erreur}</AlertDescription>
          </Alert>
        )}

        <form action={action} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">Adresse e-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              required
              aria-describedby={etat.erreursChamps?.email ? 'erreur-email' : undefined}
              aria-invalid={Boolean(etat.erreursChamps?.email)}
            />
            {etat.erreursChamps?.email && (
              <p id="erreur-email" className="text-sm text-destructive">
                {etat.erreursChamps.email[0]}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="motDePasse">Mot de passe</Label>
            <Input
              id="motDePasse"
              name="motDePasse"
              type="password"
              autoComplete="current-password"
              required
              aria-describedby={
                etat.erreursChamps?.motDePasse ? 'erreur-motDePasse' : undefined
              }
              aria-invalid={Boolean(etat.erreursChamps?.motDePasse)}
            />
            {etat.erreursChamps?.motDePasse && (
              <p id="erreur-motDePasse" className="text-sm text-destructive">
                {etat.erreursChamps.motDePasse[0]}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={enCours}>
            {enCours && <LoaderCircle className="animate-spin" aria-hidden />}
            {enCours ? 'Connexion en cours…' : 'Se connecter'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
