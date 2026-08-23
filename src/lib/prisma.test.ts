import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Le client est construit a la premiere utilisation, pas au chargement du
 * module. Next.js importe chaque route pour collecter ses donnees de page :
 * un client construit trop tot faisait echouer le deploiement sur une variable
 * dont la machine de construction n'a pas l'usage, faute de jamais se
 * connecter. Ces deux tests tiennent la distinction.
 */

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  delete (globalThis as { prisma?: unknown }).prisma;
});

describe('client Prisma', () => {
  it('ne construit rien au chargement du module', async () => {
    vi.stubEnv('DATABASE_URL', '');

    await expect(import('./prisma')).resolves.toBeDefined();
  });

  it('signale l’absence de DATABASE_URL a la premiere utilisation', async () => {
    vi.stubEnv('DATABASE_URL', '');

    const { prisma } = await import('./prisma');

    expect(() => prisma.utilisateur).toThrowError(/DATABASE_URL/);
  });

  it('construit le client des que l’adresse est renseignee', async () => {
    // Adresse volontairement injoignable : construire un client n'ouvre aucune
    // connexion, celle-ci n'a lieu qu'a la premiere requete.
    vi.stubEnv('DATABASE_URL', 'postgresql://u:p@hote.invalid:5432/db');

    const { prisma } = await import('./prisma');

    expect(prisma.utilisateur).toBeDefined();
  });
});
