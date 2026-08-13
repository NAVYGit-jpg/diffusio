import { prisma } from '@/lib/prisma';
import { LogoDiffusio } from './logo-diffusio';

/**
 * The organisation's wordmark, with the DIFFUSIO one as fallback (§9.4).
 *
 * An uploaded file wins over a published address, which wins over the default:
 * whoever took the trouble to upload their logo expects to see it, not the
 * address they typed months ago.
 *
 * A server component, so the right image is in the first paint — resolving it
 * in React would flash the default logo on every navigation.
 */
export async function LogoOrganisation({
  hauteur = 28,
  priorite = false,
}: {
  hauteur?: number;
  priorite?: boolean;
}) {
  let organisation: { nom: string; logoUrl: string | null; logoMimeType: string | null } | null =
    null;

  try {
    organisation = await prisma.organisation.findFirst({
      where: { deletedAt: null },
      select: { nom: true, logoUrl: true, logoMimeType: true },
    });
  } catch {
    // An unreachable database must not take the header down with it.
  }

  const source = organisation?.logoMimeType
    ? '/api/logo'
    : (organisation?.logoUrl ?? null);

  if (!source) {
    return <LogoDiffusio hauteur={hauteur} priorite={priorite} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={source}
      alt={organisation?.nom ?? 'Logo'}
      style={{ height: hauteur, width: 'auto' }}
      className="w-auto object-contain"
    />
  );
}

/** The organisation's tagline, editable by the super admin (§9.4). */
export async function SloganOrganisation({
  className,
}: {
  className?: string;
}) {
  let slogan = 'Calendrier de diffusion statistique';

  try {
    const organisation = await prisma.organisation.findFirst({
      where: { deletedAt: null },
      select: { slogan: true },
    });

    if (organisation?.slogan) {
      slogan = organisation.slogan;
    }
  } catch {
    // Falls back to the default wording.
  }

  return <span className={className}>{slogan}</span>;
}
