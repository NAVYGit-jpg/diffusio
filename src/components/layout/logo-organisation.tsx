import { prisma } from '@/lib/prisma';
import { LogoDiffusio } from './logo-diffusio';

/**
 * Visual identity of the organisation (cahier des charges §9.4).
 *
 * Read once by the page, then handed to plain components. The identity used to
 * be fetched by two `async` components sitting inside the header, which put
 * Suspense boundaries in the middle of it: React then numbered the `useId` of
 * the neighbouring menus differently on the server and on the client, and every
 * page load reported a hydration mismatch it explicitly refuses to patch up.
 */

export type IdentiteOrganisation = {
  nom: string;
  slogan: string;
  /** Ready-to-use image address, or `null` for the DIFFUSIO wordmark. */
  logo: string | null;
};

const SLOGAN_PAR_DEFAUT = 'Calendrier de diffusion statistique';

export async function chargerIdentiteOrganisation(): Promise<IdentiteOrganisation> {
  try {
    const organisation = await prisma.organisation.findFirst({
      where: { deletedAt: null },
      select: { nom: true, slogan: true, logoUrl: true, logoMimeType: true },
    });

    if (!organisation) {
      return { nom: 'DIFFUSIO', slogan: SLOGAN_PAR_DEFAUT, logo: null };
    }

    return {
      nom: organisation.nom,
      slogan: organisation.slogan || SLOGAN_PAR_DEFAUT,
      // Uploaded file first, published address next, DIFFUSIO wordmark last:
      // whoever took the trouble to upload their logo expects to see it.
      logo: organisation.logoMimeType ? '/api/logo' : organisation.logoUrl,
    };
  } catch {
    // An unreachable database must not take the header down with it.
    return { nom: 'DIFFUSIO', slogan: SLOGAN_PAR_DEFAUT, logo: null };
  }
}

export function LogoOrganisation({
  identite,
  hauteur = 28,
  priorite = false,
}: {
  identite: IdentiteOrganisation;
  hauteur?: number;
  priorite?: boolean;
}) {
  if (!identite.logo) {
    return <LogoDiffusio hauteur={hauteur} priorite={priorite} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={identite.logo}
      alt={identite.nom}
      style={{ height: hauteur, width: 'auto' }}
      className="w-auto object-contain"
    />
  );
}

export function SloganOrganisation({
  identite,
  className,
}: {
  identite: IdentiteOrganisation;
  className?: string;
}) {
  return <span className={className}>{identite.slogan}</span>;
}
