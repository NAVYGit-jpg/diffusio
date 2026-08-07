'use client';

import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';

/**
 * Light / dark mode (cahier des charges §9.4).
 *
 * `attribute="class"` matches the `dark:` variants Tailwind and shadcn/ui
 * already use. The preference is stored per browser: it belongs to the person
 * and their screen, not to the organisation — unlike the colours, which the
 * super admin sets for everybody.
 */
export function FournisseurTheme({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
