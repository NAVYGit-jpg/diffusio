'use client';

import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { type ReglagesApparence, variablesCss } from '@/lib/apparence/theme';
import { cn } from '@/lib/utils';

/**
 * Theme chooser of the super administrator (cahier des charges §9.4).
 *
 * Curated palettes for a one-click choice, free colour pickers for a charter
 * of one's own, and a live preview: every change is written on <body> at once,
 * so the whole interface — not a thumbnail — shows the result before saving.
 * The chosen colours travel with the form under the field names the save
 * action already reads.
 */

type Couleurs = { primaire: string; secondaire: string; accent: string };

const PALETTES: (Couleurs & { nom: string })[] = [
  { nom: 'Soleil & graphite', primaire: '#e3b52f', secondaire: '#27272a', accent: '#18181b' },
  { nom: 'Bleu institutionnel', primaire: '#1e40af', secondaire: '#475569', accent: '#0891b2' },
  { nom: 'Émeraude', primaire: '#047857', secondaire: '#334155', accent: '#10b981' },
  { nom: 'Ocre ivoirien', primaire: '#c2410c', secondaire: '#57534e', accent: '#15803d' },
  { nom: 'Bordeaux', primaire: '#9f1239', secondaire: '#44403c', accent: '#f59e0b' },
  { nom: 'Indigo', primaire: '#4338ca', secondaire: '#3f3f46', accent: '#db2777' },
  { nom: 'Sarcelle', primaire: '#0f766e', secondaire: '#374151', accent: '#f59e0b' },
  { nom: 'Olive', primaire: '#8a7f12', secondaire: '#3f3f46', accent: '#0891b2' },
];

export function ChoixTheme({ reglages }: { reglages: ReglagesApparence }) {
  const [couleurs, setCouleurs] = useState<Couleurs>({
    primaire: reglages.couleurPrimaire,
    secondaire: reglages.couleurSecondaire,
    accent: reglages.couleurAccent,
  });
  const { theme, setTheme } = useTheme();

  // Live preview on the real interface.
  useEffect(() => {
    const variables = variablesCss({
      ...reglages,
      couleurPrimaire: couleurs.primaire,
      couleurSecondaire: couleurs.secondaire,
      couleurAccent: couleurs.accent,
      couleurBouton: null,
    });

    for (const [cle, valeur] of Object.entries(variables)) {
      document.body.style.setProperty(cle, valeur);
    }
  }, [couleurs, reglages]);

  const actif = (palette: Couleurs) =>
    palette.primaire.toLowerCase() === couleurs.primaire.toLowerCase() &&
    palette.accent.toLowerCase() === couleurs.accent.toLowerCase();

  return (
    <section className="space-y-6 rounded-[var(--rayon-panneau)] verre p-6">
      <input type="hidden" name="couleurPrimaire" value={couleurs.primaire} />
      <input type="hidden" name="couleurSecondaire" value={couleurs.secondaire} />
      <input type="hidden" name="couleurAccent" value={couleurs.accent} />
      {/* Empty: buttons follow the main colour, made legible automatically. */}
      <input type="hidden" name="couleurBouton" value="" />

      <div>
        <h2 className="text-lg font-semibold tracking-tight">Couleurs dominantes</h2>
        <p className="text-sm text-muted-foreground">
          Choisissez une palette ou composez la vôtre. Le site s’actualise en
          direct ; enregistrez pour l’appliquer à tous, aux e-mails et aux rapports.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {PALETTES.map((palette) => (
          <button
            key={palette.nom}
            type="button"
            onClick={() => setCouleurs(palette)}
            className={cn(
              'group relative rounded-2xl border bg-card p-3 text-left shadow-[var(--elevation-1)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--elevation-3)]',
              actif(palette) && 'ring-2 ring-[var(--couleur-primaire-lisible)] ring-offset-2 ring-offset-background',
            )}
          >
            <span className="flex h-10 overflow-hidden rounded-xl">
              <span className="flex-[3]" style={{ background: palette.primaire }} />
              <span className="flex-1" style={{ background: palette.secondaire }} />
              <span className="flex-1" style={{ background: palette.accent }} />
            </span>
            <span className="mt-2 block text-xs font-medium">{palette.nom}</span>
            {actif(palette) && (
              <span className="absolute right-2 top-2 flex size-5 items-center justify-center rounded-full bg-white text-zinc-900 shadow">
                <Check className="size-3" aria-hidden />
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {(
          [
            ['primaire', 'Couleur principale', 'Boutons, aplats, liens actifs'],
            ['secondaire', 'Couleur secondaire', 'Textes et éléments discrets'],
            ['accent', 'Couleur d’accent', 'Graphiques, liserés, lueurs'],
          ] as const
        ).map(([cle, libelle, aide]) => (
          <label key={cle} className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-[var(--elevation-1)]">
            <input
              type="color"
              value={couleurs[cle]}
              onChange={(evenement) => setCouleurs((avant) => ({ ...avant, [cle]: evenement.target.value }))}
              className="size-11 shrink-0 cursor-pointer rounded-xl border-0 bg-transparent p-0"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium">{libelle}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {couleurs[cle].toUpperCase()} · {aide}
              </span>
            </span>
          </label>
        ))}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Mode d’aperçu</p>
        <div className="inline-flex rounded-full border bg-card p-1 shadow-[var(--elevation-1)]">
          {(
            [
              ['light', 'Clair', Sun],
              ['dark', 'Sombre', Moon],
              ['system', 'Système', Monitor],
            ] as const
          ).map(([valeur, libelle, Icone]) => (
            <button
              key={valeur}
              type="button"
              onClick={() => setTheme(valeur)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition-colors',
                theme === valeur ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icone className="size-4" aria-hidden />
              {libelle}
            </button>
          ))}
        </div>
      </div>

      {/* Mini dashboard rendered with the live variables. */}
      <div className="grid gap-3 rounded-2xl border bg-background p-4 sm:grid-cols-3" aria-label="Aperçu">
        <div className="rounded-2xl p-4 text-white shadow-[var(--elevation-2)]" style={{ backgroundImage: 'var(--gradient-primaire)' }}>
          <p className="text-xs opacity-80">Taux de respect</p>
          <p className="mt-1 text-4xl font-light tracking-tight">86<span className="text-lg">%</span></p>
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-[var(--elevation-1)]">
          <p className="text-xs text-muted-foreground">Publiées</p>
          <p className="mt-1 text-4xl font-light tracking-tight">42</p>
          <span className="mt-2 inline-block rounded-full bg-[var(--couleur-primaire-douce)] px-2.5 py-0.5 text-xs font-medium text-[var(--couleur-primaire-lisible)]">+6 ce mois</span>
        </div>
        <div className="flex flex-col justify-between gap-3 rounded-2xl bg-zinc-900 p-4 text-white shadow-[var(--elevation-2)]">
          <p className="text-xs text-white/60">Action</p>
          <span className="inline-flex w-fit items-center rounded-full px-4 py-1.5 text-sm font-medium" style={{ background: 'var(--couleur-accent)' }}>
            Publier le produit
          </span>
        </div>
      </div>
    </section>
  );
}
