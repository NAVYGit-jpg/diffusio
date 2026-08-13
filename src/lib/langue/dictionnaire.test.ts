import { describe, expect, it } from 'vitest';

import {
  LANGUES,
  LANGUE_PAR_DEFAUT,
  baliseLangue,
  clesManquantes,
  langueValide,
  traducteur,
  traduire,
} from './dictionnaire';

describe('traduire', () => {
  it('rend le français tel quel', () => {
    expect(traduire('nav.calendrier', 'FR')).toBe('Calendrier de diffusion');
  });

  it('traduit en anglais et en portugais', () => {
    expect(traduire('nav.calendrier', 'EN')).toBe('Release calendar');
    expect(traduire('nav.calendrier', 'PT')).toBe('Calendário de divulgação');
  });

  it('traduit les statuts d’une ligne de calendrier', () => {
    expect(traduire('statut.TELEVERSE', 'FR')).toBe('Livré');
    expect(traduire('statut.TELEVERSE', 'EN')).toBe('Submitted');
    expect(traduire('statut.MIS_EN_LIGNE', 'PT')).toBe('Publicado');
  });

  it('traduit les rôles', () => {
    expect(traduire('role.POINT_FOCAL', 'EN')).toBe('Focal point');
    expect(traduire('role.SUPER_ADMIN', 'PT')).toBe('Super administrador');
  });
});

describe('traducteur', () => {
  it('fournit une fonction liée à une langue', () => {
    const t = traducteur('EN');

    expect(t('action.enregistrer')).toBe('Save');
    expect(t('nav.equipe')).toBe('Team');
  });
});

describe('langueValide', () => {
  it('accepte les trois langues proposées', () => {
    expect(langueValide('FR')).toBe('FR');
    expect(langueValide('EN')).toBe('EN');
    expect(langueValide('PT')).toBe('PT');
  });

  it('retombe sur le français pour une valeur inconnue', () => {
    // Une valeur venue d'un formulaire trafiqué ne doit pas vider l'interface.
    expect(langueValide('ES')).toBe('FR');
    expect(langueValide(null)).toBe('FR');
    expect(langueValide(undefined)).toBe('FR');
    expect(langueValide(42)).toBe('FR');
  });

  it('a le français pour défaut', () => {
    expect(LANGUE_PAR_DEFAUT).toBe('FR');
  });
});

describe('baliseLangue', () => {
  it('donne l’étiquette BCP-47 de chaque langue', () => {
    expect(baliseLangue('FR')).toBe('fr');
    expect(baliseLangue('EN')).toBe('en');
    expect(baliseLangue('PT')).toBe('pt');
  });
});

describe('couverture des dictionnaires', () => {
  it('traduit chaque clé en anglais', () => {
    // Le test échoue dès qu'une clé est ajoutée sans sa traduction : c'est le
    // seul moyen de ne pas laisser filtrer du français dans l'interface
    // anglaise sans s'en apercevoir.
    expect(clesManquantes('EN')).toEqual([]);
  });

  it('traduit chaque clé en portugais', () => {
    expect(clesManquantes('PT')).toEqual([]);
  });

  it('propose exactement les trois langues attendues', () => {
    expect(LANGUES.map((langue) => langue.code)).toEqual(['FR', 'EN', 'PT']);
  });

  it('donne un libellé et une étiquette à chaque langue', () => {
    for (const langue of LANGUES) {
      expect(langue.libelle).toBeTruthy();
      expect(langue.etiquette).toBeTruthy();
    }
  });
});
