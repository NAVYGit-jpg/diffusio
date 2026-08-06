import { describe, expect, it } from 'vitest';

import {
  type Transition,
  peutModifierLignes,
  raisonVerrouillage,
  statutApres,
  transitionAutorisee,
  transitionsPossibles,
} from './workflow';

describe('transitionAutorisee — soumission', () => {
  it('permet au point focal de soumettre un brouillon', () => {
    expect(transitionAutorisee('soumettre', 'BROUILLON', 'POINT_FOCAL')).toBe(true);
  });

  it('interdit de soumettre deux fois', () => {
    expect(transitionAutorisee('soumettre', 'SOUMIS', 'POINT_FOCAL')).toBe(false);
  });

  it('interdit de soumettre un calendrier deja valide', () => {
    expect(transitionAutorisee('soumettre', 'VALIDE', 'POINT_FOCAL')).toBe(false);
  });
});

describe('transitionAutorisee — validation', () => {
  it('permet a un administrateur de valider un calendrier soumis', () => {
    expect(transitionAutorisee('valider', 'SOUMIS', 'ADMIN')).toBe(true);
    expect(transitionAutorisee('valider', 'SOUMIS', 'SUPER_ADMIN')).toBe(true);
  });

  it('interdit au point focal de valider son propre calendrier', () => {
    // Regle centrale du paragraphe 2.3 : on ne valide pas son propre travail.
    expect(transitionAutorisee('valider', 'SOUMIS', 'POINT_FOCAL')).toBe(false);
  });

  it('interdit de valider un calendrier qui n a pas ete soumis', () => {
    expect(transitionAutorisee('valider', 'BROUILLON', 'ADMIN')).toBe(false);
  });

  it('interdit de valider deux fois', () => {
    expect(transitionAutorisee('valider', 'VALIDE', 'ADMIN')).toBe(false);
  });
});

describe('transitionAutorisee — renvoi et deblocage', () => {
  it('permet a un administrateur de renvoyer un calendrier soumis', () => {
    expect(transitionAutorisee('renvoyerPourCorrection', 'SOUMIS', 'ADMIN')).toBe(
      true,
    );
  });

  it('interdit au point focal de renvoyer son calendrier', () => {
    expect(
      transitionAutorisee('renvoyerPourCorrection', 'SOUMIS', 'POINT_FOCAL'),
    ).toBe(false);
  });

  it('permet a un administrateur de rouvrir un calendrier valide', () => {
    expect(transitionAutorisee('debloquer', 'VALIDE', 'ADMIN')).toBe(true);
  });

  it('interdit au point focal de rouvrir lui-meme un calendrier valide', () => {
    expect(transitionAutorisee('debloquer', 'VALIDE', 'POINT_FOCAL')).toBe(false);
  });

  it('permet au point focal de demander une autorisation de modification', () => {
    expect(transitionAutorisee('demanderDeblocage', 'VALIDE', 'POINT_FOCAL')).toBe(
      true,
    );
  });

  it('ne propose pas la demande de deblocage sur un brouillon', () => {
    expect(
      transitionAutorisee('demanderDeblocage', 'BROUILLON', 'POINT_FOCAL'),
    ).toBe(false);
  });

  it("n'a pas de sens pour un administrateur, qui debloque directement", () => {
    expect(transitionAutorisee('demanderDeblocage', 'VALIDE', 'ADMIN')).toBe(false);
  });
});

describe('statutApres', () => {
  const attendus: [Transition, Parameters<typeof statutApres>[1], string][] = [
    ['soumettre', 'BROUILLON', 'SOUMIS'],
    ['valider', 'SOUMIS', 'VALIDE'],
    ['renvoyerPourCorrection', 'SOUMIS', 'BROUILLON'],
    ['debloquer', 'VALIDE', 'BROUILLON'],
  ];

  it.each(attendus)('%s depuis %s donne %s', (transition, depuis, vers) => {
    expect(statutApres(transition, depuis)).toBe(vers);
  });

  it('laisse le statut inchange pour une demande de deblocage', () => {
    // La demande leve un drapeau, elle ne fait pas avancer la machine a etats.
    expect(statutApres('demanderDeblocage', 'VALIDE')).toBe('VALIDE');
  });
});

describe('transitionsPossibles', () => {
  it('propose la seule soumission au point focal sur un brouillon', () => {
    expect(transitionsPossibles('BROUILLON', 'POINT_FOCAL')).toEqual(['soumettre']);
  });

  it('ne propose rien au point focal pendant la validation', () => {
    expect(transitionsPossibles('SOUMIS', 'POINT_FOCAL')).toEqual([]);
  });

  it('propose la demande de deblocage au point focal sur un calendrier valide', () => {
    expect(transitionsPossibles('VALIDE', 'POINT_FOCAL')).toEqual([
      'demanderDeblocage',
    ]);
  });

  it('propose validation et renvoi a l administrateur sur un calendrier soumis', () => {
    expect(transitionsPossibles('SOUMIS', 'ADMIN').sort()).toEqual([
      'renvoyerPourCorrection',
      'valider',
    ]);
  });

  it('propose le deblocage a l administrateur sur un calendrier valide', () => {
    expect(transitionsPossibles('VALIDE', 'SUPER_ADMIN')).toEqual(['debloquer']);
  });
});

describe('peutModifierLignes', () => {
  it('laisse le point focal editer son brouillon', () => {
    expect(peutModifierLignes('BROUILLON', 'POINT_FOCAL')).toBe(true);
  });

  it('verrouille des la soumission pour le point focal', () => {
    // Modifier le contenu pendant l'examen viderait la validation de son sens.
    expect(peutModifierLignes('SOUMIS', 'POINT_FOCAL')).toBe(false);
  });

  it('verrouille un calendrier valide pour le point focal', () => {
    expect(peutModifierLignes('VALIDE', 'POINT_FOCAL')).toBe(false);
  });

  it('laisse les administrateurs modifier a tout moment', () => {
    for (const statut of ['BROUILLON', 'SOUMIS', 'VALIDE'] as const) {
      expect(peutModifierLignes(statut, 'ADMIN')).toBe(true);
      expect(peutModifierLignes(statut, 'SUPER_ADMIN')).toBe(true);
    }
  });
});

describe('raisonVerrouillage', () => {
  it('ne dit rien quand la modification est permise', () => {
    expect(raisonVerrouillage('BROUILLON', 'POINT_FOCAL')).toBeNull();
    expect(raisonVerrouillage('VALIDE', 'ADMIN')).toBeNull();
  });

  it('explique le verrouillage pendant la validation', () => {
    expect(raisonVerrouillage('SOUMIS', 'POINT_FOCAL')).toContain(
      'en cours de validation',
    );
  });

  it('indique la marche a suivre sur un calendrier valide', () => {
    expect(raisonVerrouillage('VALIDE', 'POINT_FOCAL')).toContain(
      'autorisation de modification',
    );
  });
});
