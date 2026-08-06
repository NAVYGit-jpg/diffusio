import { describe, expect, it } from 'vitest';

import {
  type NoeudPlat,
  aplatir,
  construireArborescence,
  creeraitUnCycle,
  descendants,
  parentsPossibles,
} from './arborescence';

function s(
  id: string,
  nom: string,
  parentId: string | null = null,
): NoeudPlat {
  return { id, nom, sigle: id.toUpperCase(), code: id, parentId, actif: true };
}

/**
 *  ministere
 *    ├── direction-a
 *    │     ├── service-1
 *    │     └── service-2
 *    └── direction-b
 */
const HIERARCHIE: NoeudPlat[] = [
  s('ministere', 'Ministère du Plan'),
  s('direction-a', 'Direction A', 'ministere'),
  s('direction-b', 'Direction B', 'ministere'),
  s('service-1', 'Service 1', 'direction-a'),
  s('service-2', 'Service 2', 'direction-a'),
];

describe('construireArborescence', () => {
  it('imbrique les structures et calcule la profondeur', () => {
    const racines = construireArborescence(HIERARCHIE);

    expect(racines).toHaveLength(1);
    expect(racines[0].id).toBe('ministere');
    expect(racines[0].profondeur).toBe(0);
    expect(racines[0].enfants.map((e) => e.id)).toEqual([
      'direction-a',
      'direction-b',
    ]);
    expect(racines[0].enfants[0].profondeur).toBe(1);
    expect(racines[0].enfants[0].enfants[0].profondeur).toBe(2);
  });

  it('trie les fratries par nom, selon les regles francaises', () => {
    const racines = construireArborescence([
      s('a', 'Économie'),
      s('b', 'Agriculture'),
      s('c', 'Éducation'),
    ]);

    expect(racines.map((r) => r.nom)).toEqual([
      'Agriculture',
      'Économie',
      'Éducation',
    ]);
  });

  it('remonte en racine une structure dont le parent est absent', () => {
    // Cas reel : le parent a ete supprime logiquement et n'est plus charge.
    const racines = construireArborescence([s('orphelin', 'Orphelin', 'disparu')]);

    expect(racines).toHaveLength(1);
    expect(racines[0].id).toBe('orphelin');
    expect(racines[0].profondeur).toBe(0);
  });

  it('ne perd aucune structure en cas de cycle dans les donnees', () => {
    // a -> b -> a : personne n'est joignable depuis une racine.
    const cycle: NoeudPlat[] = [s('a', 'A', 'b'), s('b', 'B', 'a')];

    const aplati = aplatir(construireArborescence(cycle));

    expect(aplati.map((n) => n.id).sort()).toEqual(['a', 'b']);
  });

  it('detache seulement les structures prises dans le cycle', () => {
    // enfant -> a -> b -> a : « enfant » n'est pas dans la boucle, il doit
    // conserver son parent au lieu d'etre remonte en racine.
    const donnees: NoeudPlat[] = [
      s('a', 'A', 'b'),
      s('b', 'B', 'a'),
      s('enfant', 'Enfant', 'a'),
    ];

    const racines = construireArborescence(donnees);
    const aplati = aplatir(racines);

    expect(aplati.map((n) => n.id).sort()).toEqual(['a', 'b', 'enfant']);
    expect(racines.map((r) => r.id).sort()).toEqual(['a', 'b']);

    const a = racines.find((r) => r.id === 'a')!;
    expect(a.enfants.map((e) => e.id)).toEqual(['enfant']);
  });

  it("ignore une structure qui se declare son propre parent", () => {
    const racines = construireArborescence([s('boucle', 'Boucle', 'boucle')]);

    expect(racines).toHaveLength(1);
    expect(racines[0].id).toBe('boucle');
    expect(racines[0].enfants).toHaveLength(0);
  });

  it('rend une liste vide sans structure', () => {
    expect(construireArborescence([])).toEqual([]);
  });
});

describe('aplatir', () => {
  it('rend les parents avant leurs enfants', () => {
    const ordre = aplatir(construireArborescence(HIERARCHIE)).map((n) => n.id);

    expect(ordre).toEqual([
      'ministere',
      'direction-a',
      'service-1',
      'service-2',
      'direction-b',
    ]);
  });
});

describe('descendants', () => {
  it('rend toute la descendance, sur plusieurs niveaux', () => {
    expect([...descendants(HIERARCHIE, 'ministere')].sort()).toEqual([
      'direction-a',
      'direction-b',
      'service-1',
      'service-2',
    ]);
  });

  it("n'inclut jamais la structure elle-meme", () => {
    expect(descendants(HIERARCHIE, 'direction-a').has('direction-a')).toBe(false);
  });

  it('rend un ensemble vide pour une feuille', () => {
    expect(descendants(HIERARCHIE, 'service-1').size).toBe(0);
  });

  it('ne boucle pas indefiniment sur des donnees cycliques', () => {
    const cycle: NoeudPlat[] = [s('a', 'A', 'b'), s('b', 'B', 'a')];

    expect([...descendants(cycle, 'a')].sort()).toEqual(['a', 'b']);
  });
});

describe('creeraitUnCycle', () => {
  it('autorise le passage en racine', () => {
    expect(creeraitUnCycle(HIERARCHIE, 'direction-a', null)).toBe(false);
  });

  it('refuse une structure comme son propre parent', () => {
    expect(creeraitUnCycle(HIERARCHIE, 'direction-a', 'direction-a')).toBe(true);
  });

  it('refuse de rattacher un parent sous son propre enfant', () => {
    // Deplacer le ministere sous une de ses directions couperait tout l'arbre.
    expect(creeraitUnCycle(HIERARCHIE, 'ministere', 'direction-a')).toBe(true);
  });

  it('refuse un rattachement sous un descendant indirect', () => {
    expect(creeraitUnCycle(HIERARCHIE, 'ministere', 'service-1')).toBe(true);
  });

  it('autorise un deplacement lateral', () => {
    expect(creeraitUnCycle(HIERARCHIE, 'service-1', 'direction-b')).toBe(false);
  });
});

describe('parentsPossibles', () => {
  it('exclut la structure elle-meme et toute sa descendance', () => {
    const possibles = parentsPossibles(HIERARCHIE, 'direction-a').map((p) => p.id);

    expect(possibles).toEqual(['ministere', 'direction-b']);
  });

  it('propose toutes les structures pour une creation', () => {
    expect(parentsPossibles(HIERARCHIE, null)).toHaveLength(HIERARCHIE.length);
  });

  it('propose toutes les autres structures pour une feuille', () => {
    expect(parentsPossibles(HIERARCHIE, 'service-2')).toHaveLength(
      HIERARCHIE.length - 1,
    );
  });
});
