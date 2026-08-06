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
import { definirMotDePasseAction, type EtatFormulaire } from '@/lib/actions/auth';

const ETAT_INITIAL: EtatFormulaire = {};

export function FormulaireDefinirMotDePasse({
  jeton,
  nomComplet,
  email,
}: {
  jeton: string;
  nomComplet: string;
  email: string;
}) {
  const [etat, action, enCours] = useActionState(
    definirMotDePasseAction,
    ETAT_INITIAL,
  );

  const champs = etat.erreursChamps;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bienvenue {nomComplet}</CardTitle>
        <CardDescription>
          Choisissez le mot de passe qui protégera votre compte {email}.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Alert className="mb-4">
          <Info aria-hidden />
          <AlertDescription>
            Au moins 12 caractères, dont une minuscule, une majuscule et un
            chiffre.
          </AlertDescription>
        </Alert>

        {etat.erreur && (
          <Alert variant="destructive" className="mb-4">
            <CircleAlert aria-hidden />
            <AlertDescription>{etat.erreur}</AlertDescription>
          </Alert>
        )}

        <form action={action} className="space-y-4" noValidate>
          <input type="hidden" name="jeton" value={jeton} />

          <div className="space-y-2">
            <Label htmlFor="motDePasse">Mot de passe</Label>
            <Input
              id="motDePasse"
              name="motDePasse"
              type="password"
              autoComplete="new-password"
              required
              aria-invalid={Boolean(champs?.motDePasse)}
            />
            {champs?.motDePasse && (
              <p className="text-sm text-destructive">{champs.motDePasse[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmation">Confirmer le mot de passe</Label>
            <Input
              id="confirmation"
              name="confirmation"
              type="password"
              autoComplete="new-password"
              required
              aria-invalid={Boolean(champs?.confirmation)}
            />
            {champs?.confirmation && (
              <p className="text-sm text-destructive">{champs.confirmation[0]}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={enCours}>
            {enCours && <LoaderCircle className="animate-spin" aria-hidden />}
            Activer mon compte
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
