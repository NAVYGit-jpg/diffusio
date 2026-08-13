import { describe, expect, it } from 'vitest';

import {
  PALETTE_PAR_DEFAUT,
  assombrirJusquAuContraste,
  compterCouleurs,
  contraste,
  contrasteAvecBlanc,
  depuisHex,
  eclaircir,
  luminance,
  paletteDepuisPixels,
  saturation,
  versHex,
} from './palette';

/** Builds an RGBA buffer by repeating each colour. */
function pixels(...entrees: [string, number][]): number[] {
  const tampon: number[] = [];

  for (const [hex, repetitions] of entrees) {
    const couleur = depuisHex(hex)!;

    for (let index = 0; index < repetitions; index += 1) {
      tampon.push(couleur.r, couleur.v, couleur.b, 255);
    }
  }

  return tampon;
}

describe('conversions', () => {
  it('fait l’aller-retour hex ↔ RVB', () => {
    expect(versHex(depuisHex('#1e40af')!)).toBe('#1e40af');
  });

  it('accepte une écriture sans dièse et en majuscules', () => {
    expect(depuisHex('1E40AF')).toEqual({ r: 30, v: 64, b: 175 });
  });

  it('refuse une valeur qui n’est pas une couleur', () => {
    expect(depuisHex('bleu')).toBeNull();
    expect(depuisHex('#abc')).toBeNull();
  });

  it('borne les composantes hors plage', () => {
    expect(versHex({ r: -20, v: 300, b: 128 })).toBe('#00ff80');
  });
});

describe('luminance et contraste', () => {
  it('place le noir et le blanc aux extrémités', () => {
    expect(luminance({ r: 0, v: 0, b: 0 })).toBe(0);
    expect(luminance({ r: 255, v: 255, b: 255 })).toBeCloseTo(1, 5);
  });

  it('donne 21:1 entre noir et blanc', () => {
    expect(
      contraste({ r: 0, v: 0, b: 0 }, { r: 255, v: 255, b: 255 }),
    ).toBeCloseTo(21, 1);
  });

  it('mesure le contraste avec le blanc depuis un hex', () => {
    // Le bleu par défaut porte confortablement du texte blanc.
    expect(contrasteAvecBlanc('#1e40af')).toBeGreaterThan(4.5);
    // Un jaune pâle, non.
    expect(contrasteAvecBlanc('#fde047')).toBeLessThan(4.5);
  });

  it('ne se plaint pas d’une valeur invalide', () => {
    expect(contrasteAvecBlanc('pas une couleur')).toBe(21);
  });
});

describe('saturation', () => {
  it('vaut 0 pour un gris', () => {
    expect(saturation({ r: 128, v: 128, b: 128 })).toBe(0);
  });

  it('vaut 1 pour une teinte pure', () => {
    expect(saturation({ r: 255, v: 0, b: 0 })).toBe(1);
  });
});

describe('assombrirJusquAuContraste', () => {
  it('laisse intacte une couleur déjà lisible', () => {
    const depart = depuisHex('#1e40af')!;

    expect(assombrirJusquAuContraste(depart)).toEqual(depart);
  });

  it('assombrit une couleur pâle jusqu’à porter du texte blanc', () => {
    // Refuser la couleur renverrait l'utilisateur vers une palette qui n'est
    // pas la sienne ; l'assombrir garde sa teinte et rend l'écran lisible.
    const pale = depuisHex('#fde047')!;
    const corrigee = assombrirJusquAuContraste(pale);

    expect(contraste(corrigee, { r: 255, v: 255, b: 255 })).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  it('respecte un seuil personnalisé', () => {
    const corrigee = assombrirJusquAuContraste(depuisHex('#60a5fa')!, 7);

    expect(contraste(corrigee, { r: 255, v: 255, b: 255 })).toBeGreaterThanOrEqual(
      7,
    );
  });
});

describe('eclaircir', () => {
  it('rapproche du blanc sans le dépasser', () => {
    const clair = eclaircir({ r: 0, v: 0, b: 0 }, 0.5);

    expect(clair.r).toBeCloseTo(127.5, 1);
  });
});

describe('compterCouleurs', () => {
  it('classe par fréquence décroissante', () => {
    const comptees = compterCouleurs(
      pixels(['#1e40af', 3], ['#b91c1c', 7]),
    );

    expect(comptees[0].occurrences).toBe(7);
    expect(versHex(comptees[0].couleur)).toBe('#b91c1c');
  });

  it('ignore les pixels transparents', () => {
    // Un logo détouré est surtout du vide ; ce vide n'est pas sa couleur.
    const tampon = [30, 64, 175, 255, 200, 30, 30, 10];

    expect(compterCouleurs(tampon)).toHaveLength(1);
  });

  it('ignore le presque-blanc et le presque-noir', () => {
    const comptees = compterCouleurs(
      pixels(['#ffffff', 50], ['#000000', 50], ['#1e40af', 5]),
    );

    expect(comptees).toHaveLength(1);
    expect(versHex(comptees[0].couleur)).toBe('#1e40af');
  });

  it('regroupe les nuances presque identiques', () => {
    // Un logo enregistré en JPEG porte des milliers de teintes voisines.
    const comptees = compterCouleurs(
      pixels(['#1e40af', 1], ['#1f41b0', 1], ['#1d3fae', 1]),
    );

    expect(comptees).toHaveLength(1);
    expect(comptees[0].occurrences).toBe(3);
  });

  it('retourne une liste vide pour un tampon vide', () => {
    expect(compterCouleurs([])).toEqual([]);
  });
});

describe('paletteDepuisPixels', () => {
  it('retombe sur la palette par défaut sans pixel exploitable', () => {
    expect(paletteDepuisPixels([])).toEqual(PALETTE_PAR_DEFAUT);
  });

  it('retient la couleur saturée dominante, pas le gris du fond', () => {
    // Un logo posé sur une plaque grise ne doit pas rendre tout l'écran gris.
    const palette = paletteDepuisPixels(
      pixels(['#808080', 100], ['#b91c1c', 20]),
    );

    expect(palette.primaire).toBe('#b91c1c');
  });

  it('produit une couleur principale lisible sous du texte blanc', () => {
    const palette = paletteDepuisPixels(pixels(['#fde047', 60]));

    expect(contrasteAvecBlanc(palette.primaire)).toBeGreaterThanOrEqual(4.5);
  });

  it('distingue la secondaire de la principale', () => {
    const palette = paletteDepuisPixels(
      pixels(['#b91c1c', 40], ['#1e40af', 25]),
    );

    expect(palette.primaire).toBe('#b91c1c');
    expect(palette.secondaire).not.toBe(palette.primaire);
  });

  it('dérive une secondaire même avec une seule teinte au logo', () => {
    const palette = paletteDepuisPixels(pixels(['#b91c1c', 40]));

    expect(palette.secondaire).not.toBe(palette.primaire);
    expect(contrasteAvecBlanc(palette.secondaire)).toBeGreaterThanOrEqual(4.5);
  });

  it('produit un accent lisible', () => {
    const palette = paletteDepuisPixels(pixels(['#1e40af', 40]));

    expect(contrasteAvecBlanc(palette.accent)).toBeGreaterThanOrEqual(4.5);
  });

  it('rend les quatre couleurs au format hexadécimal', () => {
    const palette = paletteDepuisPixels(pixels(['#1e40af', 10]));

    for (const valeur of Object.values(palette)) {
      expect(valeur).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
