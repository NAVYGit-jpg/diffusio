import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { jour } from '@/lib/calendrier/dates';
import type { ChartePdf } from './charte';
import { genererCataloguePdf } from './catalogue';
import { genererCalendrierPdf } from './calendrier';

const charte: ChartePdf = {
  nom: 'Agence Nationale de la Statistique',
  sigle: 'ANSTAT',
  slogan: 'Décider par les chiffres',
  primaire: '#7c7917',
  primaireDouce: '#f8f7e4',
  accent: '#0891b2',
  logo: null,
};

const enTetePdf = (tampon: Buffer) => tampon.subarray(0, 5).toString('latin1');

describe('documents PDF composés à partir des données', () => {
  it('produit le catalogue, accents compris', async () => {
    const pdf = await genererCataloguePdf(
      [
        { type: 'PUBLICATION', nom: 'Indice harmonisé des prix à la consommation', structure: 'DSS', domaine: 'Prix', periodicite: 'MENSUELLE', delaiJours: 20, actif: true },
        { type: 'INDICATEUR', nom: 'Taux d’inflation', structure: 'DSS', domaine: 'Prix', periodicite: 'MENSUELLE', delaiJours: 20, actif: true, unite: '%' },
      ],
      charte,
      'Élie N’Douba',
    );

    expect(enTetePdf(pdf)).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(3000);
  }, 30_000);

  it('produit le calendrier en paysage', async () => {
    const pdf = await genererCalendrierPdf(
      [
        {
          structureNom: 'Direction des statistiques sociales',
          structureSigle: 'DSS',
          elementType: 'PUBLICATION',
          nomElement: 'Bulletin mensuel des prix',
          domaine: 'Prix',
          periodicite: 'MENSUELLE',
          libellePeriode: 'Janvier 2026',
          dateDebutCouverture: jour(2026, 1, 1),
          dateFinCouverture: jour(2026, 1, 31),
          dateDiffusionPrevue: jour(2026, 2, 20),
          dateDiffusionReelle: null,
          statut: 'PLANIFIE',
          pointFocal: 'Awa Koné',
          lienPublication: null,
        },
      ],
      charte,
      2026,
      'Direction des statistiques sociales',
      'Élie N’Douba',
    );

    expect(enTetePdf(pdf)).toBe('%PDF-');
  }, 30_000);
});
