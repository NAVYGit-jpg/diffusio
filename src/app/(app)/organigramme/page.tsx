import type { Metadata } from 'next';
import { FileText, Gauge, ShieldCheck, UserRound } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { initiales } from '@/components/avatar-utilisateur';
import { perimetreStructures } from '@/lib/auth/permissions';
import { exigerActeur } from '@/lib/auth/session';
import { traducteurActeur } from '@/lib/langue/serveur';
import { LIBELLE_PERIODICITE } from '@/lib/catalogue/schemas';
import { prisma } from '@/lib/prisma';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Organigramme — DIFFUSIO',
};

type Personne = {
  nom: string;
  prenoms: string;
  email: string;
  fonction: string | null;
  actif: boolean;
};

type NoeudStructure = {
  id: string;
  nom: string;
  sigle: string;
  parentId: string | null;
  superviseurs: Personne[];
  pointsFocaux: (Personne & { estTitulaire: boolean })[];
  publications: { id: string; nom: string; periodicite: string }[];
  indicateurs: { id: string; nom: string; publication: { nom: string } | null }[];
};

const MAX_LISTE = 6;

function Pastille({ personne, chef }: { personne: Personne; chef?: boolean }) {
  return (
    <li
      className={cn('flex items-center gap-2 rounded-xl px-2 py-1.5', !personne.actif && 'opacity-50')}
      title={`${personne.email}${personne.fonction ? ` — ${personne.fonction}` : ''}`}
    >
      <span
        className={cn(
          'flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
          chef ? 'bg-foreground text-background' : 'bg-[var(--couleur-primaire-douce)] text-[var(--couleur-primaire-lisible)]',
        )}
      >
        {initiales(`${personne.prenoms} ${personne.nom}`)}
      </span>
      <span className="min-w-0 truncate text-xs font-medium">
        {personne.prenoms} {personne.nom}
      </span>
    </li>
  );
}

function Rubrique({
  Icone,
  titre,
  nombre,
  children,
}: {
  Icone: typeof FileText;
  titre: string;
  nombre: number;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-border/70 px-3 py-2">
      <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <Icone className="size-3" aria-hidden />
        {titre}
        <span className="ml-auto rounded-full bg-muted px-1.5 tabular-nums">{nombre}</span>
      </p>
      {nombre === 0 ? <p className="px-2 text-xs text-muted-foreground">—</p> : children}
    </div>
  );
}

/** One structure of the chart: who supervises it, who answers for it, what it publishes. */
function CarteStructure({ noeud, racine }: { noeud: NoeudStructure; racine: boolean }) {
  return (
    <div className="surgir w-64 overflow-hidden rounded-2xl border bg-card text-left shadow-[var(--elevation-2)] transition-shadow hover:shadow-[var(--elevation-4)]">
      <div
        className={cn('px-3 py-3', racine ? 'text-white' : 'bg-[var(--couleur-primaire-douce)]')}
        style={racine ? { backgroundImage: 'var(--gradient-primaire)' } : undefined}
      >
        <span
          className={cn(
            'inline-block rounded-md px-1.5 py-0.5 text-[11px] font-bold',
            racine ? 'bg-white/20' : 'bg-card text-[var(--couleur-primaire-lisible)]',
          )}
        >
          {noeud.sigle}
        </span>
        <p className="mt-1 text-sm font-semibold leading-snug">{noeud.nom}</p>
      </div>

      <Rubrique Icone={ShieldCheck} titre="Superviseurs" nombre={noeud.superviseurs.length}>
        <ul>
          {noeud.superviseurs.map((personne) => (
            <Pastille key={personne.email} personne={personne} chef />
          ))}
        </ul>
      </Rubrique>

      <Rubrique Icone={UserRound} titre="Points focaux" nombre={noeud.pointsFocaux.length}>
        <ul>
          {noeud.pointsFocaux.map((personne) => (
            <Pastille key={personne.email} personne={personne} />
          ))}
        </ul>
      </Rubrique>

      <Rubrique Icone={FileText} titre="Publications" nombre={noeud.publications.length}>
        <ul className="space-y-0.5 px-2">
          {noeud.publications.slice(0, MAX_LISTE).map((publication) => (
            <li key={publication.id} className="flex items-baseline justify-between gap-2 text-xs">
              <span className="truncate">{publication.nom}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {LIBELLE_PERIODICITE[publication.periodicite as keyof typeof LIBELLE_PERIODICITE] ?? publication.periodicite}
              </span>
            </li>
          ))}
          {noeud.publications.length > MAX_LISTE && (
            <li className="text-[11px] text-muted-foreground">+ {noeud.publications.length - MAX_LISTE} autre(s)</li>
          )}
        </ul>
      </Rubrique>

      <Rubrique Icone={Gauge} titre="Indicateurs" nombre={noeud.indicateurs.length}>
        <ul className="space-y-0.5 px-2">
          {noeud.indicateurs.slice(0, MAX_LISTE).map((indicateur) => (
            <li key={indicateur.id} className="truncate text-xs" title={indicateur.publication ? `Publié dans ${indicateur.publication.nom}` : undefined}>
              {indicateur.nom}
            </li>
          ))}
          {noeud.indicateurs.length > MAX_LISTE && (
            <li className="text-[11px] text-muted-foreground">+ {noeud.indicateurs.length - MAX_LISTE} autre(s)</li>
          )}
        </ul>
      </Rubrique>
    </div>
  );
}

/**
 * The organisation as one large chart: structures from top to bottom, joined
 * by connecting lines, each carrying its supervisors, points focaux,
 * publications and indicators.
 *
 * Scoped like everything else: a super admin sees the whole organisation, an
 * administrator the structures they supervise, a point focal their own.
 */
export default async function PageOrganigramme() {
  const acteur = await exigerActeur();
  const t = await traducteurActeur();
  const perimetre = perimetreStructures(acteur);
  const actifs = { deletedAt: null, actif: true };

  const structures = await prisma.structure.findMany({
    where: {
      organisationId: acteur.organisationId,
      deletedAt: null,
      actif: true,
      ...(perimetre === null ? {} : { id: { in: perimetre } }),
    },
    select: {
      id: true,
      nom: true,
      sigle: true,
      parentId: true,
      pointsFocaux: {
        where: { deletedAt: null, role: 'POINT_FOCAL' },
        select: { nom: true, prenoms: true, email: true, fonction: true, actif: true, estTitulaire: true },
        orderBy: [{ estTitulaire: 'desc' }, { nom: 'asc' }],
      },
      adminStructures: {
        where: { admin: { deletedAt: null } },
        select: { admin: { select: { nom: true, prenoms: true, email: true, fonction: true, actif: true } } },
      },
      publications: {
        where: actifs,
        select: { id: true, nom: true, periodicite: true },
        orderBy: { nom: 'asc' },
      },
      indicateurs: {
        where: actifs,
        select: { id: true, nom: true, publication: { select: { nom: true } } },
        orderBy: { nom: 'asc' },
      },
    },
    orderBy: { nom: 'asc' },
  });

  const noeuds: NoeudStructure[] = structures.map((structure) => ({
    ...structure,
    superviseurs: structure.adminStructures.map((lien) => lien.admin),
  }));
  const ids = new Set(noeuds.map((noeud) => noeud.id));
  const racines = noeuds.filter((noeud) => !noeud.parentId || !ids.has(noeud.parentId));
  const enfantsDe = (id: string) => noeuds.filter((noeud) => noeud.parentId === id);

  const Branche = ({ noeud, racine }: { noeud: NoeudStructure; racine: boolean }) => {
    const enfants = enfantsDe(noeud.id);

    return (
      <li>
        <CarteStructure noeud={noeud} racine={racine} />
        {enfants.length > 0 && (
          <ul>
            {enfants.map((enfant) => (
              <Branche key={enfant.id} noeud={enfant} racine={false} />
            ))}
          </ul>
        )}
      </li>
    );
  };

  const total = (cle: 'pointsFocaux' | 'publications' | 'indicateurs') =>
    noeuds.reduce((somme, noeud) => somme + noeud[cle].length, 0);

  return (
    <div className="mx-auto max-w-[100rem]">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t('nav.organigramme')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Les structures et leurs rattachements, avec pour chacune ses superviseurs, ses points
          focaux, ses publications et ses indicateurs
          {acteur.role === 'SUPER_ADMIN' ? '' : ' — dans votre périmètre'}.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <Badge variant="secondary">{noeuds.length} structure(s)</Badge>
          <Badge variant="secondary">{total('pointsFocaux')} point(s) focal(aux)</Badge>
          <Badge variant="secondary">{total('publications')} publication(s)</Badge>
          <Badge variant="secondary">{total('indicateurs')} indicateur(s)</Badge>
        </div>
      </header>

      {noeuds.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          Aucune structure dans votre périmètre.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-3xl border bg-card/50 p-8 shadow-[var(--elevation-1)]">
          <div className="organigramme mx-auto w-max">
            <ul>
              {racines.map((racine) => (
                <Branche key={racine.id} noeud={racine} racine />
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
