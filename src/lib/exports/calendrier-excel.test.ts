import { describe, expect, it } from 'vitest';

import { jour } from '@/lib/calendrier/dates';
import {
  COLONNES_EXPORT,
  type LigneSource,
  construireLignesExport,
  libellePerimetre,
  nomFichierExport,
  trierLignesExport,
} from './calendrier-excel';

function source(modifications: Partial<LigneSource> = {}): LigneSource {
  return {
    structureNom: 'Direction des Statistiques Sociales',
    structureSigle: 'DSS',
    elementType: 'PUBLICATION',
    nomElement: 'Bulletin mensuel des prix',
    domaine: 'Prix',
    periodicite: 'MENSUELLE',
    libellePeriode: 'Janvier 2026',
    dateDebutCouverture: jour(2026, 1, 1),
    dateFinCouverture: jour(2026, 1, 31),
    dateDiffusionPrevue: jour(2026, 2, 10),
    dateDiffusionReelle: null,
    statut: 'PLANIFIE',
    pointFocal: 'Awa Koné',
    lienPublication: null,
    ...modifications,
  };
}

describe('construireLignesExport', () => {
  it('porte la structure en première colonne', () => {
    // Exigence explicite : le fichier doit dire de quelle structure il parle.
    expect(COLONNES_EXPORT[0].cle).toBe('structure');

    const [ligne] = construireLignesExport([source()]);

    expect(ligne.structure).toBe('Direction des Statistiques Sociales');
    expect(ligne.sigle).toBe('DSS');
  });

  it('formate les dates en JJ/MM/AAAA', () => {
    const [ligne] = construireLignesExport([source()]);

    expect(ligne.debutCouverture).toBe('01/01/2026');
    expect(ligne.finCouverture).toBe('31/01/2026');
    expect(ligne.diffusionPrevue).toBe('10/02/2026');
  });

  it('traduit les statuts et les périodicités', () => {
    const [ligne] = construireLignesExport([
      source({ statut: 'MIS_EN_LIGNE', periodicite: 'TRIMESTRIELLE' }),
    ]);

    expect(ligne.statut).toBe('Mis en ligne');
    expect(ligne.periodicite).toBe('Trimestrielle');
  });

  it('distingue publication et indicateur', () => {
    const [publication] = construireLignesExport([source()]);
    const [indicateur] = construireLignesExport([
      source({ elementType: 'INDICATEUR' }),
    ]);

    expect(publication.type).toBe('Publication');
    expect(indicateur.type).toBe('Indicateur');
  });

  it('remplit les cellules vides par un tiret', () => {
    // Une cellule vide se lit comme un oubli, un tiret comme une absence voulue.
    const [ligne] = construireLignesExport([
      source({ domaine: null, pointFocal: null, lienPublication: null }),
    ]);

    expect(ligne.domaine).toBe('—');
    expect(ligne.pointFocal).toBe('—');
    expect(ligne.lien).toBe('—');
    expect(ligne.diffusionReelle).toBe('—');
  });

  it('affiche la date de diffusion réelle quand elle existe', () => {
    const [ligne] = construireLignesExport([
      source({ dateDiffusionReelle: jour(2026, 2, 12) }),
    ]);

    expect(ligne.diffusionReelle).toBe('12/02/2026');
  });

  it('conserve un statut inconnu plutôt que de le masquer', () => {
    const [ligne] = construireLignesExport([source({ statut: 'NOUVEAU_STATUT' })]);

    expect(ligne.statut).toBe('NOUVEAU_STATUT');
  });

  it('produit une ligne par élément, sans en perdre', () => {
    const lignes = construireLignesExport([source(), source(), source()]);

    expect(lignes).toHaveLength(3);
  });
});

describe('trierLignesExport', () => {
  it('groupe par structure avant de trier par date', () => {
    const lignes = trierLignesExport([
      source({
        structureNom: 'Zone Ouest',
        dateDiffusionPrevue: jour(2026, 1, 5),
      }),
      source({
        structureNom: 'Agriculture',
        dateDiffusionPrevue: jour(2026, 6, 1),
      }),
      source({
        structureNom: 'Agriculture',
        dateDiffusionPrevue: jour(2026, 2, 1),
      }),
    ]);

    expect(lignes.map((l) => l.structureNom)).toEqual([
      'Agriculture',
      'Agriculture',
      'Zone Ouest',
    ]);

    // À l'intérieur d'une structure, l'ordre est chronologique.
    expect(lignes[0].dateDiffusionPrevue.getTime()).toBeLessThan(
      lignes[1].dateDiffusionPrevue.getTime(),
    );
  });

  it('classe les structures selon les règles françaises', () => {
    const lignes = trierLignesExport([
      source({ structureNom: 'Économie' }),
      source({ structureNom: 'Agriculture' }),
      source({ structureNom: 'Éducation' }),
    ]);

    expect(lignes.map((l) => l.structureNom)).toEqual([
      'Agriculture',
      'Économie',
      'Éducation',
    ]);
  });

  it('ne modifie pas le tableau reçu', () => {
    const entree = [
      source({ structureNom: 'Zone' }),
      source({ structureNom: 'Agriculture' }),
    ];
    const copie = [...entree];

    trierLignesExport(entree);

    expect(entree).toEqual(copie);
  });
});

describe('nomFichierExport', () => {
  it('nomme le fichier d’une structure par son sigle', () => {
    expect(nomFichierExport({ annee: 2026, global: false, sigleStructure: 'DSS' })).toBe(
      'calendrier-diffusion-dss-2026.xlsx',
    );
  });

  it('nomme le fichier consolidé « global »', () => {
    expect(nomFichierExport({ annee: 2026, global: true })).toBe(
      'calendrier-diffusion-global-2026.xlsx',
    );
  });

  it('nettoie accents et caractères spéciaux du sigle', () => {
    expect(
      nomFichierExport({ annee: 2026, global: false, sigleStructure: 'DÉM/ÉCO' }),
    ).toBe('calendrier-diffusion-dem-eco-2026.xlsx');
  });

  it('retombe sur « global » sans sigle exploitable', () => {
    expect(nomFichierExport({ annee: 2026, global: false, sigleStructure: null })).toBe(
      'calendrier-diffusion-global-2026.xlsx',
    );
  });

  it('conserve un nom valide si le sigle ne contient que des symboles', () => {
    expect(
      nomFichierExport({ annee: 2026, global: false, sigleStructure: '///' }),
    ).toBe('calendrier-diffusion-structure-2026.xlsx');
  });
});

describe('libellePerimetre', () => {
  it('nomme la structure pour un export unitaire', () => {
    expect(
      libellePerimetre({
        global: false,
        nombreStructures: 1,
        nomStructure: 'Direction A',
      }),
    ).toBe('Structure : Direction A');
  });

  it('accorde le singulier et le pluriel', () => {
    expect(libellePerimetre({ global: true, nombreStructures: 1 })).toBe(
      'Périmètre : 1 structure',
    );
    expect(libellePerimetre({ global: true, nombreStructures: 4 })).toBe(
      'Périmètre : 4 structures',
    );
  });
});
