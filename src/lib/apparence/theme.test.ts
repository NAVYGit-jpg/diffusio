import { describe, expect, it } from 'vitest';

import { contrasteAvecBlanc } from './palette';
import {
  POLICES,
  REGLAGES_PAR_DEFAUT,
  STYLES_INTERFACE,
  adresseGoogleFonts,
  pilePolice,
  variablesCss,
} from './theme';

describe('variablesCss', () => {
  it('reprend les quatre couleurs choisies', () => {
    const variables = variablesCss({
      ...REGLAGES_PAR_DEFAUT,
      couleurPrimaire: '#b91c1c',
      couleurSecondaire: '#334155',
      couleurAccent: '#0e7490',
      couleurFond: '#fafafa',
    });

    expect(variables['--couleur-primaire']).toBe('#b91c1c');
    expect(variables['--couleur-secondaire']).toBe('#334155');
    expect(variables['--couleur-accent']).toBe('#0e7490');
    expect(variables['--couleur-fond']).toBe('#fafafa');
  });

  it('fait suivre la couleur principale aux boutons par défaut', () => {
    const variables = variablesCss({
      ...REGLAGES_PAR_DEFAUT,
      couleurPrimaire: '#b91c1c',
      couleurBouton: null,
    });

    expect(variables['--couleur-bouton']).toBe('#b91c1c');
  });

  it('respecte une couleur de bouton distincte', () => {
    const variables = variablesCss({
      ...REGLAGES_PAR_DEFAUT,
      couleurPrimaire: '#b91c1c',
      couleurBouton: '#065f46',
    });

    expect(variables['--couleur-bouton']).toBe('#065f46');
  });

  it('traite une couleur de bouton vide comme absente', () => {
    // Un champ efface a la main ne doit pas produire une couleur vide.
    const variables = variablesCss({
      ...REGLAGES_PAR_DEFAUT,
      couleurPrimaire: '#b91c1c',
      couleurBouton: '   ',
    });

    expect(variables['--couleur-bouton']).toBe('#b91c1c');
  });

  it('assombrit la couleur des aplats jusqu’à porter du texte blanc', () => {
    // Une charte jaune vif donnerait du blanc sur jaune a 1,7:1, illisible.
    // La teinte reste celle de l'organisation, la lisibilite est garantie.
    const variables = variablesCss({
      ...REGLAGES_PAR_DEFAUT,
      couleurPrimaire: '#d3cd27',
    });

    expect(variables['--couleur-primaire']).toBe('#d3cd27');
    expect(
      contrasteAvecBlanc(variables['--couleur-primaire-lisible']),
    ).toBeGreaterThanOrEqual(4.5);
  });

  it('laisse intacte une couleur déjà lisible', () => {
    const variables = variablesCss({
      ...REGLAGES_PAR_DEFAUT,
      couleurPrimaire: '#1e40af',
    });

    expect(variables['--couleur-primaire-lisible']).toBe('#1e40af');
  });

  it('construit le dégradé sur la couleur de l’organisation', () => {
    // Declare ici et non dans la feuille de style : une propriete personnalisee
    // contenant var(--couleur-primaire) est substituee la ou elle est
    // declaree. Posee sur :root alors que les couleurs vivent sur <body>, elle
    // restait figee sur la valeur de repli.
    const variables = variablesCss({
      ...REGLAGES_PAR_DEFAUT,
      couleurPrimaire: '#b91c1c',
    });

    expect(variables['--gradient-primaire']).toContain('#b91c1c');
    expect(variables['--gradient-primaire']).not.toContain('var(');
  });

  it('laisse la teinte douce à la feuille de style', () => {
    // Calculee ici, elle resterait pale en theme sombre, ou le libelle pose
    // dessus est presque blanc. La feuille de style la melange a la surface.
    const variables = variablesCss(REGLAGES_PAR_DEFAUT);

    expect(variables['--couleur-primaire-douce']).toBeUndefined();
  });

  it('applique le facteur d’arrondi du style choisi', () => {
    const moderne = variablesCss({
      ...REGLAGES_PAR_DEFAUT,
      radiusInterface: 0.5,
      styleInterface: 'MODERNE',
    });
    const classique = variablesCss({
      ...REGLAGES_PAR_DEFAUT,
      radiusInterface: 0.5,
      styleInterface: 'CLASSIQUE',
    });

    expect(moderne['--radius']).toBe('0.5rem');
    // Le style classique arrondit moins, pour la même valeur choisie.
    expect(Number.parseFloat(classique['--radius'])).toBeLessThan(0.5);
  });

  it('supprime l’ombre et la bordure en style minimaliste', () => {
    const variables = variablesCss({
      ...REGLAGES_PAR_DEFAUT,
      styleInterface: 'MINIMALISTE',
    });

    expect(variables['--ombre-carte']).toBe('none');
    expect(variables['--epaisseur-bordure']).toBe('0px');
  });

  it('gradue l’élévation du plus discret au plus marqué', () => {
    // Classique pose la surface, moderne la souleve : les deux styles doivent
    // rester distinguables a l'oeil, sinon le choix ne sert a rien.
    const classique = variablesCss({
      ...REGLAGES_PAR_DEFAUT,
      styleInterface: 'CLASSIQUE',
    });
    const moderne = variablesCss({
      ...REGLAGES_PAR_DEFAUT,
      styleInterface: 'MODERNE',
    });

    expect(classique['--ombre-carte']).toContain('--elevation-1');
    expect(moderne['--ombre-carte']).toContain('--elevation-2');
    // Seul le style moderne porte le liseré qui fait décoller la surface.
    expect(moderne['--ombre-carte']).toContain('liseré-surface');
    expect(classique['--ombre-carte']).not.toContain('liseré-surface');
  });

  it('resserre les espacements en densité compacte', () => {
    const confortable = variablesCss(REGLAGES_PAR_DEFAUT);
    const compacte = variablesCss({
      ...REGLAGES_PAR_DEFAUT,
      densiteInterface: 'COMPACTE',
    });

    expect(Number(compacte['--facteur-espacement'])).toBeLessThan(
      Number(confortable['--facteur-espacement']),
    );
  });

  it('retombe sur le style moderne pour une valeur inconnue', () => {
    // Une valeur ancienne restée en base ne doit pas casser l'affichage.
    const variables = variablesCss({
      ...REGLAGES_PAR_DEFAUT,
      styleInterface: 'STYLE_DISPARU',
    });

    expect(variables['--ombre-carte']).not.toBe('none');
  });

  it('produit une pile de polices utilisable', () => {
    const variables = variablesCss({ ...REGLAGES_PAR_DEFAUT, police: 'Lora' });

    expect(variables['--police-interface']).toContain('Lora');
  });
});

describe('pilePolice', () => {
  it('connaît chaque police proposée', () => {
    for (const police of POLICES) {
      expect(pilePolice(police.valeur)).toBe(police.pile);
    }
  });

  it('retombe sur la police par défaut si le nom est inconnu', () => {
    expect(pilePolice('Comic Sans')).toBe('var(--font-geist-sans)');
  });
});

describe('adresseGoogleFonts', () => {
  it('ne charge rien pour les polices déjà présentes', () => {
    // Geist est empaquetée avec l'application, la police système est locale :
    // les demander a Google serait une requete externe pour rien.
    expect(adresseGoogleFonts('Geist')).toBeNull();
    expect(adresseGoogleFonts('System')).toBeNull();
  });

  it('construit une adresse pour une police à télécharger', () => {
    const adresse = adresseGoogleFonts('IBM Plex Sans');

    expect(adresse).toContain('IBM+Plex+Sans');
    expect(adresse).toContain('display=swap');
  });

  it('ne charge rien pour une police inconnue', () => {
    expect(adresseGoogleFonts('Police fantôme')).toBeNull();
  });
});

describe('catalogue', () => {
  it('décrit chaque style d’interface', () => {
    for (const style of STYLES_INTERFACE) {
      expect(style.libelle).toBeTruthy();
      expect(style.description).toBeTruthy();
    }
  });
});
