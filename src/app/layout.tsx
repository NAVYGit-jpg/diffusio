import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import './globals.css';
import { FournisseurTheme } from '@/components/layout/fournisseur-theme';
import {
  REGLAGES_PAR_DEFAUT,
  adresseGoogleFonts,
  variablesCss,
} from '@/lib/apparence/theme';
import { prisma } from '@/lib/prisma';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: {
    default: 'DIFFUSIO — Calendrier de diffusion statistique',
    template: '%s',
  },
  description:
    'Application collaborative de suivi du calendrier de diffusion statistique : catalogue des publications, génération du calendrier, relances et livrables.',
  icons: { icon: '/icone-diffusio.png', apple: '/icone-diffusio.png' },
};

/**
 * Organisation colours, injected as CSS variables (cahier des charges §9.4).
 *
 * Read here rather than in each screen so a change made by the super admin is
 * immediately visible everywhere, sign-in page included. Falls back to the
 * defaults when the database is unreachable: an unstyled application is better
 * than none at all.
 */
async function apparenceOrganisation(): Promise<{
  variables: Record<string, string>;
  police: string;
}> {
  try {
    const organisation = await prisma.organisation.findFirst({
      where: { deletedAt: null },
      select: {
        couleurPrimaire: true,
        couleurSecondaire: true,
        couleurAccent: true,
        couleurFond: true,
        couleurBouton: true,
        police: true,
        styleInterface: true,
        densiteInterface: true,
        radiusInterface: true,
      },
    });

    if (!organisation) {
      return {
        variables: variablesCss(REGLAGES_PAR_DEFAUT),
        police: REGLAGES_PAR_DEFAUT.police,
      };
    }

    return {
      variables: variablesCss(organisation),
      police: organisation.police,
    };
  } catch {
    return {
      variables: variablesCss(REGLAGES_PAR_DEFAUT),
      police: REGLAGES_PAR_DEFAUT.police,
    };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { variables, police } = await apparenceOrganisation();
  const feuillePolice = adresseGoogleFonts(police);

  return (
    // `suppressHydrationWarning`: next-themes writes the theme class on <html>
    // before React hydrates, which React would otherwise report as a mismatch.
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Only when the chosen font is not already bundled: asking Google for
            a font we ship ourselves would be a needless external request. */}
        {feuillePolice && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link
              rel="preconnect"
              href="https://fonts.gstatic.com"
              crossOrigin=""
            />
            <link rel="stylesheet" href={feuillePolice} />
          </>
        )}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={variables as React.CSSProperties}
      >
        <FournisseurTheme>{children}</FournisseurTheme>
      </body>
    </html>
  );
}
