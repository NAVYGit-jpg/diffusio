'use client';

import { CircleAlert, Info, LoaderCircle } from 'lucide-react';
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
  enregistrerApparenceAction,
  type EtatProfil,
} from '@/lib/actions/profil';

type Organisation = {
  nom: string;
  sigle: string;
  logoUrl: string | null;
  couleurPrimaire: string;
  couleurSecondaire: string;
  couleurAccent: string;
  densiteInterface: string;
  radiusInterface: number;
};

const ETAT_INITIAL: EtatProfil = {};

const DEFAUTS = {
  couleurPrimaire: '#1e40af',
  couleurSecondaire: '#475569',
  couleurAccent: '#0891b2',
  radiusInterface: 0.5,
};

/**
 * Relative luminance, per WCAG.
 *
 * §9.4 asks for a contrast check and a warning when a chosen colour makes text
 * unreadable — a real risk when somebody picks their institution's pale
 * corporate colour for buttons carrying white text.
 */
function luminance(hex: string): number {
  const composantes = [1, 3, 5].map((decalage) => {
    const valeur = Number.parseInt(hex.slice(decalage, decalage + 2), 16) / 255;
    return valeur <= 0.03928
      ? valeur / 12.92
      : ((valeur + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * composantes[0] + 0.7152 * composantes[1] + 0.0722 * composantes[2];
}

/** Contrast ratio against white, the colour of text on a coloured button. */
function contrasteAvecBlanc(hex: string): number {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return 21;
  }

  return 1.05 / (luminance(hex) + 0.05);
}

export function FormulaireApparence({
  organisation,
}: {
  organisation: Organisation;
}) {
  const [etat, action, enCours] = useActionState(
    enregistrerApparenceAction,
    ETAT_INITIAL,
  );

  const [primaire, setPrimaire] = useState(organisation.couleurPrimaire);
  const [secondaire, setSecondaire] = useState(organisation.couleurSecondaire);
  const [accent, setAccent] = useState(organisation.couleurAccent);
  const [logo, setLogo] = useState(organisation.logoUrl ?? '');

  useEffect(() => {
    if (etat.succes) {
      toast.success(etat.message ?? 'Enregistré.');
    }
  }, [etat]);

  const contraste = contrasteAvecBlanc(primaire);
  const contrasteInsuffisant = contraste < 4.5;

  const retablirDefauts = () => {
    setPrimaire(DEFAUTS.couleurPrimaire);
    setSecondaire(DEFAUTS.couleurSecondaire);
    setAccent(DEFAUTS.couleurAccent);
  };

  return (
    <form action={action} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
          <CardDescription>
            Affiché en en-tête des e-mails envoyés par l&apos;application.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="logoUrl">Adresse du logo</Label>
            <Input
              id="logoUrl"
              name="logoUrl"
              type="url"
              value={logo}
              onChange={(evenement) => setLogo(evenement.target.value)}
              placeholder="https://…"
            />
            {etat.erreursChamps?.logoUrl && (
              <p className="text-sm text-destructive">
                {etat.erreursChamps.logoUrl[0]}
              </p>
            )}
          </div>

          <Alert>
            <Info aria-hidden />
            <AlertDescription>
              Le logo se renseigne par son adresse web, pas par téléversement.
              Un logo hébergé dans l&apos;application ne s&apos;afficherait pas
              dans les e-mails : les messageries n&apos;accèdent pas aux fichiers
              protégés. Utilisez l&apos;adresse du logo publié sur le site de
              votre institution.
            </AlertDescription>
          </Alert>

          {logo && /^https?:\/\//.test(logo) && (
            <div className="rounded-md border p-3">
              <p className="mb-2 text-xs text-muted-foreground">Aperçu</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logo}
                alt={`Logo de ${organisation.nom}`}
                className="max-h-16"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Couleurs</CardTitle>
          <CardDescription>
            Elles habillent les boutons, les liens et les e-mails.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {(
              [
                ['couleurPrimaire', 'Couleur principale', primaire, setPrimaire],
                ['couleurSecondaire', 'Secondaire', secondaire, setSecondaire],
                ['couleurAccent', 'Accent', accent, setAccent],
              ] as const
            ).map(([nom, libelle, valeur, definir]) => (
              <div key={nom} className="space-y-2">
                <Label htmlFor={nom}>{libelle}</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={valeur}
                    onChange={(evenement) => definir(evenement.target.value)}
                    className="size-9 shrink-0 cursor-pointer rounded border"
                    aria-label={`Choisir la ${libelle.toLowerCase()}`}
                  />
                  <Input
                    id={nom}
                    name={nom}
                    value={valeur}
                    onChange={(evenement) => definir(evenement.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
            ))}
          </div>

          {contrasteInsuffisant && (
            <Alert variant="destructive">
              <CircleAlert aria-hidden />
              <AlertDescription>
                Le contraste entre cette couleur principale et le texte blanc est
                de {contraste.toFixed(1)}:1, en dessous du minimum de 4,5:1 exigé
                par les règles d&apos;accessibilité. Le texte des boutons sera
                difficile à lire. Choisissez une teinte plus foncée.
              </AlertDescription>
            </Alert>
          )}

          <div className="rounded-md border p-4">
            <p className="mb-3 text-xs text-muted-foreground">Aperçu</p>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center rounded-md px-3 py-2 text-sm text-white"
                style={{ background: primaire }}
              >
                Bouton principal
              </span>
              <span
                className="inline-flex items-center rounded-md px-3 py-2 text-sm text-white"
                style={{ background: secondaire }}
              >
                Secondaire
              </span>
              <span
                className="inline-flex items-center rounded-md px-3 py-2 text-sm text-white"
                style={{ background: accent }}
              >
                Accent
              </span>
            </div>
          </div>

          <Button type="button" variant="outline" onClick={retablirDefauts}>
            Rétablir les couleurs par défaut
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ergonomie</CardTitle>
          <CardDescription>
            Densité d&apos;affichage et arrondi des éléments.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="densiteInterface">Densité</Label>
              <Select
                name="densiteInterface"
                defaultValue={organisation.densiteInterface}
              >
                <SelectTrigger id="densiteInterface" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONFORTABLE">
                    Confortable — plus d&apos;espace
                  </SelectItem>
                  <SelectItem value="COMPACTE">
                    Compacte — plus d&apos;informations à l&apos;écran
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="radiusInterface">Arrondi des angles</Label>
              <Input
                id="radiusInterface"
                name="radiusInterface"
                type="number"
                step="0.125"
                min="0"
                max="2"
                defaultValue={organisation.radiusInterface}
              />
              <p className="text-xs text-muted-foreground">
                0 pour des angles droits, 0,5 par défaut.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={enCours}>
        {enCours && <LoaderCircle className="animate-spin" aria-hidden />}
        Enregistrer l&apos;apparence
      </Button>
    </form>
  );
}
