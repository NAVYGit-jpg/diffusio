'use client';

import { Building2, FileText, Users } from 'lucide-react';

import { cn } from '@/lib/utils';

type Noeud = {
  id: string;
  nom: string;
  sigle: string;
  type: string;
  parentId: string | null;
  actif: boolean;
  _count: { pointsFocaux: number; publications: number };
};

/**
 * The structures as a tree: each structure a card, its children hung below
 * it on a connecting line, level after level. Reads « who depends on whom »
 * at a glance, where the table reads details.
 */
export function ArbreStructures<T extends Noeud>({
  structures,
  libelleType,
  onOuvrir,
}: {
  structures: T[];
  libelleType: (type: string) => string;
  onOuvrir: (structure: T) => void;
}) {
  const ids = new Set(structures.map((structure) => structure.id));
  // Roots of the shown set: a structure whose parent is not shown (a filtered
  // branch starts at the chosen structure).
  const racines = structures.filter((structure) => !structure.parentId || !ids.has(structure.parentId));
  const enfantsDe = (id: string) => structures.filter((structure) => structure.parentId === id);

  const Branche = ({ noeud, niveau }: { noeud: T; niveau: number }) => {
    const enfants = enfantsDe(noeud.id);

    return (
      <li className="relative">
        {niveau > 0 && (
          <span aria-hidden className="absolute -left-6 top-7 h-px w-6 bg-border" />
        )}
        <button
          type="button"
          onClick={() => onOuvrir(noeud)}
          className={cn(
            'surgir group flex w-full max-w-xl items-center gap-3 rounded-2xl border bg-card p-3 text-left shadow-[var(--elevation-1)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--elevation-3)]',
            !noeud.actif && 'opacity-55',
          )}
        >
          <span
            className={cn(
              'flex size-11 shrink-0 items-center justify-center rounded-xl text-xs font-bold',
              niveau === 0 ? 'text-white' : 'bg-[var(--couleur-primaire-douce)] text-[var(--couleur-primaire-lisible)]',
            )}
            style={niveau === 0 ? { backgroundImage: 'var(--gradient-primaire)' } : undefined}
          >
            {noeud.sigle.slice(0, 5)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">{noeud.nom}</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
              <span>{libelleType(noeud.type)}</span>
              <span className="inline-flex items-center gap-1">
                <Users className="size-3" aria-hidden />
                {noeud._count.pointsFocaux}
              </span>
              <span className="inline-flex items-center gap-1">
                <FileText className="size-3" aria-hidden />
                {noeud._count.publications}
              </span>
              {enfants.length > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Building2 className="size-3" aria-hidden />
                  {enfants.length} rattachée(s)
                </span>
              )}
            </span>
          </span>
        </button>

        {enfants.length > 0 && (
          <ul className="relative ml-5 mt-3 space-y-3 border-l-2 border-border pl-6">
            {enfants.map((enfant) => (
              <Branche key={enfant.id} noeud={enfant} niveau={niveau + 1} />
            ))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <ul className="space-y-6 rounded-3xl border bg-card/60 p-6">
      {racines.map((racine) => (
        <Branche key={racine.id} noeud={racine} niveau={0} />
      ))}
    </ul>
  );
}
