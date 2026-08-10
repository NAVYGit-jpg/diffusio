import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import './globals.css';
import { FournisseurTheme } from '@/components/layout/fournisseur-theme';
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
async function couleursOrganisation(): Promise<Record<string, string>> {
  try {
    const organisation = await prisma.organisation.findFirst({
      where: { deletedAt: null },
      select: {
        couleurPrimaire: true,
        couleurSecondaire: true,
        couleurAccent: true,
        radiusInterface: true,
      },
    });

    if (!organisation) {
      return {};
    }

    return {
      '--couleur-primaire': organisation.couleurPrimaire,
      '--couleur-secondaire': organisation.couleurSecondaire,
      '--couleur-accent': organisation.couleurAccent,
      '--radius': `${organisation.radiusInterface}rem`,
    };
  } catch {
    return {};
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const couleurs = await couleursOrganisation();

  return (
    // `suppressHydrationWarning`: next-themes writes the theme class on <html>
    // before React hydrates, which React would otherwise report as a mismatch.
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={couleurs as React.CSSProperties}
      >
        <FournisseurTheme>{children}</FournisseurTheme>
      </body>
    </html>
  );
}
