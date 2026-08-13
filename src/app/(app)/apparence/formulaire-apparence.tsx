'use client';

import {
  CircleAlert,
  Eye,
  Image as ImageIcon,
  Info,
  LoaderCircle,
  RotateCcw,
  Sparkles,
  Trash2,
  Type,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useActionState } from 'react';
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
import { Switch } from '@/components/ui/switch';
import {
  contrasteAvecBlanc,
  paletteDepuisPixels,
} from '@/lib/apparence/palette';
import {
  POLICES,
  REGLAGES_PAR_DEFAUT,
  STYLES_INTERFACE,
  adresseGoogleFonts,
  pilePolice,
  variablesCss,
} from '@/lib/apparence/theme';
import {
  enregistrerApparenceAction,
  type EtatProfil,
} from '@/lib/actions/profil';
import { cn } from '@/lib/utils';

type Organisation = {
  nom: string;
  sigle: string;
  slogan: string;
  logoUrl: string | null;
  aUnLogoTeleverse: boolean;
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

/**
 * Appearance of the whole application (cahier des charges §9.4).
 *
 * Everything is previewed **live on the real interface**, not in a mock panel:
 * the CSS variables are written straight onto the document while the user
 * drags a picker, so the sidebar, the header and the buttons around the form
 * change with it. A swatch next to a colour picker says far less than seeing
 * one's own navigation take the colour.
 *
 * Nothing is written to the database until "Enregistrer"; leaving the page
 * without saving restores what was stored.
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

  const [reglages, setReglages] = useState({
    couleurPrimaire: organisation.couleurPrimaire,
    couleurSecondaire: organisation.couleurSecondaire,
    couleurAccent: organisation.couleurAccent,
    couleurFond: organisation.couleurFond,
    couleurBouton: organisation.couleurBouton ?? '',
    police: organisation.police,
    styleInterface: organisation.styleInterface,
    densiteInterface: organisation.densiteInterface,
    radiusInterface: organisation.radiusInterface,
  });

  const [slogan, setSlogan] = useState(organisation.slogan);
  const [logoUrl, setLogoUrl] = useState(organisation.logoUrl ?? '');
  const [automatique, setAutomatique] = useState(organisation.paletteAutomatique);
  const [apercuLogo, setApercuLogo] = useState<string | null>(
    organisation.aUnLogoTeleverse ? '/api/logo' : null,
  );
  const [retirerLogo, setRetirerLogo] = useState(false);
  const [extractionEnCours, setExtractionEnCours] = useState(false);

  const champFichier = useRef<HTMLInputElement>(null);

  const modifier = (champ: keyof typeof reglages, valeur: string | number) =>
    setReglages((precedents) => ({ ...precedents, [champ]: valeur }));

  // ------------------------------------------------------- aperçu en direct
  useEffect(() => {
    // Written on `<body>`, where the root layout puts the stored values. On
    // `<html>` they would be inherited but overridden by the body's own inline
    // declaration, and the preview would silently do nothing.
    const cible = document.body;
    const variables = variablesCss(reglages);
    const precedentes = Object.keys(variables).map((nom) => [
      nom,
      cible.style.getPropertyValue(nom),
    ]);

    for (const [nom, valeur] of Object.entries(variables)) {
      cible.style.setProperty(nom, valeur);
    }

    // Leaving the screen restores what is actually stored, so an abandoned
    // preview never lingers.
    return () => {
      for (const [nom, valeur] of precedentes) {
        if (valeur) {
          cible.style.setProperty(nom, valeur);
        } else {
          cible.style.removeProperty(nom);
        }
      }
    };
  }, [reglages]);

  // The chosen font has to be fetched before it can be previewed.
  useEffect(() => {
    const adresse = adresseGoogleFonts(reglages.police);

    if (!adresse) {
      return;
    }

    const lien = document.createElement('link');
    lien.rel = 'stylesheet';
    lien.href = adresse;
    document.head.append(lien);

    return () => lien.remove();
  }, [reglages.police]);

  useEffect(() => {
    if (etat.succes) {
      toast.success(etat.message ?? 'Apparence enregistrée.');
    }
    if (etat.erreur) {
      toast.error(etat.erreur);
    }
  }, [etat]);

  // --------------------------------------------------- palette depuis le logo
  /**
   * Reads the logo's pixels in a canvas and derives a scheme from them.
   *
   * Done in the browser rather than on the server: the user sees the result the
   * instant they pick a file, and no image decoder has to be installed in
   * production for a feature used once a year.
   */
  const extrairePalette = (source: string) => {
    setExtractionEnCours(true);

    const image = new Image();
    image.crossOrigin = 'anonymous';

    image.onload = () => {
      try {
        const cote = 96;
        const toile = document.createElement('canvas');
        toile.width = cote;
        toile.height = cote;

        const contexte = toile.getContext('2d', { willReadFrequently: true });

        if (!contexte) {
          return;
        }

        contexte.drawImage(image, 0, 0, cote, cote);
        const palette = paletteDepuisPixels(
          contexte.getImageData(0, 0, cote, cote).data,
        );

        setReglages((precedents) => ({
          ...precedents,
          couleurPrimaire: palette.primaire,
          couleurSecondaire: palette.secondaire,
          couleurAccent: palette.accent,
        }));

        toast.success('Palette déduite du logo.');
      } catch {
        // A logo served from another domain without CORS taints the canvas.
        toast.error(
          'Impossible de lire les couleurs de cette image. Téléversez le fichier plutôt que son adresse.',
        );
      } finally {
        setExtractionEnCours(false);
      }
    };

    image.onerror = () => {
      setExtractionEnCours(false);
      toast.error('Cette image n’a pas pu être chargée.');
    };

    image.src = source;
  };

  const choisirFichier = (fichier: File | undefined) => {
    if (!fichier) {
      return;
    }

    const lecteur = new FileReader();

    lecteur.onload = () => {
      const source = String(lecteur.result);
      setApercuLogo(source);
      setRetirerLogo(false);

      if (automatique) {
        extrairePalette(source);
      }
    };

    lecteur.readAsDataURL(fichier);
  };

  const reinitialiser = () => {
    setReglages({
      couleurPrimaire: REGLAGES_PAR_DEFAUT.couleurPrimaire,
      couleurSecondaire: REGLAGES_PAR_DEFAUT.couleurSecondaire,
      couleurAccent: REGLAGES_PAR_DEFAUT.couleurAccent,
      couleurFond: REGLAGES_PAR_DEFAUT.couleurFond,
      couleurBouton: '',
      police: REGLAGES_PAR_DEFAUT.police,
      styleInterface: REGLAGES_PAR_DEFAUT.styleInterface,
      densiteInterface: REGLAGES_PAR_DEFAUT.densiteInterface,
      radiusInterface: REGLAGES_PAR_DEFAUT.radiusInterface,
    });
    setSlogan('Calendrier de diffusion statistique');
    setAutomatique(false);
    toast.info('Réglages par défaut rétablis. Enregistrez pour les appliquer.');
  };

  const contraste = contrasteAvecBlanc(
    reglages.couleurBouton || reglages.couleurPrimaire,
  );

  return (
    <form action={action} className="space-y-6 pb-24">
      {/* Champs pilotés par l'état React, transmis en clair au serveur. */}
      {Object.entries(reglages).map(([nom, valeur]) => (
        <input key={nom} type="hidden" name={nom} value={String(valeur)} />
      ))}
      <input type="hidden" name="slogan" value={slogan} />
      <input type="hidden" name="logoUrl" value={logoUrl} />
      <input type="hidden" name="retirerLogo" value={retirerLogo ? '1' : '0'} />
      {automatique && (
        <input type="hidden" name="paletteAutomatique" value="on" />
      )}

      {/* ------------------------------------------------------------ logo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="size-4" aria-hidden />
            Logo et slogan
          </CardTitle>
          <CardDescription>
            Affichés dans l&apos;en-tête de l&apos;application, sur la page de
            connexion et en tête des e-mails.
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
                mieux sur les deux thèmes.
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
                <span className="text-xs text-muted-foreground">
                  Logo DIFFUSIO par défaut
                </span>
              )}

              {apercuLogo && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setApercuLogo(null);
                    setRetirerLogo(true);
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
            <Label htmlFor="slogan">Slogan</Label>
            <Input
              id="slogan"
              value={slogan}
              onChange={(evenement) => setSlogan(evenement.target.value)}
              maxLength={120}
              placeholder="Calendrier de diffusion statistique"
            />
            {etat.erreursChamps?.slogan && (
              <p className="text-sm text-destructive">
                {etat.erreursChamps.slogan[0]}
              </p>
            )}
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

      {/* -------------------------------------------------------- couleurs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4" aria-hidden />
            Couleurs
          </CardTitle>
          <CardDescription>
            Elles habillent l&apos;application entière et les e-mails.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <label className="flex items-start gap-3 rounded-lg border p-3">
            <Switch
              checked={automatique}
              onCheckedChange={(coche) => {
                setAutomatique(coche);
                if (coche && apercuLogo) {
                  extrairePalette(apercuLogo);
                }
              }}
            />
            <span>
              <span className="block text-sm font-medium">
                Déduire la palette du logo
              </span>
              <span className="block text-xs text-muted-foreground">
                Les couleurs sont extraites de l&apos;image et assombries au
                besoin pour rester lisibles sous du texte blanc. Vous pouvez
                toujours les retoucher ensuite.
              </span>
            </span>
          </label>

          {extractionEnCours && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
              Lecture des couleurs du logo…
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ChampCouleur
              nom="couleurPrimaire"
              libelle="Principale"
              valeur={reglages.couleurPrimaire}
              onChange={(valeur) => modifier('couleurPrimaire', valeur)}
            />
            <ChampCouleur
              nom="couleurSecondaire"
              libelle="Secondaire"
              valeur={reglages.couleurSecondaire}
              onChange={(valeur) => modifier('couleurSecondaire', valeur)}
            />
            <ChampCouleur
              nom="couleurBouton"
              libelle="Boutons"
              valeur={reglages.couleurBouton || reglages.couleurPrimaire}
              onChange={(valeur) => modifier('couleurBouton', valeur)}
              indication="Vide : suit la principale"
            />
            <ChampCouleur
              nom="couleurFond"
              libelle="Arrière-plan"
              valeur={reglages.couleurFond}
              onChange={(valeur) => modifier('couleurFond', valeur)}
            />
          </div>

          {contraste < 4.5 && (
            <Alert variant="destructive">
              <CircleAlert aria-hidden />
              <AlertDescription>
                Le contraste entre la couleur des boutons et le texte blanc est
                de {contraste.toFixed(1)}:1, sous le minimum de 4,5:1 des règles
                d&apos;accessibilité. Le texte des boutons sera difficile à
                lire ; choisissez une teinte plus foncée.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* ------------------------------------------------------ typographie */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Type className="size-4" aria-hidden />
            Typographie et style
          </CardTitle>
          <CardDescription>
            Le style agit sur la texture — ombres, bordures — jamais sur la
            disposition des écrans.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="police">Police</Label>
            <Select
              value={reglages.police}
              onValueChange={(valeur) => modifier('police', valeur)}
            >
              <SelectTrigger id="police" className="w-full sm:w-96">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POLICES.map((police) => (
                  <SelectItem key={police.valeur} value={police.valeur}>
                    {police.libelle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div
              className="rounded-md border p-4"
              style={{ fontFamily: pilePolice(reglages.police) }}
            >
              <p className="text-lg font-semibold">
                Calendrier de diffusion 2026
              </p>
              <p className="text-sm text-muted-foreground">
                Bulletin mensuel des prix — diffusion prévue le 10/02/2026.
              </p>
              <p className="mt-1 text-sm tabular-nums">
                0123456789 — 94,4 jours de retard moyen
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Style d&apos;interface</Label>
            <div className="grid gap-3 sm:grid-cols-3">
              {STYLES_INTERFACE.map((style) => (
                <button
                  key={style.valeur}
                  type="button"
                  onClick={() => modifier('styleInterface', style.valeur)}
                  className={cn(
                    'rounded-lg border p-3 text-left transition-colors',
                    reglages.styleInterface === style.valeur
                      ? 'border-[var(--couleur-primaire)] bg-[var(--couleur-primaire-douce)]'
                      : 'hover:bg-muted',
                  )}
                  aria-pressed={reglages.styleInterface === style.valeur}
                >
                  <span className="block text-sm font-medium">
                    {style.libelle}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {style.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="densiteInterface">Espacements</Label>
              <Select
                value={reglages.densiteInterface}
                onValueChange={(valeur) => modifier('densiteInterface', valeur)}
              >
                <SelectTrigger id="densiteInterface" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONFORTABLE">
                    Confortable — plus d&apos;air
                  </SelectItem>
                  <SelectItem value="COMPACTE">
                    Compact — plus d&apos;informations à l&apos;écran
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="radiusInterface">
                Arrondi des angles — {reglages.radiusInterface.toFixed(3)} rem
              </Label>
              <input
                id="radiusInterface"
                type="range"
                min={0}
                max={1.5}
                step={0.125}
                value={reglages.radiusInterface}
                onChange={(evenement) =>
                  modifier('radiusInterface', Number(evenement.target.value))
                }
                className="w-full accent-[var(--couleur-primaire)]"
              />
              <p className="text-xs text-muted-foreground">
                0 pour des angles droits. Le style choisi module cette valeur.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* --------------------------------------------------------- aperçu */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="size-4" aria-hidden />
            Aperçu
          </CardTitle>
          <CardDescription>
            L&apos;application autour de vous a déjà pris ces réglages. Basculez
            le thème clair/sombre depuis le menu de votre compte pour vérifier
            les deux.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center rounded-[var(--radius)] px-3 py-2 text-sm text-white"
              style={{
                background:
                  reglages.couleurBouton || reglages.couleurPrimaire,
              }}
            >
              Bouton principal
            </span>
            <span
              className="inline-flex items-center rounded-[var(--radius)] px-3 py-2 text-sm text-white"
              style={{ background: reglages.couleurSecondaire }}
            >
              Secondaire
            </span>
            <span
              className="inline-flex items-center rounded-[var(--radius)] px-3 py-2 text-sm text-white"
              style={{ background: reglages.couleurAccent }}
            >
              Accent
            </span>
            <span
              className="inline-flex items-center rounded-[var(--radius)] border px-3 py-2 text-sm"
              style={{ background: reglages.couleurFond }}
            >
              Arrière-plan
            </span>
          </div>

          <Alert>
            <Info aria-hidden />
            <AlertDescription>
              Rien n&apos;est enregistré tant que vous n&apos;avez pas cliqué
              sur «&nbsp;Enregistrer&nbsp;». Quitter la page rétablit les
              réglages actuels.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Barre d'actions collante : sur un écran de réglages long, un bouton
          d'enregistrement en bas de page se cherche. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 p-3 backdrop-blur md:left-64">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={reinitialiser}>
            <RotateCcw aria-hidden />
            Réinitialiser par défaut
          </Button>
          <Button type="submit" disabled={enCours}>
            {enCours && <LoaderCircle className="animate-spin" aria-hidden />}
            Enregistrer
          </Button>
        </div>
      </div>
    </form>
  );
}

function ChampCouleur({
  nom,
  libelle,
  valeur,
  onChange,
  indication,
}: {
  nom: string;
  libelle: string;
  valeur: string;
  onChange: (valeur: string) => void;
  indication?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={nom}>{libelle}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(valeur) ? valeur : '#000000'}
          onChange={(evenement) => onChange(evenement.target.value)}
          className="size-9 shrink-0 cursor-pointer rounded border"
          aria-label={`Choisir la couleur ${libelle.toLowerCase()}`}
        />
        <Input
          id={nom}
          value={valeur}
          onChange={(evenement) => onChange(evenement.target.value)}
          className="font-mono"
        />
      </div>
      {indication && (
        <p className="text-xs text-muted-foreground">{indication}</p>
      )}
    </div>
  );
}
