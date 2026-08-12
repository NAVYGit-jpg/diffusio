'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/**
 * Dashboard charts (cahier des charges §10).
 *
 * Client components — Recharts measures the DOM. Colours come from the theme
 * variables so the super admin's palette and the light/dark switch reach the
 * charts too (§9.4), instead of hard-coded values that would stay bright on a
 * dark background.
 */

const COULEUR_PRINCIPALE = 'var(--couleur-primaire, var(--primary))';
const COULEUR_GRILLE = 'var(--border)';
const COULEUR_TEXTE = 'var(--muted-foreground)';

type PointCourbe = { libelle: string; taux: number | null; base: number };

function Cadre({
  children,
  hauteur = 260,
}: {
  children: React.ReactElement;
  hauteur?: number;
}) {
  return (
    <div style={{ width: '100%', height: hauteur }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Recharts hands the formatter a loose value type (it may be an array, a string
 * or undefined). Narrowing here keeps the call sites readable and avoids `any`.
 */
function nombreOuNull(valeur: unknown): number | null {
  return typeof valeur === 'number' ? valeur : null;
}

const STYLE_INFOBULLE = {
  backgroundColor: 'var(--popover)',
  border: '1px solid var(--border)',
  borderRadius: '0.5rem',
  color: 'var(--popover-foreground)',
  fontSize: '0.8125rem',
};

/**
 * Twelve-month curve of the respect rate.
 *
 * Months with nothing due carry `null`, and `connectNulls` bridges them: the
 * line jumps the gap instead of diving to zero, which would show a collapse
 * where there was simply nothing to publish.
 */
export function CourbeRespect({ points }: { points: PointCourbe[] }) {
  return (
    <Cadre>
      <LineChart data={points} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={COULEUR_GRILLE} strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="libelle"
          tick={{ fill: COULEUR_TEXTE, fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: COULEUR_GRILLE }}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: COULEUR_TEXTE, fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          unit="%"
        />
        <Tooltip
          contentStyle={STYLE_INFOBULLE}
          cursor={{ stroke: COULEUR_GRILLE }}
          formatter={(valeur, _nom, element) => {
            const taux = nombreOuNull(valeur);
            const base = (element?.payload as PointCourbe | undefined)?.base ?? 0;

            return [
              taux === null ? 'Rien à publier' : `${taux} % (${base} ligne(s))`,
              'Taux de respect',
            ];
          }}
        />
        <Line
          type="monotone"
          dataKey="taux"
          stroke={COULEUR_PRINCIPALE}
          strokeWidth={2}
          dot={{ r: 3, fill: COULEUR_PRINCIPALE }}
          activeDot={{ r: 5 }}
          connectNulls
          isAnimationActive={false}
        />
      </LineChart>
    </Cadre>
  );
}

type Part = { libelle: string; nombre: number };

/**
 * Horizontal breakdown (domain, periodicity, structure).
 *
 * Bars rather than a pie: labels stay readable, and comparing lengths is more
 * reliable than comparing angles. Long names are truncated on the axis and
 * given in full by the tooltip.
 */
export function BarresRepartition({
  parts,
  hauteurParBarre = 34,
}: {
  parts: Part[];
  hauteurParBarre?: number;
}) {
  const hauteur = Math.max(140, parts.length * hauteurParBarre + 30);

  return (
    <Cadre hauteur={hauteur}>
      <BarChart
        data={parts}
        layout="vertical"
        margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
      >
        <CartesianGrid stroke={COULEUR_GRILLE} strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          allowDecimals={false}
          tick={{ fill: COULEUR_TEXTE, fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="libelle"
          width={140}
          tick={{ fill: COULEUR_TEXTE, fontSize: 12 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(valeur: string) =>
            valeur.length > 20 ? `${valeur.slice(0, 19)}…` : valeur
          }
        />
        <Tooltip
          contentStyle={STYLE_INFOBULLE}
          cursor={{ fill: 'var(--muted)' }}
          formatter={(valeur) => [`${nombreOuNull(valeur) ?? 0} ligne(s)`, 'Effectif']}
        />
        <Bar
          dataKey="nombre"
          fill={COULEUR_PRINCIPALE}
          radius={[0, 4, 4, 0]}
          isAnimationActive={false}
        />
      </BarChart>
    </Cadre>
  );
}

type PartStatut = { libelle: string; nombre: number; couleur: string };

/** Status breakdown, each bar keeping the colour used by its badge elsewhere. */
export function BarresStatut({ parts }: { parts: PartStatut[] }) {
  return (
    <Cadre hauteur={240}>
      <BarChart data={parts} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
        <CartesianGrid stroke={COULEUR_GRILLE} strokeDasharray="3 3" vertical={false} />
        {/* Five labels rarely fit side by side in a half-width card; tilting
            them keeps every category readable instead of dropping some. */}
        <XAxis
          dataKey="libelle"
          tick={{ fill: COULEUR_TEXTE, fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: COULEUR_GRILLE }}
          interval={0}
          angle={-25}
          textAnchor="end"
          height={64}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fill: COULEUR_TEXTE, fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={STYLE_INFOBULLE}
          cursor={{ fill: 'var(--muted)' }}
          formatter={(valeur) => [`${nombreOuNull(valeur) ?? 0} ligne(s)`, 'Effectif']}
        />
        <Bar dataKey="nombre" radius={[4, 4, 0, 0]} isAnimationActive={false}>
          {parts.map((part) => (
            <Cell key={part.libelle} fill={part.couleur} />
          ))}
        </Bar>
      </BarChart>
    </Cadre>
  );
}
