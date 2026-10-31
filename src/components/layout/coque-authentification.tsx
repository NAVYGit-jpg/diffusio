import type { ReactNode } from 'react';
import { BarChart3, CalendarCheck2, FileDown } from 'lucide-react';

import {
  type IdentiteOrganisation,
  LogoOrganisation,
} from './logo-organisation';

/**
 * Shell shared by the three entry screens (sign-in, account activation, first
 * sign-in).
 *
 * Split layout: a brand panel in the organisation's colours tells the visitor
 * whose tool this is, the form sits on a frosted card. The identity is loaded
 * by each page and handed down — an async child here would put a Suspense
 * boundary in the tree and break hydration ids, as it once did.
 */
export function CoqueAuthentification({
  identite,
  children,
  large = false,
}: {
  identite: IdentiteOrganisation;
  children: ReactNode;
  /** Wider column for the longer first-sign-in form. */
  large?: boolean;
}) {
  return (
    <main className="coque-auth relative grid min-h-svh lg:grid-cols-[1.05fr_1fr]">
      {/* ------------------------------------------------ brand panel */}
      <section
        className="relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between"
        style={{ backgroundImage: 'var(--gradient-primaire)' }}
      >
        <div className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="pointer-events-none absolute -bottom-32 -left-20 size-[28rem] rounded-full bg-black/10 blur-3xl" aria-hidden />

        <div className="relative inline-flex w-fit rounded-2xl bg-white px-5 py-3 shadow-[var(--elevation-3)]">
          <LogoOrganisation identite={identite} hauteur={40} priorite />
        </div>

        <div className="relative max-w-md">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/70">
            {identite.nom}
          </p>
          <h2 className="mt-4 text-4xl font-semibold leading-tight">
            {identite.slogan}
          </h2>
          <ul className="mt-10 space-y-5 text-white/90">
            {[
              { icone: CalendarCheck2, texte: 'Un calendrier de diffusion tenu à jour, structure par structure.' },
              { icone: BarChart3, texte: 'Les échéances, les retards et le taux de respect en un coup d’œil.' },
              { icone: FileDown, texte: 'Des rapports PDF et Excel prêts à transmettre.' },
            ].map(({ icone: Icone, texte }) => (
              <li key={texte} className="flex items-start gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
                  <Icone className="size-4" aria-hidden />
                </span>
                <span className="leading-relaxed">{texte}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/60">DIFFUSIO · Calendrier de diffusion statistique</p>
      </section>

      {/* ------------------------------------------------- form column */}
      <section className="relative flex items-center justify-center overflow-hidden bg-background p-6 sm:p-10">
        <div className="lueurs-ambiantes" aria-hidden />
        <div className={`relative z-10 w-full ${large ? 'max-w-md' : 'max-w-sm'}`}>
          <div className="mb-8 flex justify-center lg:hidden">
            <LogoOrganisation identite={identite} hauteur={40} priorite />
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
