import { describe, expect, it } from 'vitest';

import { analyserImportEquipe } from './equipe';

const ENTETES = ['Nom', 'Fonction', 'Adresse e-mail'];

function grille(...lignes: string[][]) {
  return [ENTETES, ...lignes];
}

describe('analyserImportEquipe', () => {
  it('lit une feuille correcte', () => {
    const rapport = analyserImportEquipe(
      grille(
        ['Awa Koné', 'Directrice de cabinet', 'awa.kone@stat.ci'],
        ['Yao N’Guessan', 'Chargé de communication', 'yao.n@stat.ci'],
      ),
      { emailsExistants: [] },
    );

    expect(rapport.erreurs).toEqual([]);
    expect(rapport.aCreer).toHaveLength(2);
    expect(rapport.aCreer[0]).toMatchObject({
      ligne: 2,
      nom: 'Awa Koné',
      fonction: 'Directrice de cabinet',
      email: 'awa.kone@stat.ci',
    });
  });

  it('accepte les variantes d’en-tête', () => {
    const rapport = analyserImportEquipe(
      [
        ['NOM COMPLET', 'Poste', 'Email'],
        ['Awa Koné', 'Directrice', 'awa@stat.ci'],
      ],
      { emailsExistants: [] },
    );

    expect(rapport.colonnesManquantes).toEqual([]);
    expect(rapport.aCreer).toHaveLength(1);
  });

  it('signale les colonnes obligatoires absentes', () => {
    const rapport = analyserImportEquipe(
      [
        ['Nom', 'Adresse e-mail'],
        ['Awa Koné', 'awa@stat.ci'],
      ],
      { emailsExistants: [] },
    );

    expect(rapport.colonnesManquantes).toEqual(['Fonction']);
    expect(rapport.aCreer).toEqual([]);
  });

  it('met l’adresse en minuscules et nettoie les espaces', () => {
    const rapport = analyserImportEquipe(
      grille(['  Awa   Koné ', ' Directrice ', '  AWA@STAT.CI ']),
      { emailsExistants: [] },
    );

    expect(rapport.aCreer[0]).toMatchObject({
      nom: 'Awa Koné',
      fonction: 'Directrice',
      email: 'awa@stat.ci',
    });
  });

  it('refuse une adresse invalide en nommant la ligne', () => {
    const rapport = analyserImportEquipe(
      grille(['Awa Koné', 'Directrice', 'pas-une-adresse']),
      { emailsExistants: [] },
    );

    expect(rapport.aCreer).toEqual([]);
    expect(rapport.erreurs[0]).toMatchObject({
      ligne: 2,
      colonne: 'Adresse e-mail',
    });
  });

  it('refuse une fonction manquante', () => {
    const rapport = analyserImportEquipe(
      grille(['Awa Koné', '', 'awa@stat.ci']),
      { emailsExistants: [] },
    );

    expect(rapport.erreurs[0]).toMatchObject({ ligne: 2, colonne: 'Fonction' });
  });

  it('signale un doublon interne au fichier', () => {
    const rapport = analyserImportEquipe(
      grille(
        ['Awa Koné', 'Directrice', 'awa@stat.ci'],
        ['Awa K.', 'Conseillère', 'AWA@stat.ci'],
      ),
      { emailsExistants: [] },
    );

    expect(rapport.erreurs).toHaveLength(1);
    expect(rapport.erreurs[0]).toMatchObject({ ligne: 3, colonne: 'Adresse e-mail' });
    // La première occurrence reste importable ; seule la seconde est écartée.
    expect(rapport.aCreer).toHaveLength(1);
  });

  it('range à part une adresse déjà dans l’équipe, sans la traiter en erreur', () => {
    // Réimporter un fichier corrigé ne doit pas reprocher les lignes déjà bonnes.
    const rapport = analyserImportEquipe(
      grille(
        ['Awa Koné', 'Directrice', 'awa@stat.ci'],
        ['Yao N’Guessan', 'Chargé de com', 'yao@stat.ci'],
      ),
      { emailsExistants: ['AWA@STAT.CI'] },
    );

    expect(rapport.erreurs).toEqual([]);
    expect(rapport.dejaPresents.map((m) => m.email)).toEqual(['awa@stat.ci']);
    expect(rapport.aCreer.map((m) => m.email)).toEqual(['yao@stat.ci']);
  });

  it('ignore les lignes entièrement vides', () => {
    const rapport = analyserImportEquipe(
      grille(['Awa Koné', 'Directrice', 'awa@stat.ci'], ['', '', ''], ['', '', '']),
      { emailsExistants: [] },
    );

    expect(rapport.lignesIgnorees).toBe(2);
    expect(rapport.aCreer).toHaveLength(1);
  });

  it('rapporte toutes les erreurs, pas seulement la première', () => {
    // Le but d'un rapport d'import est de tout montrer d'un coup.
    const rapport = analyserImportEquipe(
      grille(
        ['A', 'Directrice', 'awa@stat.ci'],
        ['Yao N’Guessan', 'Chargé', 'adresse-cassee'],
      ),
      { emailsExistants: [] },
    );

    expect(rapport.erreurs.map((e) => e.ligne)).toEqual([2, 3]);
  });

  it('retourne un rapport vide pour une feuille sans aucune ligne', () => {
    const rapport = analyserImportEquipe([], { emailsExistants: [] });

    expect(rapport.colonnesManquantes).toEqual([
      'Nom',
      'Fonction',
      'Adresse e-mail',
    ]);
  });
});
