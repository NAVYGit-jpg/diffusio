import { describe, expect, it } from 'vitest';

import {
  type IndicateurAffilie,
  type ValeurSaisie,
  analyserListeEmails,
  cheminStockage,
  evaluerCompletude,
  formaterTaille,
  prochaineVersion,
  typeDeFichier,
  validerFichier,
  validerLienPublication,
} from './regles';

describe('typeDeFichier', () => {
  it('reconnait les formats autorises', () => {
    expect(typeDeFichier('rapport.pdf')).toBe('PDF');
    expect(typeDeFichier('donnees.xlsx')).toBe('EXCEL');
    expect(typeDeFichier('donnees.xls')).toBe('EXCEL');
    expect(typeDeFichier('donnees.csv')).toBe('EXCEL');
  });

  it('ignore la casse de l extension', () => {
    expect(typeDeFichier('RAPPORT.PDF')).toBe('PDF');
  });

  it('refuse un format non prevu', () => {
    expect(typeDeFichier('archive.zip')).toBeNull();
    expect(typeDeFichier('script.exe')).toBeNull();
    expect(typeDeFichier('sansextension')).toBeNull();
  });

  it('se fie a la derniere extension d un nom compose', () => {
    // « rapport.pdf.exe » est un executable, pas un PDF.
    expect(typeDeFichier('rapport.pdf.exe')).toBeNull();
  });
});

describe('validerFichier', () => {
  it('accepte un PDF de taille normale', () => {
    expect(validerFichier({ nom: 'rapport.pdf', taille: 2_000_000 })).toEqual([]);
  });

  it('refuse un fichier vide', () => {
    const erreurs = validerFichier({ nom: 'rapport.pdf', taille: 0 });
    expect(erreurs[0].message).toContain('vide');
  });

  it('refuse un fichier trop lourd en annoncant les deux tailles', () => {
    const erreurs = validerFichier({ nom: 'rapport.pdf', taille: 25 * 1024 * 1024 });

    expect(erreurs[0].message).toContain('25.0 Mo');
    expect(erreurs[0].message).toContain('20.0 Mo');
  });

  it('respecte une limite personnalisee', () => {
    expect(
      validerFichier({ nom: 'rapport.pdf', taille: 2_000_000 }, 1_000_000),
    ).toHaveLength(1);
  });

  it('refuse un format non autorise', () => {
    const erreurs = validerFichier({ nom: 'archive.zip', taille: 1000 });
    expect(erreurs[0].message).toContain('.pdf');
  });

  it('n exige rien d autre quand aucun fichier n est choisi', () => {
    expect(validerFichier({ nom: '', taille: 0 })).toHaveLength(1);
  });
});

describe('formaterTaille', () => {
  it('choisit une unite lisible', () => {
    expect(formaterTaille(512)).toBe('512 o');
    expect(formaterTaille(2048)).toBe('2 Ko');
    expect(formaterTaille(5 * 1024 * 1024)).toBe('5.0 Mo');
  });
});

describe('prochaineVersion', () => {
  it('commence a 1 quand rien n existe', () => {
    expect(prochaineVersion([], 'PDF')).toBe(1);
  });

  it('incremente la plus haute version du meme type', () => {
    expect(
      prochaineVersion(
        [
          { type: 'PDF', version: 1 },
          { type: 'PDF', version: 2 },
        ],
        'PDF',
      ),
    ).toBe(3);
  });

  it('numerote chaque type independamment', () => {
    // Remplacer le PDF ne doit pas renumeroter les fichiers Excel.
    const existants = [
      { type: 'PDF' as const, version: 1 },
      { type: 'PDF' as const, version: 2 },
      { type: 'EXCEL' as const, version: 1 },
    ];

    expect(prochaineVersion(existants, 'PDF')).toBe(3);
    expect(prochaineVersion(existants, 'EXCEL')).toBe(2);
  });

  it('reste correct si les versions ne se suivent pas', () => {
    expect(prochaineVersion([{ type: 'PDF', version: 7 }], 'PDF')).toBe(8);
  });
});

describe('cheminStockage', () => {
  const base = {
    organisationId: 'org_1',
    ligneCalendrierId: 'lig_1',
    version: 1,
  };

  it('range par organisation puis par ligne', () => {
    const chemin = cheminStockage({ ...base, nomOriginal: 'rapport.pdf' });

    expect(chemin).toBe('org_1/lig_1/v1-rapport.pdf');
  });

  it('inclut la version pour que deux versions ne se percutent pas', () => {
    const v1 = cheminStockage({ ...base, nomOriginal: 'rapport.pdf' });
    const v2 = cheminStockage({ ...base, version: 2, nomOriginal: 'rapport.pdf' });

    expect(v1).not.toBe(v2);
  });

  it('nettoie accents, espaces et caracteres speciaux', () => {
    const chemin = cheminStockage({
      ...base,
      nomOriginal: 'Bulletin Économique — Janvier (final).pdf',
    });

    expect(chemin).toBe('org_1/lig_1/v1-bulletin-economique-janvier-final.pdf');
  });

  it('neutralise une tentative de remontee de repertoire', () => {
    const chemin = cheminStockage({ ...base, nomOriginal: '../../secret.pdf' });

    expect(chemin).not.toContain('..');
    expect(chemin).toBe('org_1/lig_1/v1-secret.pdf');
  });

  it('conserve un nom utilisable meme si tout est filtre', () => {
    const chemin = cheminStockage({ ...base, nomOriginal: '@@@.pdf' });

    expect(chemin).toBe('org_1/lig_1/v1-fichier.pdf');
  });

  it('tronque un nom demesure', () => {
    const chemin = cheminStockage({ ...base, nomOriginal: `${'a'.repeat(200)}.pdf` });

    expect(chemin.length).toBeLessThan(120);
  });
});

describe('evaluerCompletude — publication', () => {
  const vide = { indicateursAffilies: [], valeurs: [] };

  it('exige le PDF de la publication', () => {
    const etat = evaluerCompletude({
      elementType: 'PUBLICATION',
      fichiers: [],
      ...vide,
    });

    expect(etat.complet).toBe(false);
    expect(etat.messages[0]).toContain('PDF');
  });

  it('se contente du PDF quand il n y a pas d indicateur affilie', () => {
    const etat = evaluerCompletude({
      elementType: 'PUBLICATION',
      fichiers: [{ type: 'PDF' }],
      ...vide,
    });

    expect(etat.complet).toBe(true);
  });

  it('ne considere pas un Excel comme un PDF', () => {
    const etat = evaluerCompletude({
      elementType: 'PUBLICATION',
      fichiers: [{ type: 'EXCEL' }],
      ...vide,
    });

    expect(etat.complet).toBe(false);
  });
});

describe('evaluerCompletude — indicateurs affilies', () => {
  const affilies: IndicateurAffilie[] = [
    { id: 'ind_1', nom: 'Indice des prix' },
    { id: 'ind_2', nom: 'Taux de chômage' },
  ];

  function valeur(modifications: Partial<ValeurSaisie> = {}): ValeurSaisie {
    return {
      indicateurId: 'ind_1',
      valeur: '3.2',
      nonDisponible: false,
      commentaire: '',
      ...modifications,
    };
  }

  it('bloque tant qu un indicateur affilie n est pas renseigne', () => {
    const etat = evaluerCompletude({
      elementType: 'PUBLICATION',
      fichiers: [{ type: 'PDF' }],
      indicateursAffilies: affilies,
      valeurs: [valeur()],
    });

    expect(etat.complet).toBe(false);
    expect(etat.messages.join(' ')).toContain('Taux de chômage');
  });

  it('accepte quand tous les affilies portent une valeur', () => {
    const etat = evaluerCompletude({
      elementType: 'PUBLICATION',
      fichiers: [{ type: 'PDF' }],
      indicateursAffilies: affilies,
      valeurs: [valeur(), valeur({ indicateurId: 'ind_2', valeur: '11.4' })],
    });

    expect(etat.complet).toBe(true);
  });

  it('accepte « non disponible » accompagne d une justification', () => {
    const etat = evaluerCompletude({
      elementType: 'PUBLICATION',
      fichiers: [{ type: 'PDF' }],
      indicateursAffilies: affilies,
      valeurs: [
        valeur(),
        valeur({
          indicateurId: 'ind_2',
          valeur: '',
          nonDisponible: true,
          commentaire: 'Enquête reportée au trimestre suivant.',
        }),
      ],
    });

    expect(etat.complet).toBe(true);
  });

  it('refuse « non disponible » sans justification', () => {
    const etat = evaluerCompletude({
      elementType: 'PUBLICATION',
      fichiers: [{ type: 'PDF' }],
      indicateursAffilies: affilies,
      valeurs: [
        valeur(),
        valeur({ indicateurId: 'ind_2', valeur: '', nonDisponible: true }),
      ],
    });

    expect(etat.complet).toBe(false);
    expect(etat.messages.join(' ')).toContain('Justifiez');
  });

  it('accepte la valeur zero, qui est une valeur', () => {
    const etat = evaluerCompletude({
      elementType: 'PUBLICATION',
      fichiers: [{ type: 'PDF' }],
      indicateursAffilies: [affilies[0]],
      valeurs: [valeur({ valeur: '0' })],
    });

    expect(etat.complet).toBe(true);
  });
});

describe('evaluerCompletude — indicateur autonome', () => {
  it('exige sa valeur propre', () => {
    const etat = evaluerCompletude({
      elementType: 'INDICATEUR',
      fichiers: [],
      indicateursAffilies: [],
      valeurs: [],
    });

    expect(etat.complet).toBe(false);
    expect(etat.messages[0]).toContain('valeur');
  });

  it('n exige aucun PDF', () => {
    const etat = evaluerCompletude({
      elementType: 'INDICATEUR',
      fichiers: [],
      indicateursAffilies: [],
      valeurs: [],
      valeurPropre: {
        indicateurId: 'ind_1',
        valeur: '42',
        nonDisponible: false,
        commentaire: '',
      },
    });

    expect(etat.complet).toBe(true);
  });
});

describe('validerLienPublication', () => {
  it('accepte une adresse https', () => {
    expect(validerLienPublication('https://ins.example.org/bulletin')).toBeNull();
  });

  it('refuse un champ vide', () => {
    expect(validerLienPublication('   ')).toContain('Indiquez le lien');
  });

  it('refuse une adresse sans protocole', () => {
    expect(validerLienPublication('ins.example.org')).toContain('https://');
  });

  it('refuse un protocole dangereux', () => {
    expect(validerLienPublication('javascript:alert(1)')).toContain('http');
  });
});

describe('analyserListeEmails', () => {
  it('accepte les separateurs melanges', () => {
    const { valides } = analyserListeEmails(
      'a@example.org, b@example.org; c@example.org\nd@example.org e@example.org',
    );

    expect(valides).toHaveLength(5);
  });

  it('supprime les doublons sans tenir compte de la casse', () => {
    const { valides } = analyserListeEmails('A@example.org, a@example.org');

    expect(valides).toEqual(['a@example.org']);
  });

  it('separe les adresses invalides au lieu de tout rejeter', () => {
    const { valides, invalides } = analyserListeEmails(
      'bon@example.org, pas-une-adresse, autre@example.org',
    );

    expect(valides).toEqual(['bon@example.org', 'autre@example.org']);
    expect(invalides).toEqual(['pas-une-adresse']);
  });

  it('rend deux listes vides pour une saisie vide', () => {
    expect(analyserListeEmails('   ')).toEqual({ valides: [], invalides: [] });
  });
});
