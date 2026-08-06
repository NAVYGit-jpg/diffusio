import { describe, expect, it } from 'vitest';

import {
  type StructureImportee,
  analyserImportStructures,
  ordonnerPourCreation,
} from './structures';

const ENTETE = ['Nom', 'Sigle', 'Code', 'Type', 'Code parent'];

describe('analyserImportStructures', () => {
  it('accepte un fichier correct', () => {
    const rapport = analyserImportStructures(
      [
        ENTETE,
        ['Ministère du Plan', 'MPLAN', 'MPLAN', 'Ministère', ''],
        ['Direction A', 'DIRA', 'DIRA', 'Direction', 'MPLAN'],
      ],
      [],
    );

    expect(rapport.erreurs).toEqual([]);
    expect(rapport.aCreer).toHaveLength(2);
    expect(rapport.aCreer[1].codeParent).toBe('MPLAN');
  });

  it('accepte les en-tetes dans n importe quel ordre et sans accents', () => {
    const rapport = analyserImportStructures(
      [
        ['CODE', 'nom', 'sigle', 'parent'],
        ['DIRA', 'Direction A', 'DIRA', ''],
      ],
      [],
    );

    expect(rapport.colonnesManquantes).toEqual([]);
    expect(rapport.aCreer).toHaveLength(1);
  });

  it('refuse le fichier si une colonne obligatoire manque', () => {
    const rapport = analyserImportStructures(
      [
        ['Nom', 'Code'],
        ['Direction A', 'DIRA'],
      ],
      [],
    );

    expect(rapport.colonnesManquantes).toEqual(['Sigle']);
    expect(rapport.aCreer).toEqual([]);
  });

  it('signale un type inconnu en listant les valeurs acceptees', () => {
    const rapport = analyserImportStructures(
      [ENTETE, ['Direction A', 'DIRA', 'DIRA', 'Département', '']],
      [],
    );

    expect(rapport.erreurs).toHaveLength(1);
    expect(rapport.erreurs[0].colonne).toBe('Type');
    expect(rapport.erreurs[0].message).toContain('DIRECTION');
  });

  it('tolere un type ecrit avec accents, tirets ou en minuscules', () => {
    const rapport = analyserImportStructures(
      [
        ENTETE,
        ['Ministere', 'MIN', 'MIN', 'ministère', ''],
        ['Sous direction', 'SDIR', 'SDIR', 'sous-direction', ''],
        ['Sans type', 'SANS', 'SANS', '', ''],
      ],
      [],
    );

    expect(rapport.erreurs).toEqual([]);
    expect(rapport.aCreer.map((s) => s.type)).toEqual([
      'MINISTERE',
      'SOUS_DIRECTION',
      'AUTRE',
    ]);
  });

  it('detecte un code en double dans le fichier', () => {
    const rapport = analyserImportStructures(
      [
        ENTETE,
        ['Direction A', 'DIRA', 'DIRA', 'Direction', ''],
        ['Direction B', 'DIRB', 'dira', 'Direction', ''],
      ],
      [],
    );

    expect(rapport.erreurs).toHaveLength(1);
    expect(rapport.erreurs[0].ligne).toBe(3);
    expect(rapport.erreurs[0].message).toContain('ligne 2');
  });

  it('signale un parent qui n existe nulle part', () => {
    const rapport = analyserImportStructures(
      [ENTETE, ['Direction A', 'DIRA', 'DIRA', 'Direction', 'FANTOME']],
      [],
    );

    expect(rapport.erreurs[0].colonne).toBe('Code parent');
    expect(rapport.erreurs[0].message).toContain('FANTOME');
  });

  it('accepte un parent deja present dans l application', () => {
    const rapport = analyserImportStructures(
      [ENTETE, ['Direction A', 'DIRA', 'DIRA', 'Direction', 'MPLAN']],
      ['MPLAN'],
    );

    expect(rapport.erreurs).toEqual([]);
  });

  it('accepte un parent declare plus bas dans le meme fichier', () => {
    // L'ordre des lignes ne doit pas contraindre l'utilisateur.
    const rapport = analyserImportStructures(
      [
        ENTETE,
        ['Direction A', 'DIRA', 'DIRA', 'Direction', 'MPLAN'],
        ['Ministère', 'MPLAN', 'MPLAN', 'Ministère', ''],
      ],
      [],
    );

    expect(rapport.erreurs).toEqual([]);
  });

  it('refuse une structure declaree comme son propre parent', () => {
    const rapport = analyserImportStructures(
      [ENTETE, ['Direction A', 'DIRA', 'DIRA', 'Direction', 'DIRA']],
      [],
    );

    expect(rapport.erreurs[0].message).toContain('sa propre structure parente');
  });

  it('separe les codes deja presents plutot que de les recreer', () => {
    const rapport = analyserImportStructures(
      [
        ENTETE,
        ['Direction A', 'DIRA', 'DIRA', 'Direction', ''],
        ['Direction B', 'DIRB', 'DIRB', 'Direction', ''],
      ],
      ['DIRA'],
    );

    expect(rapport.dejaExistants).toEqual(['DIRA']);
    expect(rapport.aCreer.map((s) => s.code)).toEqual(['DIRB']);
  });

  it('classe les erreurs par numero de ligne croissant', () => {
    const rapport = analyserImportStructures(
      [
        ENTETE,
        ['Alpha', 'ALP', 'ALP', 'Inconnu', ''],
        ['Beta', 'BET', 'BET', 'Direction', 'FANTOME'],
        ['Gamma', 'GAM', 'GAM', 'Inconnu', ''],
      ],
      [],
    );

    expect(rapport.erreurs.map((e) => e.ligne)).toEqual([2, 3, 4]);
  });
});

describe('ordonnerPourCreation', () => {
  function s(code: string, codeParent: string | null, ligne = 2): StructureImportee {
    return {
      ligne,
      nom: code,
      sigle: code,
      code,
      type: 'DIRECTION',
      codeParent,
      description: null,
    };
  }

  it('cree toujours un parent avant ses enfants', () => {
    const { ordonnees, cycliques } = ordonnerPourCreation(
      [s('SERVICE', 'DIRA'), s('DIRA', 'MPLAN'), s('MPLAN', null)],
      [],
    );

    expect(cycliques).toEqual([]);

    const rang = (code: string) => ordonnees.findIndex((x) => x.code === code);
    expect(rang('MPLAN')).toBeLessThan(rang('DIRA'));
    expect(rang('DIRA')).toBeLessThan(rang('SERVICE'));
  });

  it('accepte un parent deja present en base', () => {
    const { ordonnees, cycliques } = ordonnerPourCreation([s('DIRA', 'MPLAN')], [
      'MPLAN',
    ]);

    expect(ordonnees).toHaveLength(1);
    expect(cycliques).toEqual([]);
  });

  it('isole les lignes prises dans un cycle au lieu de boucler', () => {
    const { ordonnees, cycliques } = ordonnerPourCreation(
      [s('A', 'B'), s('B', 'A')],
      [],
    );

    expect(ordonnees).toEqual([]);
    expect(cycliques.map((x) => x.code).sort()).toEqual(['A', 'B']);
  });

  it('ne perd aucune ligne : ordonnees et cycliques couvrent tout', () => {
    const entree = [s('A', 'B'), s('B', 'A'), s('SAIN', null)];
    const { ordonnees, cycliques } = ordonnerPourCreation(entree, []);

    expect(ordonnees.length + cycliques.length).toBe(entree.length);
  });
});
