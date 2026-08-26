import { describe, expect, it } from 'vitest';

import {
  type ActeurSession,
  type Action,
  PermissionRefusee,
  assertPermission,
  canAccessStructure,
  perimetreStructures,
  peutRealiser,
} from './permissions';

const STRUCTURE_A = 'str_aaa';
const STRUCTURE_B = 'str_bbb';
const STRUCTURE_C = 'str_ccc';

const superAdmin: ActeurSession = {
  id: 'u_super',
  role: 'SUPER_ADMIN',
  structureId: null,
  structuresAdmin: [],
};

const admin: ActeurSession = {
  id: 'u_admin',
  role: 'ADMIN',
  structureId: null,
  structuresAdmin: [STRUCTURE_A, STRUCTURE_B],
};

const pointFocal: ActeurSession = {
  id: 'u_pf',
  role: 'POINT_FOCAL',
  structureId: STRUCTURE_A,
  structuresAdmin: [],
};

describe('canAccessStructure', () => {
  it('autorise le super admin sur toutes les structures', () => {
    expect(canAccessStructure(superAdmin, STRUCTURE_A)).toBe(true);
    expect(canAccessStructure(superAdmin, STRUCTURE_C)).toBe(true);
  });

  it("limite l'admin aux structures qui lui sont affectees", () => {
    expect(canAccessStructure(admin, STRUCTURE_A)).toBe(true);
    expect(canAccessStructure(admin, STRUCTURE_B)).toBe(true);
    expect(canAccessStructure(admin, STRUCTURE_C)).toBe(false);
  });

  it('limite le point focal a sa seule structure', () => {
    expect(canAccessStructure(pointFocal, STRUCTURE_A)).toBe(true);
    expect(canAccessStructure(pointFocal, STRUCTURE_B)).toBe(false);
  });

  it('refuse un identifiant de structure vide, quel que soit le role', () => {
    expect(canAccessStructure(superAdmin, '')).toBe(false);
    expect(canAccessStructure(admin, '')).toBe(false);
    expect(canAccessStructure(pointFocal, '')).toBe(false);
  });

  it("refuse un point focal sans structure rattachee", () => {
    const orphelin: ActeurSession = { ...pointFocal, structureId: null };
    expect(canAccessStructure(orphelin, STRUCTURE_A)).toBe(false);
  });
});

describe('matrice de la section 2.3', () => {
  // Chaque ligne du tableau du cahier des charges, transcrite telle quelle.
  const attendu: Array<[Action, boolean, boolean, boolean]> = [
    // action, SUPER_ADMIN, ADMIN, POINT_FOCAL
    ['structure:gerer', true, false, false],
    ['pointFocal:gerer', true, true, false],
    ['admin:gerer', true, false, false],
    ['superAdmin:gerer', true, false, false],
    ['apparence:gerer', true, false, false],
    ['referentiel:gerer', true, false, false],
    ['structure:lire', true, true, true],
    ['catalogue:ecrire', true, true, true],
    ['calendrier:generer', true, true, true],
    ['calendrier:valider', true, true, false],
    ['calendrier:modifierValide', true, true, false],
    ['livrable:televerser', true, true, true],
    ['miseEnLigne:confirmer', true, true, false],
    ['alerte:envoyer', true, true, false],
    ['messagerie:utiliser', true, true, true],
    ['tableauDeBord:lire', true, true, true],
    ['audit:lire', true, true, false],
  ];

  it.each(attendu)(
    '%s -> super=%s admin=%s pointFocal=%s',
    (action, attSuper, attAdmin, attPf) => {
      expect(peutRealiser(superAdmin, action)).toBe(attSuper);
      expect(peutRealiser(admin, action)).toBe(attAdmin);
      expect(peutRealiser(pointFocal, action)).toBe(attPf);
    },
  );
});

describe('assertPermission', () => {
  it('ne leve rien quand le role et le perimetre conviennent', () => {
    expect(() =>
      assertPermission(admin, 'calendrier:valider', STRUCTURE_A),
    ).not.toThrow();
  });

  it('leve quand le role ne suffit pas', () => {
    expect(() =>
      assertPermission(pointFocal, 'calendrier:valider', STRUCTURE_A),
    ).toThrow(PermissionRefusee);
  });

  it('leve quand le role convient mais pas le perimetre', () => {
    expect(() =>
      assertPermission(admin, 'calendrier:valider', STRUCTURE_C),
    ).toThrow(PermissionRefusee);
  });

  it("empeche un point focal de valider le calendrier de sa propre structure", () => {
    // Piege classique : le perimetre est bon, le role ne l'est pas.
    expect(() =>
      assertPermission(pointFocal, 'calendrier:valider', STRUCTURE_A),
    ).toThrow(PermissionRefusee);
  });

  it('ne divulgue aucun detail technique dans le message', () => {
    try {
      assertPermission(pointFocal, 'admin:gerer');
      expect.unreachable('aurait du lever');
    } catch (erreur) {
      expect(erreur).toBeInstanceOf(PermissionRefusee);
      const message = (erreur as PermissionRefusee).message;
      expect(message).toBe(
        "Vous n'avez pas les droits nécessaires pour effectuer cette action.",
      );
      expect(message).not.toContain('admin:gerer');
    }
  });

  it('verifie le perimetre meme pour une action ouverte a tous', () => {
    expect(() =>
      assertPermission(pointFocal, 'livrable:televerser', STRUCTURE_B),
    ).toThrow(PermissionRefusee);
  });
});

describe('perimetreStructures', () => {
  it('rend null pour le super admin : aucune restriction', () => {
    // null et [] ne veulent surtout pas dire la meme chose : [] masquerait tout.
    expect(perimetreStructures(superAdmin)).toBeNull();
  });

  it('rend les structures affectees pour un admin', () => {
    expect(perimetreStructures(admin)).toEqual([STRUCTURE_A, STRUCTURE_B]);
  });

  it('rend la seule structure du point focal', () => {
    expect(perimetreStructures(pointFocal)).toEqual([STRUCTURE_A]);
  });

  it('rend une liste vide pour un point focal sans structure', () => {
    expect(perimetreStructures({ ...pointFocal, structureId: null })).toEqual([]);
  });

  it("rend une liste vide pour un admin sans affectation", () => {
    expect(perimetreStructures({ ...admin, structuresAdmin: [] })).toEqual([]);
  });
});

describe('création de compte réservée au centre', () => {
  // Un administrateur suit et corrige les points focaux de ses structures ;
  // ouvrir un acces a l'application est autre chose. Les deux permissions sont
  // distinctes exprès, et cette distinction est une frontiere de securite : la
  // masquer a l'ecran ne suffirait pas, une action serveur s'appelle
  // directement.

  it('le super administrateur peut créer un compte', () => {
    expect(peutRealiser(superAdmin, 'utilisateur:creer')).toBe(true);
  });

  it('l’administrateur ne peut pas créer de compte', () => {
    expect(peutRealiser(admin, 'utilisateur:creer')).toBe(false);
  });

  it('le point focal non plus', () => {
    expect(peutRealiser(pointFocal, 'utilisateur:creer')).toBe(false);
  });

  it('l’administrateur garde la gestion des comptes existants', () => {
    // Sans quoi il ne verrait plus ses points focaux du tout.
    expect(peutRealiser(admin, 'pointFocal:gerer')).toBe(true);
  });

  it('refuse l’action au lieu de la laisser passer silencieusement', () => {
    expect(() => assertPermission(admin, 'utilisateur:creer')).toThrow(
      PermissionRefusee,
    );
  });
});
