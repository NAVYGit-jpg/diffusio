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
  secondaire: '#334155',
  secondaireDouce: '#eef0f3',
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

describe('rapport du tableau de bord', () => {
  it('rend toutes les sections : courbe, répartitions, échéances, liste', async () => {
    const indicateurs = await import('@/lib/tableau-bord/indicateurs');
    const { genererRapportTableauDeBordPdf } = await import('./rapport-tableau-de-bord');
    const maintenant = jour(2026, 6, 15);
    const lignes = [1, 2, 3, 4, 5, 6, 7, 8].map((mois) => ({
      id: `l${mois}`,
      structureId: 's1',
      structureNom: 'Direction de la conjoncture',
      domaine: 'Prix',
      periodicite: 'MENSUELLE',
      elementType: 'PUBLICATION' as const,
      dateDiffusionPrevue: jour(2026, mois, 20),
      dateDiffusionReelle: mois < 4 ? jour(2026, mois, 22) : null,
      statut: mois < 4 ? 'MIS_EN_LIGNE' : mois === 4 ? 'TELEVERSE' : 'PLANIFIE',
      retardPublie: null,
      nomElement: 'Indice des prix',
      libellePeriode: `Mois ${mois}`,
    }));

    const pdf = await genererRapportTableauDeBordPdf(
      {
        annee: 2026,
        periode: 'Année 2026',
        perimetre: 'DC',
        filtresLisibles: [],
        contexte: {
          lignes,
          structures: [{ id: 's1', nom: 'Direction de la conjoncture', sigle: 'DC' }],
          domaines: [],
          catalogue: { publications: 3, indicateurs: 5 },
          anneesDisponibles: [2026],
          classementVisible: true,
        },
        lignes,
        respect: indicateurs.tauxRespect(lignes, maintenant),
        retards: indicateurs.statistiquesRetard(lignes, maintenant),
        echeances: indicateurs.prochainesEcheances(lignes, maintenant),
        etat: indicateurs.etatRetards(lignes, maintenant),
        nombres: indicateurs.compteurs(lignes, maintenant),
        avancement: indicateurs.avancementAnnee(lignes),
        courbe: indicateurs.evolutionMensuelle(lignes, 2026, maintenant, []),
        classement: indicateurs.classementStructures(lignes, maintenant),
        parDomaine: indicateurs.repartition(lignes, (ligne) => ligne.domaine ?? '—'),
        parPeriodicite: indicateurs.repartition(lignes, (ligne) => ligne.periodicite),
        parStructure: indicateurs.repartition(lignes, (ligne) => ligne.structureNom),
        parType: indicateurs.repartition(lignes, (ligne) => ligne.elementType),
        commentaire: [],
        genereLe: maintenant,
      },
      charte,
      'Élie N’Douba',
    );

    expect(enTetePdf(pdf)).toBe('%PDF-');
  }, 30_000);
});
