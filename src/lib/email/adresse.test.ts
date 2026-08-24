import { afterEach, describe, expect, it, vi } from 'vitest';

import { adresseApplication, adresseQrCode } from './adresse';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('adresseApplication', () => {
  it('prend AUTH_URL quand elle est renseignee', () => {
    vi.stubEnv('AUTH_URL', 'https://diffusio.example');

    expect(adresseApplication()).toBe('https://diffusio.example');
  });

  it('retire la barre oblique finale', () => {
    // Sans quoi les adresses construites porteraient un double slash.
    vi.stubEnv('AUTH_URL', 'https://diffusio.example/');

    expect(adresseApplication()).toBe('https://diffusio.example');
  });

  it('traite une AUTH_URL vide comme absente', () => {
    // C'est le defaut observe en production : « ?? » ne rattrape pas la chaine
    // vide, et les liens d'invitation partaient sans domaine, commencant par
    // une simple barre oblique.
    vi.stubEnv('AUTH_URL', '');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'diffusio-rho.vercel.app');

    expect(adresseApplication()).toBe('https://diffusio-rho.vercel.app');
  });

  it('traite une AUTH_URL faite d’espaces comme absente', () => {
    vi.stubEnv('AUTH_URL', '   ');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'diffusio-rho.vercel.app');

    expect(adresseApplication()).toBe('https://diffusio-rho.vercel.app');
  });

  it('retombe sur la machine locale quand rien n’est declare', () => {
    vi.stubEnv('AUTH_URL', '');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', '');

    expect(adresseApplication()).toBe('http://localhost:3000');
  });
});

describe('adresseQrCode', () => {
  it('construit une adresse absolue', () => {
    // Un client de messagerie va chercher l'image sur internet : un chemin
    // relatif ne resoudrait jamais.
    vi.stubEnv('AUTH_URL', 'https://diffusio.example');

    expect(adresseQrCode('ligne-1')).toBe(
      'https://diffusio.example/api/qr/ligne-1',
    );
  });
});
