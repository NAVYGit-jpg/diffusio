import { describe, expect, it } from 'vitest';

import { jour } from './dates';
import {
  CLASSES_BADGE_STATUT,
  COULEUR_STATUT,
  LIBELLE_STATUT,
  LIBELLE_STATUT_PLURIEL,
  STATUTS_LIGNE,
  classesBadgeStatut,
  libelleStatut,
  statutAffiche,
} from './statuts';

describe('statuts de ligne', () => {
  it('couvre les six statuts du schéma, sans oubli', () => {
    // Ajouter un statut en base sans son libellé afficherait la valeur brute
    // « NOUVEAU_STATUT » à l'utilisateur ; ce test l'interdit.
    for (const statut of STATUTS_LIGNE) {
      expect(LIBELLE_STATUT[statut]).toBeTruthy();
      expect(LIBELLE_STATUT_PLURIEL[statut]).toBeTruthy();
      expect(CLASSES_BADGE_STATUT[statut]).toBeTruthy();
      expect(COULEUR_STATUT[statut]).toBeTruthy();
    }
  });

  it('nomme « Livré » le livrable remis et « Publié » la mise en ligne', () => {
    expect(libelleStatut('TELEVERSE')).toBe('Livré');
    expect(libelleStatut('MIS_EN_LIGNE')).toBe('Publié');
  });

  it('donne un fond ambré au statut livré', () => {
    // Un état intermédiaire, en attente de quelqu'un d'autre.
    expect(classesBadgeStatut('TELEVERSE')).toContain('amber');
  });

  it('donne un fond vert au statut publié', () => {
    expect(classesBadgeStatut('MIS_EN_LIGNE')).toContain('emerald');
  });

  it('affiche un statut inconnu plutôt que de le masquer', () => {
    expect(libelleStatut('STATUT_FUTUR')).toBe('STATUT_FUTUR');
    expect(classesBadgeStatut('STATUT_FUTUR')).toBeTruthy();
  });
});

describe('statutAffiche', () => {
  const aujourdhui = jour(2026, 8, 13);

  it('montre « En retard » une échéance passée restée au statut PLANIFIE', () => {
    // Le statut EN_RETARD n'est ecrit que par la tache nocturne : afficher le
    // statut brut montrerait « Planifié » a cote d'une echeance vieille de six
    // mois, et contredirait le tableau de bord.
    expect(
      statutAffiche(
        { statut: 'PLANIFIE', dateDiffusionPrevue: jour(2026, 2, 10) },
        aujourdhui,
      ),
    ).toBe('EN_RETARD');
  });

  it("laisse « Planifié » une échéance encore à venir", () => {
    expect(
      statutAffiche(
        { statut: 'PLANIFIE', dateDiffusionPrevue: jour(2026, 12, 10) },
        aujourdhui,
      ),
    ).toBe('PLANIFIE');
  });

  it("ne bascule pas le jour même de l'échéance", () => {
    expect(
      statutAffiche(
        { statut: 'PLANIFIE', dateDiffusionPrevue: jour(2026, 8, 13) },
        aujourdhui,
      ),
    ).toBe('PLANIFIE');
  });

  it('ne requalifie jamais une ligne livrée ou publiée', () => {
    // Elle a quitté l'attente pour de bon.
    expect(
      statutAffiche(
        { statut: 'TELEVERSE', dateDiffusionPrevue: jour(2026, 2, 10) },
        aujourdhui,
      ),
    ).toBe('TELEVERSE');
    expect(
      statutAffiche(
        { statut: 'MIS_EN_LIGNE', dateDiffusionPrevue: jour(2026, 2, 10) },
        aujourdhui,
      ),
    ).toBe('MIS_EN_LIGNE');
  });

  it('ne requalifie pas une ligne annulée', () => {
    expect(
      statutAffiche(
        { statut: 'ANNULE', dateDiffusionPrevue: jour(2026, 2, 10) },
        aujourdhui,
      ),
    ).toBe('ANNULE');
  });

  it('accepte une date au format ISO', () => {
    // Les dates arrivent en chaîne depuis un composant serveur.
    expect(
      statutAffiche(
        { statut: 'PLANIFIE', dateDiffusionPrevue: '2026-02-10T00:00:00.000Z' },
        aujourdhui,
      ),
    ).toBe('EN_RETARD');
  });
});
