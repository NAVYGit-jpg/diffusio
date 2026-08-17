import { describe, expect, it } from 'vitest';

import { TOUTES, estConsolide } from './consolidation';

describe('estConsolide', () => {
  it('bascule si toutes les structures sont demandées', () => {
    expect(estConsolide(TOUTES, '2026')).toBe(true);
  });

  it('bascule si toutes les années sont demandées', () => {
    expect(estConsolide('str-1', TOUTES)).toBe(true);
  });

  it('bascule si les deux le sont', () => {
    expect(estConsolide(TOUTES, TOUTES)).toBe(true);
  });

  it('reste sur un calendrier unique sinon', () => {
    // Un calendrier appartient a une structure et a une annee : c'est la seule
    // situation ou generer, soumettre et valider ont un sens.
    expect(estConsolide('str-1', '2026')).toBe(false);
  });

  it('garde la sentinelle sous forme de chaîne', () => {
    // Elle voyage dans l'adresse : toute autre valeur casserait les liens deja
    // partages.
    expect(TOUTES).toBe('TOUTES');
    expect(typeof TOUTES).toBe('string');
  });
});
