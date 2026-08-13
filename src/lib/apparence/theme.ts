import { depuisHex, eclaircir, versHex } from './palette';

/**
 * Turning the super admin's choices into CSS variables (cahier des charges §9.4).
 *
 * One pure function, used in three places: the root layout writes them on the
 * server, the appearance screen writes them live while the user drags a colour
 * picker, and the reset button writes the defaults back. Three implementations
 * would drift the first time a token was added.
 */

export const POLICES = [
  { valeur: 'Geist', libelle: 'Geist — moderne, neutre', pile: 'var(--font-geist-sans)' },
  {
    valeur: 'Inter',
    libelle: 'Inter — lisible à petite taille',
    pile: "'Inter', system-ui, sans-serif",
  },
  {
    valeur: 'Source Sans 3',
    libelle: 'Source Sans — institutionnel',
    pile: "'Source Sans 3', system-ui, sans-serif",
  },
  {
    valeur: 'Lora',
    libelle: 'Lora — sérif, rapports imprimés',
    pile: "'Lora', Georgia, serif",
  },
  {
    valeur: 'IBM Plex Sans',
    libelle: 'IBM Plex Sans — technique',
    pile: "'IBM Plex Sans', system-ui, sans-serif",
  },
  {
    valeur: 'System',
    libelle: 'Police du système — aucun téléchargement',
    pile: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  },
] as const;

export type NomPolice = (typeof POLICES)[number]['valeur'];

/** Google Fonts families to fetch; the system stacks need nothing. */
export const POLICES_A_CHARGER: Record<string, string | null> = {
  Geist: null,
  System: null,
  Inter: 'Inter:wght@400;500;600;700',
  'Source Sans 3': 'Source+Sans+3:wght@400;500;600;700',
  Lora: 'Lora:wght@400;500;600;700',
  'IBM Plex Sans': 'IBM+Plex+Sans:wght@400;500;600;700',
};

export function pilePolice(nom: string): string {
  return (
    POLICES.find((police) => police.valeur === nom)?.pile ??
    'var(--font-geist-sans)'
  );
}

export const STYLES_INTERFACE = [
  {
    valeur: 'MODERNE',
    libelle: 'Moderne',
    description: 'Ombres douces, bordures discrètes, aplats francs.',
  },
  {
    valeur: 'CLASSIQUE',
    libelle: 'Classique',
    description: 'Bordures nettes, angles peu arrondis, sobriété.',
  },
  {
    valeur: 'MINIMALISTE',
    libelle: 'Minimaliste',
    description: 'Ni ombre ni cadre : seuls les contenus séparent les blocs.',
  },
] as const;

export type StyleInterface = (typeof STYLES_INTERFACE)[number]['valeur'];

export type ReglagesApparence = {
  couleurPrimaire: string;
  couleurSecondaire: string;
  couleurAccent: string;
  couleurFond: string;
  /** Empty or absent: buttons follow the main colour. */
  couleurBouton?: string | null;
  police: string;
  styleInterface: string;
  densiteInterface: string;
  radiusInterface: number;
};

export const REGLAGES_PAR_DEFAUT: ReglagesApparence = {
  couleurPrimaire: '#1e40af',
  couleurSecondaire: '#475569',
  couleurAccent: '#0891b2',
  couleurFond: '#ffffff',
  couleurBouton: null,
  police: 'Geist',
  styleInterface: 'MODERNE',
  densiteInterface: 'CONFORTABLE',
  radiusInterface: 0.5,
};

/**
 * Per-style tokens.
 *
 * The style changes the *texture* of the interface — shadows, borders — not the
 * layout. Moving elements around between styles would make the application feel
 * like three different products and break every habit the user has built.
 */
const TOKENS_STYLE: Record<
  StyleInterface,
  { ombre: string; epaisseurBordure: string; facteurArrondi: number }
> = {
  MODERNE: {
    ombre: '0 1px 2px 0 rgb(0 0 0 / 0.05), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
    epaisseurBordure: '1px',
    facteurArrondi: 1,
  },
  CLASSIQUE: {
    ombre: 'none',
    epaisseurBordure: '1px',
    facteurArrondi: 0.4,
  },
  MINIMALISTE: {
    ombre: 'none',
    epaisseurBordure: '0px',
    facteurArrondi: 0.8,
  },
};

const ESPACEMENTS: Record<string, string> = {
  CONFORTABLE: '1',
  COMPACTE: '0.78',
};

/**
 * The CSS variables an appearance produces.
 *
 * Returned as a plain object so a server component can spread it into `style`
 * and a client component can write it onto `document.documentElement`.
 */
export function variablesCss(
  reglages: ReglagesApparence,
): Record<string, string> {
  const style = (TOKENS_STYLE[reglages.styleInterface as StyleInterface] ??
    TOKENS_STYLE.MODERNE);

  const bouton =
    reglages.couleurBouton && reglages.couleurBouton.trim() !== ''
      ? reglages.couleurBouton
      : reglages.couleurPrimaire;

  const primaire = depuisHex(reglages.couleurPrimaire);

  return {
    '--couleur-primaire': reglages.couleurPrimaire,
    '--couleur-secondaire': reglages.couleurSecondaire,
    '--couleur-accent': reglages.couleurAccent,
    '--couleur-fond': reglages.couleurFond,
    '--couleur-bouton': bouton,
    // A translucent tint of the main colour, for hovers and selected rows.
    '--couleur-primaire-douce': primaire
      ? versHex(eclaircir(primaire, 0.88))
      : '#eef2ff',
    '--radius': `${reglages.radiusInterface * style.facteurArrondi}rem`,
    '--ombre-carte': style.ombre,
    '--epaisseur-bordure': style.epaisseurBordure,
    '--facteur-espacement': ESPACEMENTS[reglages.densiteInterface] ?? '1',
    '--police-interface': pilePolice(reglages.police),
  };
}

/** `<link>` href for the chosen font, or `null` when nothing is needed. */
export function adresseGoogleFonts(police: string): string | null {
  const famille = POLICES_A_CHARGER[police];

  if (!famille) {
    return null;
  }

  return `https://fonts.googleapis.com/css2?family=${famille}&display=swap`;
}
