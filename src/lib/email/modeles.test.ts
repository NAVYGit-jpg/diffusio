import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { modeleMiseEnLigne, modeleRappel, modeleRelance } = await import(
  './modeles'
);

const ORGANISATION = {
  nom: 'Institut National de la Statistique',
  sigle: 'INS',
  couleurPrimaire: '#b91c1c',
  logoUrl: null,
};

const COMMUN = {
  organisation: ORGANISATION,
  nomElement: 'Bulletin mensuel des prix',
  nomPointFocal: 'Awa Koné',
  periode: 'Janvier 2026',
  dateDebutCouverture: '01/01/2026',
  dateFinCouverture: '31/01/2026',
};

describe('modeleMiseEnLigne', () => {
  function modele(type: 'PUBLICATION' | 'INDICATEUR' = 'PUBLICATION') {
    return modeleMiseEnLigne({
      ...COMMUN,
      typeProduit: type,
      dateDiffusionPrevue: '10/02/2026',
      dateDiffusionReelle: '12/02/2026',
      lien: 'https://ins.ci/ihpc-janvier',
      qrCodeDataUri: 'data:image/png;base64,AAA',
    });
  }

  it('reprend l’objet demandé', () => {
    expect(modele().sujet).toBe('Mise en ligne de : Bulletin mensuel des prix');
  });

  it('salue le point focal par son nom', () => {
    expect(modele().corpsTexte).toContain('Bonjour Awa Koné,');
    expect(modele().corpsHtml).toContain('Bonjour Awa Koné,');
  });

  it('énonce la période couverte et la date de mise en ligne', () => {
    expect(modele().corpsTexte).toContain(
      'couvrant la période du 01/01/2026 au 31/01/2026',
    );
    expect(modele().corpsTexte).toContain(
      'a été mise en ligne à la date du 12/02/2026',
    );
  });

  it('accorde le participe selon le type de produit', () => {
    // « La publication … a été mise » mais « L'indicateur … a été mis ».
    expect(modele('PUBLICATION').corpsTexte).toContain('a été mise en ligne');
    expect(modele('INDICATEUR').corpsTexte).toContain('a été mis en ligne');
    expect(modele('INDICATEUR').corpsTexte).not.toContain('a été mise en ligne');
  });

  it('rappelle la date prévue et le lien', () => {
    expect(modele().corpsTexte).toContain('Date de publication prévue : 10/02/2026');
    expect(modele().corpsTexte).toContain(
      'Lien de la publication : https://ins.ci/ihpc-janvier',
    );
  });

  it('signe « Cordialement »', () => {
    expect(modele().corpsTexte.trimEnd().endsWith('Cordialement,')).toBe(true);
  });
});

describe('modeleRappel', () => {
  function modele(jours: number, type: 'PUBLICATION' | 'INDICATEUR' = 'PUBLICATION') {
    return modeleRappel({
      ...COMMUN,
      typeProduit: type,
      dateDiffusionPrevue: '10/02/2026',
      joursRestants: jours,
      lien: 'https://diffusio.local/calendrier',
    });
  }

  it('reprend l’objet demandé', () => {
    expect(modele(15).sujet).toBe(
      'Publication imminente : Bulletin mensuel des prix',
    );
  });

  it('annonce la date et le nombre de jours restants', () => {
    expect(modele(15).corpsTexte).toContain(
      'doit être publiée le 10/02/2026 (dans 15 jours)',
    );
  });

  it('accorde le singulier à un jour', () => {
    expect(modele(1).corpsTexte).toContain('(dans 1 jour)');
    expect(modele(1).corpsTexte).not.toContain('(dans 1 jours)');
  });

  it('accorde le participe pour un indicateur', () => {
    expect(modele(5, 'INDICATEUR').corpsTexte).toContain(
      'L’indicateur Bulletin mensuel des prix',
    );
    expect(modele(5, 'INDICATEUR').corpsTexte).toContain('doit être publié le');
  });

  it('reprend la demande exacte', () => {
    expect(modele(10).corpsTexte).toContain(
      'Nous vous prions de nous faire parvenir la publication dans les temps',
    );
  });
});

describe('modeleRelance', () => {
  function modele(jours: number, type: 'PUBLICATION' | 'INDICATEUR' = 'PUBLICATION') {
    return modeleRelance({
      ...COMMUN,
      typeProduit: type,
      dateNonRespectee: '10/02/2026',
      joursDeRetard: jours,
      lien: 'https://diffusio.local/retards',
    });
  }

  it('reprend l’objet demandé', () => {
    expect(modele(3).sujet).toBe(
      'Publication en retard : Bulletin mensuel des prix',
    );
  });

  it('énonce la date manquée et le retard', () => {
    expect(modele(12).corpsTexte).toContain('devait être publiée le 10/02/2026');
    expect(modele(12).corpsTexte).toContain('accuse un retard de 12 jours');
  });

  it('accorde le pronom au type de produit', () => {
    expect(modele(3).corpsTexte).toContain('elle accuse un retard');
    expect(modele(3, 'INDICATEUR').corpsTexte).toContain('il accuse un retard');
  });

  it('accorde le singulier à un jour de retard', () => {
    expect(modele(1).corpsTexte).toContain('un retard de 1 jour.');
  });

  it('reprend la demande exacte', () => {
    expect(modele(4).corpsTexte).toContain(
      'Nous vous prions de nous faire parvenir la publication au plus vite',
    );
  });
});

describe('mise en forme commune', () => {
  it('porte la formule de politesse dans les trois messages', () => {
    const messages = [
      modeleMiseEnLigne({
        ...COMMUN,
        typeProduit: 'PUBLICATION',
        dateDiffusionPrevue: '10/02/2026',
        dateDiffusionReelle: '12/02/2026',
        lien: 'https://ins.ci/x',
        qrCodeDataUri: 'data:image/png;base64,AAA',
      }),
      modeleRappel({
        ...COMMUN,
        typeProduit: 'PUBLICATION',
        dateDiffusionPrevue: '10/02/2026',
        joursRestants: 5,
        lien: 'https://x',
      }),
      modeleRelance({
        ...COMMUN,
        typeProduit: 'PUBLICATION',
        dateNonRespectee: '10/02/2026',
        joursDeRetard: 5,
        lien: 'https://x',
      }),
    ];

    for (const message of messages) {
      expect(message.corpsTexte).toContain(
        'Nous espérons que ce message vous trouve en bonne santé.',
      );
      // Le logo est centré dans l'enveloppe HTML commune.
      expect(message.corpsHtml).toContain('logo-diffusio.png');
    }
  });
});
