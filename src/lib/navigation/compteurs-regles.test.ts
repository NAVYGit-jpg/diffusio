import { describe, expect, it } from 'vitest';

import { jour } from '@/lib/calendrier/dates';
import {
  ONGLETS_AVEC_COMPTEUR,
  apparuDepuis,
  dateEntreeImminente,
  dateEntreeRetard,
  formaterCompteur,
  libelleCompteur,
  porteUnCompteur,
} from './compteurs-regles';

describe('porteUnCompteur', () => {
  it('reconnaît les onglets qui portent un compteur', () => {
    expect(porteUnCompteur('/retards')).toBe(true);
    expect(porteUnCompteur('/produits-charges')).toBe(true);
  });

  it('écarte le tableau de bord', () => {
    // Il ne contient rien qui « s'ajoute » : il résume ce qui est ailleurs.
    expect(porteUnCompteur('/tableau-de-bord')).toBe(false);
  });

  it('écarte une adresse inconnue', () => {
    expect(porteUnCompteur('/inexistant')).toBe(false);
  });

  it('couvre les dix onglets attendus', () => {
    expect(ONGLETS_AVEC_COMPTEUR).toHaveLength(10);
  });
});

describe('dateEntreeImminente', () => {
  it('place l’entrée quinze jours avant l’échéance', () => {
    // Une ligne créée en janvier n'apparaît dans « imminentes » qu'a quinze
    // jours de sa diffusion : c'est ce moment-la qui compte comme apparition.
    expect(dateEntreeImminente(jour(2026, 3, 20))).toEqual(jour(2026, 3, 5));
  });

  it('traverse correctement un changement de mois', () => {
    expect(dateEntreeImminente(jour(2026, 3, 10))).toEqual(jour(2026, 2, 23));
  });

  it('accepte un horizon personnalisé', () => {
    expect(dateEntreeImminente(jour(2026, 3, 20), 5)).toEqual(jour(2026, 3, 15));
  });

  it('ne modifie pas la date reçue', () => {
    const echeance = jour(2026, 3, 20);
    dateEntreeImminente(echeance);

    expect(echeance).toEqual(jour(2026, 3, 20));
  });
});

describe('dateEntreeRetard', () => {
  it('place l’entrée au lendemain de l’échéance', () => {
    // Une diffusion attendue aujourd'hui n'est pas encore en retard.
    expect(dateEntreeRetard(jour(2026, 3, 20))).toEqual(jour(2026, 3, 21));
  });

  it('traverse correctement une fin de mois', () => {
    expect(dateEntreeRetard(jour(2026, 2, 28))).toEqual(jour(2026, 3, 1));
  });

  it('traverse correctement une fin d’année', () => {
    expect(dateEntreeRetard(jour(2026, 12, 31))).toEqual(jour(2027, 1, 1));
  });
});

describe('apparuDepuis', () => {
  it('retient ce qui est apparu après la dernière visite', () => {
    expect(apparuDepuis(jour(2026, 3, 10), jour(2026, 3, 1))).toBe(true);
  });

  it('écarte ce qui était déjà là', () => {
    expect(apparuDepuis(jour(2026, 3, 1), jour(2026, 3, 10))).toBe(false);
  });

  it('écarte ce qui est apparu exactement à la visite', () => {
    // Vu au moment même : ce n'est pas nouveau.
    const instant = jour(2026, 3, 10);
    expect(apparuDepuis(instant, instant)).toBe(false);
  });

  it('considère tout comme nouveau si l’onglet n’a jamais été ouvert', () => {
    expect(apparuDepuis(jour(2020, 1, 1), null)).toBe(true);
  });
});

describe('formaterCompteur', () => {
  it('n’affiche rien à zéro', () => {
    expect(formaterCompteur(0)).toBeNull();
    expect(formaterCompteur(-3)).toBeNull();
  });

  it('affiche le nombre exact jusqu’à 99', () => {
    expect(formaterCompteur(1)).toBe('1');
    expect(formaterCompteur(99)).toBe('99');
  });

  it('abrège au-delà de 99', () => {
    expect(formaterCompteur(100)).toBe('99+');
    expect(formaterCompteur(4213)).toBe('99+');
  });
});

describe('libelleCompteur', () => {
  it('accorde le singulier et le pluriel', () => {
    expect(libelleCompteur(1)).toBe('1 nouvel élément');
    expect(libelleCompteur(4)).toBe('4 nouveaux éléments');
  });

  it('ne dit rien à zéro', () => {
    expect(libelleCompteur(0)).toBe('');
  });
});
