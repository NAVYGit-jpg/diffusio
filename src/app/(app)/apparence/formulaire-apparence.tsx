'use client';

import {
  Image as ImageIcon,
  LoaderCircle,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { useActionState, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

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
  enregistrerApparenceAction,
  type EtatProfil,
} from '@/lib/actions/profil';

type Organisation = {
  nom: string;
  sigle: string;
  slogan: string;
  logoUrl: string | null;
  aUnLogoTeleverse: boolean;
  /** Kept and resubmitted untouched: the screen no longer edits them. */
  couleurPrimaire: string;
  couleurSecondaire: string;
  couleurAccent: string;
  couleurFond: string;
  couleurBouton: string | null;
  paletteAutomatique: boolean;
  police: string;
  styleInterface: string;
  densiteInterface: string;
  radiusInterface: number;
};

const ETAT_INITIAL: EtatProfil = {};

const SLOGAN_PAR_DEFAUT = 'Calendrier de diffusion statistique';

/**
 * Organisation identity: logo and tagline (cahier des charges §9.4).
 *
 * The colour, typography and layout controls were removed at the project
 * owner's request. The stored values still drive the interface — they are
 * resubmitted unchanged with every save, so simplifying this screen never
 * silently resets the theme that is already in place.
 */
export function FormulaireApparence({
  organisation,
}: {
  organisation: Organisation;
}) {
  const [etat, action, enCours] = useActionState(
    enregistrerApparenceAction,
    ETAT_INITIAL,
  );

  const [slogan, setSlogan] = useState(organisation.slogan);
  const [logoUrl, setLogoUrl] = useState(organisation.logoUrl ?? '');
  const [fichierChoisi, setFichierChoisi] = useState<string | null>(
    organisation.aUnLogoTeleverse ? '/api/logo' : null,
  );
  const [retirerLogo, setRetirerLogo] = useState(false);

  // Same precedence as the header: uploaded file first, published address next,
  // DIFFUSIO wordmark last. A preview that ignored the address would suggest
  // the typed logo has no effect.
  const apercuLogo =
    fichierChoisi ??
    (/^https?:\/\//.test(logoUrl.trim()) ? logoUrl.trim() : null);

  const champFichier = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (etat.succes) {
      toast.success(etat.message ?? 'Enregistré.');
    }
    if (etat.erreur) {
      toast.error(etat.erreur);
    }
  }, [etat]);

  const choisirFichier = (fichier: File | undefined) => {
    if (!fichier) {
      return;
    }

    const lecteur = new FileReader();

    lecteur.onload = () => {
      setFichierChoisi(String(lecteur.result));
      setRetirerLogo(false);
    };

    lecteur.readAsDataURL(fichier);
  };

  const reinitialiser = () => {
    setSlogan(SLOGAN_PAR_DEFAUT);
    setLogoUrl('');
    setFichierChoisi(null);
    setRetirerLogo(true);

    if (champFichier.current) {
      champFichier.current.value = '';
    }

    toast.info('Valeurs par défaut rétablies. Enregistrez pour les appliquer.');
  };

  return (
    <form action={action} className="space-y-6">
      {/* Les réglages de thème ne sont plus modifiables ici, mais restent
          transmis tels quels : les omettre les remettrait aux valeurs par
          défaut au premier enregistrement. */}
      <input
        type="hidden"
        name="couleurPrimaire"
        value={organisation.couleurPrimaire}
      />
      <input
        type="hidden"
        name="couleurSecondaire"
        value={organisation.couleurSecondaire}
      />
      <input
        type="hidden"
        name="couleurAccent"
        value={organisation.couleurAccent}
      />
      <input type="hidden" name="couleurFond" value={organisation.couleurFond} />
      <input
        type="hidden"
        name="couleurBouton"
        value={organisation.couleurBouton ?? ''}
      />
      <input type="hidden" name="police" value={organisation.police} />
      <input
        type="hidden"
        name="styleInterface"
        value={organisation.styleInterface}
      />
      <input
        type="hidden"
        name="densiteInterface"
        value={organisation.densiteInterface}
      />
      <input
        type="hidden"
        name="radiusInterface"
        value={organisation.radiusInterface}
      />
      {organisation.paletteAutomatique && (
        <input type="hidden" name="paletteAutomatique" value="on" />
      )}

      <input type="hidden" name="slogan" value={slogan} />
      <input type="hidden" name="logoUrl" value={logoUrl} />
      <input type="hidden" name="retirerLogo" value={retirerLogo ? '1' : '0'} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="size-4" aria-hidden />
            Logo
          </CardTitle>
          <CardDescription>
            Affiché dans l&apos;en-tête de l&apos;application, sur la page de
            connexion et en tête des e-mails automatiques.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="grid gap-5 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="logoFichier">Téléverser un logo</Label>
              <Input
                id="logoFichier"
                name="logoFichier"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                ref={champFichier}
                onChange={(evenement) =>
                  choisirFichier(evenement.target.files?.[0])
                }
              />
              <p className="text-xs text-muted-foreground">
                PNG, JPEG, WebP ou SVG — 1 Mo maximum. Un fond transparent rend
                mieux sur les thèmes clair et sombre.
              </p>
              {etat.erreursChamps?.logoFichier && (
                <p className="text-sm text-destructive">
                  {etat.erreursChamps.logoFichier[0]}
                </p>
              )}
            </div>

            <div className="flex min-w-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-4">
              <span className="text-xs text-muted-foreground">Aperçu</span>
              {apercuLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={apercuLogo}
                  alt={`Logo de ${organisation.nom}`}
                  className="max-h-14 max-w-36 object-contain"
                />
              ) : (
                <span className="text-center text-xs text-muted-foreground">
                  Logo DIFFUSIO
                  <br />
                  par défaut
                </span>
              )}

              {apercuLogo && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFichierChoisi(null);
                    setRetirerLogo(true);
                    setLogoUrl('');
                    if (champFichier.current) {
                      champFichier.current.value = '';
                    }
                  }}
                >
                  <Trash2 aria-hidden />
                  Retirer
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logoUrl">
              Ou adresse d&apos;un logo déjà publié en ligne
            </Label>
            <Input
              id="logoUrl"
              type="url"
              value={logoUrl}
              onChange={(evenement) => setLogoUrl(evenement.target.value)}
              placeholder="https://…"
            />
            <p className="text-xs text-muted-foreground">
              Utile si votre logo est déjà hébergé sur le site de
              l&apos;institution. Le fichier téléversé a la priorité.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Slogan</CardTitle>
          <CardDescription>
            La phrase affichée sous le logo, sur la page de connexion et à côté
            de l&apos;en-tête.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="slogan">Texte du slogan</Label>
            <Input
              id="slogan"
              value={slogan}
              onChange={(evenement) => setSlogan(evenement.target.value)}
              maxLength={120}
              placeholder={SLOGAN_PAR_DEFAUT}
            />
            {etat.erreursChamps?.slogan && (
              <p className="text-sm text-destructive">
                {etat.erreursChamps.slogan[0]}
              </p>
            )}
          </div>

          <div className="rounded-lg border p-4 text-center">
            <p className="mb-1 text-xs text-muted-foreground">Aperçu</p>
            {apercuLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={apercuLogo}
                alt=""
                className="mx-auto max-h-10 object-contain"
              />
            ) : (
              <span className="font-semibold tracking-tight">DIFFUSIO</span>
            )}
            <p className="mt-2 text-sm text-muted-foreground">
              {slogan || SLOGAN_PAR_DEFAUT}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" onClick={reinitialiser}>
          <RotateCcw aria-hidden />
          Réinitialiser par défaut
        </Button>
        <Button type="submit" disabled={enCours}>
          {enCours && <LoaderCircle className="animate-spin" aria-hidden />}
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
