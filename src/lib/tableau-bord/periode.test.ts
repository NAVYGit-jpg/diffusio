import { describe, expect, it } from 'vitest';

import { libellePeriode, nomFichierPeriode } from './periode';

describe('libellePeriode', () => {
  it('sans mois choisi, couvre l’année', () => {
    expect(libellePeriode(2026, [])).toBe('Année 2026');
  });

  it('les douze mois redeviennent l’année', () => {
    // Cocher toute la liste n'est pas un filtre, c'est l'etat de depart.
    expect(
      libellePeriode(2026, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
    ).toBe('Année 2026');
  });

  it('nomme un mois seul', () => {
    expect(libellePeriode(2026, [1])).toBe('Janvier 2026');
    expect(libellePeriode(2026, [8])).toBe('Août 2026');
  });

  it('écrit une suite continue comme un intervalle', () => {
    expect(libellePeriode(2026, [1, 2, 3])).toBe('De janvier à mars 2026');
    expect(libellePeriode(2026, [11, 12])).toBe('De novembre à décembre 2026');
  });

  it('élide « de » devant un mois qui commence par une voyelle', () => {
    // « De avril » ne s'ecrit pas.
    expect(libellePeriode(2026, [4, 5, 6, 7])).toBe("D'avril à juillet 2026");
    expect(libellePeriode(2026, [8, 9])).toBe("D'août à septembre 2026");
    expect(libellePeriode(2026, [10, 11])).toBe("D'octobre à novembre 2026");
  });

  it('énumère des mois qui ne se suivent pas', () => {
    expect(libellePeriode(2026, [1, 3, 6])).toBe('Janvier, mars et juin 2026');
    expect(libellePeriode(2026, [2, 12])).toBe('Février et décembre 2026');
  });

  it('remet les mois dans l’ordre du calendrier', () => {
    // L'ordre des clics ne doit pas produire « De mars a janvier ».
    expect(libellePeriode(2026, [3, 1, 2])).toBe('De janvier à mars 2026');
    expect(libellePeriode(2026, [6, 1, 3])).toBe('Janvier, mars et juin 2026');
  });

  it('ignore les doublons et les valeurs impossibles', () => {
    expect(libellePeriode(2026, [3, 3])).toBe('Mars 2026');
    expect(libellePeriode(2026, [0, 5, 13])).toBe('Mai 2026');
  });
});

describe('nomFichierPeriode', () => {
  it('sans mois, ne porte que l’année', () => {
    expect(nomFichierPeriode(2026, [])).toBe('2026');
    expect(nomFichierPeriode(2026, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])).toBe(
      '2026',
    );
  });

  it('complète les mois à deux chiffres', () => {
    // Sinon « 2026-9 » se classe apres « 2026-10 » dans un dossier.
    expect(nomFichierPeriode(2026, [9])).toBe('2026-09');
    expect(nomFichierPeriode(2026, [12])).toBe('2026-12');
  });

  it('écrit une suite continue comme un intervalle', () => {
    expect(nomFichierPeriode(2026, [1, 2, 3])).toBe('2026-01-a-03');
  });

  it('énumère des mois qui ne se suivent pas', () => {
    expect(nomFichierPeriode(2026, [1, 3, 6])).toBe('2026-01-03-06');
  });

  it('ne contient ni accent ni espace', () => {
    for (const mois of [[], [1], [1, 2], [1, 5, 9]]) {
      expect(nomFichierPeriode(2026, mois)).toMatch(/^[0-9a-z-]+$/);
    }
  });
});
