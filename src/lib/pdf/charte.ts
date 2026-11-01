import 'server-only';

import {
  assombrirJusquAuContraste,
  depuisHex,
  eclaircir,
  versHex,
} from '@/lib/apparence/palette';
import { prisma } from '@/lib/prisma';

/**
 * Visual identity applied to generated PDF documents.
 *
 * Read from the organisation, like the web theme, so a colour changed on the
 * « Apparence » screen reaches the next report without any other step.
 */
export type ChartePdf = {
  nom: string;
  sigle: string;
  slogan: string;
  /** Darkened until white text is legible on it. */
  primaire: string;
  /** Very light tint for table headers and panels. */
  primaireDouce: string;
  /**
   * Second colour of the charter, made legible on white. Used next to the
   * primary one — section titles, the cover band, a second series — so a
   * document never reads as a single colour. The accent (tertiary) stays a
   * touch, not a theme.
   */
  secondaire: string;
  secondaireDouce: string;
  accent: string;
  /** PNG or JPEG bytes; react-pdf renders neither SVG nor WebP. */
  logo: Buffer | null;
};

const FORMATS_IMAGE = ['image/png', 'image/jpeg', 'image/jpg'];

async function logoDepuisAdresse(adresse: string): Promise<Buffer | null> {
  try {
    const reponse = await fetch(adresse, { signal: AbortSignal.timeout(4000) });
    const type = reponse.headers.get('content-type') ?? '';

    if (!reponse.ok || !FORMATS_IMAGE.some((format) => type.startsWith(format))) {
      return null;
    }

    return Buffer.from(await reponse.arrayBuffer());
  } catch {
    // A missing logo must never stop a report.
    return null;
  }
}

export async function chargerChartePdf(organisationId: string): Promise<ChartePdf> {
  const organisation = await prisma.organisation.findUnique({
    where: { id: organisationId },
    select: {
      nom: true,
      sigle: true,
      slogan: true,
      couleurPrimaire: true,
      couleurSecondaire: true,
      couleurAccent: true,
      logoFichier: true,
      logoMimeType: true,
      logoUrl: true,
    },
  });

  const base = depuisHex(organisation?.couleurPrimaire ?? '#1e40af') ?? {
    r: 30,
    v: 64,
    b: 175,
  };

  const second = depuisHex(organisation?.couleurSecondaire ?? '#475569') ?? {
    r: 71,
    v: 85,
    b: 105,
  };

  let logo: Buffer | null = null;

  if (
    organisation?.logoFichier &&
    FORMATS_IMAGE.includes(organisation.logoMimeType ?? '')
  ) {
    logo = Buffer.from(organisation.logoFichier);
  } else if (organisation?.logoUrl) {
    logo = await logoDepuisAdresse(organisation.logoUrl);
  }

  return {
    nom: organisation?.nom ?? 'DIFFUSIO',
    sigle: organisation?.sigle ?? '',
    slogan: organisation?.slogan || 'Calendrier de diffusion statistique',
    primaire: versHex(assombrirJusquAuContraste(base)),
    primaireDouce: versHex(eclaircir(base, 0.9)),
    secondaire: versHex(assombrirJusquAuContraste(second)),
    secondaireDouce: versHex(eclaircir(second, 0.9)),
    accent: organisation?.couleurAccent ?? '#0891b2',
    logo,
  };
}
