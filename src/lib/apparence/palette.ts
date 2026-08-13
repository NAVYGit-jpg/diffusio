/**
 * Deriving a colour scheme from a logo (cahier des charges §9.4).
 *
 * Pure arithmetic over raw pixels: no canvas, no DOM, no image decoding. The
 * caller hands over an RGBA buffer — a browser gets one from a canvas, a test
 * writes one by hand — and gets back a usable palette.
 *
 * What "usable" means is the whole difficulty. A logo's dominant colour is
 * often its background, and a pale corporate blue makes white button text
 * unreadable. So the extracted colours are not taken as they come: they are
 * darkened until they carry white text, which is what §9.4's contrast
 * requirement actually asks for.
 */

export type Rvb = { r: number; v: number; b: number };

export type Palette = {
  primaire: string;
  secondaire: string;
  accent: string;
  fond: string;
};

/** #rrggbb, lower case. */
export function versHex({ r, v, b }: Rvb): string {
  const composante = (valeur: number) =>
    Math.max(0, Math.min(255, Math.round(valeur)))
      .toString(16)
      .padStart(2, '0');

  return `#${composante(r)}${composante(v)}${composante(b)}`;
}

export function depuisHex(hex: string): Rvb | null {
  const propre = hex.trim().replace(/^#/, '');

  if (!/^[0-9a-fA-F]{6}$/.test(propre)) {
    return null;
  }

  return {
    r: Number.parseInt(propre.slice(0, 2), 16),
    v: Number.parseInt(propre.slice(2, 4), 16),
    b: Number.parseInt(propre.slice(4, 6), 16),
  };
}

/** Relative luminance, per WCAG 2.1. */
export function luminance({ r, v, b }: Rvb): number {
  const canal = (valeur: number) => {
    const normalise = valeur / 255;

    return normalise <= 0.03928
      ? normalise / 12.92
      : ((normalise + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * canal(r) + 0.7152 * canal(v) + 0.0722 * canal(b);
}

/** Contrast ratio between two colours, from 1 to 21. */
export function contraste(a: Rvb, b: Rvb): number {
  const clair = Math.max(luminance(a), luminance(b));
  const sombre = Math.min(luminance(a), luminance(b));

  return (clair + 0.05) / (sombre + 0.05);
}

const BLANC: Rvb = { r: 255, v: 255, b: 255 };

/** Contrast against white — the colour of text on a coloured button. */
export function contrasteAvecBlanc(hex: string): number {
  const couleur = depuisHex(hex);

  return couleur === null ? 21 : contraste(couleur, BLANC);
}

/** Saturation of the HSL model, 0 for a grey, 1 for a pure hue. */
export function saturation({ r, v, b }: Rvb): number {
  const max = Math.max(r, v, b) / 255;
  const min = Math.min(r, v, b) / 255;

  if (max === min) {
    return 0;
  }

  const clarte = (max + min) / 2;

  return clarte > 0.5
    ? (max - min) / (2 - max - min)
    : (max - min) / (max + min);
}

/**
 * Darkens a colour until white text sits on it comfortably.
 *
 * A pale institutional colour is not rejected — it is deepened. Refusing it
 * would send the user back to a palette they do not own; deepening it keeps
 * their hue and makes the interface readable.
 */
export function assombrirJusquAuContraste(
  couleur: Rvb,
  minimum = 4.5,
): Rvb {
  let courante = couleur;

  // Fifty steps of 4 % is enough to reach black from any starting point.
  for (let essai = 0; essai < 50; essai += 1) {
    if (contraste(courante, BLANC) >= minimum) {
      return courante;
    }

    courante = {
      r: courante.r * 0.96,
      v: courante.v * 0.96,
      b: courante.b * 0.96,
    };
  }

  return courante;
}

/** Lightens a colour, used to build the accent from the main hue. */
export function eclaircir(couleur: Rvb, facteur: number): Rvb {
  return {
    r: couleur.r + (255 - couleur.r) * facteur,
    v: couleur.v + (255 - couleur.v) * facteur,
    b: couleur.b + (255 - couleur.b) * facteur,
  };
}

export type CouleurComptee = { couleur: Rvb; occurrences: number };

/**
 * Groups the pixels into buckets and counts them.
 *
 * Colours are quantised to 4 bits per channel: a logo saved as JPEG has
 * thousands of nearly identical shades, and counting them exactly would return
 * a thousand buckets of one pixel each.
 *
 * Transparent and near-white pixels are dropped — a logo is usually a mark on
 * an empty background, and that background is not its colour.
 */
export function compterCouleurs(
  pixels: Uint8ClampedArray | readonly number[],
  options: { alphaMinimum?: number } = {},
): CouleurComptee[] {
  const alphaMinimum = options.alphaMinimum ?? 128;
  const paniers = new Map<number, { somme: Rvb; occurrences: number }>();

  for (let index = 0; index + 3 < pixels.length; index += 4) {
    const r = pixels[index];
    const v = pixels[index + 1];
    const b = pixels[index + 2];
    const alpha = pixels[index + 3];

    if (alpha < alphaMinimum) {
      continue;
    }

    // Near-white and near-black are almost always background or outline.
    const clair = (r + v + b) / 3;

    if (clair > 244 || clair < 12) {
      continue;
    }

    const cle =
      ((r >> 4) << 8) | ((v >> 4) << 4) | (b >> 4);

    const panier = paniers.get(cle);

    if (panier) {
      panier.somme.r += r;
      panier.somme.v += v;
      panier.somme.b += b;
      panier.occurrences += 1;
    } else {
      paniers.set(cle, { somme: { r, v, b }, occurrences: 1 });
    }
  }

  const bruts = [...paniers.values()]
    .map(({ somme, occurrences }) => ({
      couleur: {
        r: somme.r / occurrences,
        v: somme.v / occurrences,
        b: somme.b / occurrences,
      },
      occurrences,
    }))
    .sort((a, b) => b.occurrences - a.occurrences);

  return fusionnerVoisines(bruts);
}

/** Manhattan distance in RGB — good enough to tell two shades apart. */
function distance(a: Rvb, b: Rvb): number {
  return Math.abs(a.r - b.r) + Math.abs(a.v - b.v) + Math.abs(a.b - b.b);
}

/**
 * Merges buckets that are visually the same colour.
 *
 * Quantising alone is not enough: two shades a hair apart can fall on either
 * side of a bucket edge and be counted as different colours. Merging afterwards
 * groups them by actual distance rather than by where the grid happened to cut.
 *
 * Buckets are visited from the most frequent down, so a dominant colour absorbs
 * its own noise rather than the reverse.
 */
function fusionnerVoisines(
  entrees: readonly CouleurComptee[],
  seuil = 48,
): CouleurComptee[] {
  const groupes: { somme: Rvb; occurrences: number; reference: Rvb }[] = [];

  for (const entree of entrees) {
    const proche = groupes.find(
      (groupe) => distance(groupe.reference, entree.couleur) <= seuil,
    );

    if (proche) {
      proche.somme.r += entree.couleur.r * entree.occurrences;
      proche.somme.v += entree.couleur.v * entree.occurrences;
      proche.somme.b += entree.couleur.b * entree.occurrences;
      proche.occurrences += entree.occurrences;
    } else {
      groupes.push({
        somme: {
          r: entree.couleur.r * entree.occurrences,
          v: entree.couleur.v * entree.occurrences,
          b: entree.couleur.b * entree.occurrences,
        },
        occurrences: entree.occurrences,
        reference: entree.couleur,
      });
    }
  }

  return groupes
    .map(({ somme, occurrences }) => ({
      couleur: {
        r: somme.r / occurrences,
        v: somme.v / occurrences,
        b: somme.b / occurrences,
      },
      occurrences,
    }))
    .sort((a, b) => b.occurrences - a.occurrences);
}

/** Default scheme, used when a logo yields nothing usable. */
export const PALETTE_PAR_DEFAUT: Palette = {
  primaire: '#1e40af',
  secondaire: '#475569',
  accent: '#0891b2',
  fond: '#ffffff',
};

/**
 * Full palette derived from a logo's pixels.
 *
 * The main colour is the most frequent **saturated** colour, not simply the
 * most frequent: a logo printed on a grey plate would otherwise turn the whole
 * interface grey. The secondary is the next distinct hue, and the accent is a
 * lighter version of the main one — a third arbitrary hue would fight with the
 * other two rather than support them.
 */
export function paletteDepuisPixels(
  pixels: Uint8ClampedArray | readonly number[],
): Palette {
  const comptees = compterCouleurs(pixels);

  if (comptees.length === 0) {
    return PALETTE_PAR_DEFAUT;
  }

  const colorees = comptees.filter(
    (entree) => saturation(entree.couleur) >= 0.15,
  );

  const dominante = (colorees[0] ?? comptees[0]).couleur;
  const primaire = assombrirJusquAuContraste(dominante);

  // Second hue, far enough from the first to read as a different colour.
  const candidatSecondaire = (colorees.length > 1 ? colorees : comptees).find(
    (entree) =>
      Math.abs(entree.couleur.r - dominante.r) +
        Math.abs(entree.couleur.v - dominante.v) +
        Math.abs(entree.couleur.b - dominante.b) >
      90,
  );

  const secondaire = assombrirJusquAuContraste(
    candidatSecondaire?.couleur ?? {
      r: dominante.r * 0.6,
      v: dominante.v * 0.6,
      b: dominante.b * 0.6,
    },
  );

  return {
    primaire: versHex(primaire),
    secondaire: versHex(secondaire),
    accent: versHex(assombrirJusquAuContraste(eclaircir(primaire, 0.25))),
    fond: '#ffffff',
  };
}
