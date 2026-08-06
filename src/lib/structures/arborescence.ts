/**
 * Structure tree helpers (cahier des charges §4.2).
 *
 * `Structure.parentId` is a self-reference with no depth limit, so every
 * operation here has to cope with malformed data: a parent that no longer
 * exists, or a cycle introduced by a bad move. None of this touches the
 * database, which keeps it exhaustively testable.
 */

export type NoeudPlat = {
  id: string;
  nom: string;
  sigle: string;
  code: string;
  parentId: string | null;
  actif: boolean;
};

export type Noeud<T extends NoeudPlat = NoeudPlat> = T & {
  enfants: Noeud<T>[];
  /** 0 for a root, incremented at each level. */
  profondeur: number;
};

/**
 * Builds the tree from a flat list.
 *
 * A structure whose `parentId` points at something absent from the list is
 * promoted to root rather than dropped: silently hiding a structure would be
 * worse than showing it at the wrong level. Cycles are broken the same way —
 * any node that cannot be reached from a root is re-attached at the top.
 */
export function construireArborescence<T extends NoeudPlat>(
  structures: readonly T[],
): Noeud<T>[] {
  const parId = new Map<string, Noeud<T>>();
  const parentDe = new Map<string, string | null>();

  for (const structure of structures) {
    parId.set(structure.id, { ...structure, enfants: [], profondeur: 0 });
    parentDe.set(structure.id, structure.parentId);
  }

  /**
   * Does walking up from `id` come back to `id`?
   *
   * Only the nodes actually caught in the loop are detached. A node merely
   * *below* a cycle keeps its parent, so no branch is lost.
   */
  const appartientAUnCycle = (id: string): boolean => {
    const vus = new Set<string>();
    let courant = parentDe.get(id) ?? null;

    while (courant !== null) {
      if (courant === id) {
        return true;
      }
      if (vus.has(courant)) {
        return false; // boucle plus haut, mais qui n'inclut pas `id`
      }
      vus.add(courant);
      courant = parentDe.get(courant) ?? null;
    }

    return false;
  };

  const racines: Noeud<T>[] = [];

  for (const structure of structures) {
    const noeud = parId.get(structure.id)!;
    const parent =
      structure.parentId !== null ? parId.get(structure.parentId) : undefined;

    // A missing parent, or a parent reached through a cycle, promotes the node
    // to root: hiding a structure would be worse than showing it too high.
    if (parent && !appartientAUnCycle(structure.id)) {
      parent.enfants.push(noeud);
    } else {
      racines.push(noeud);
    }
  }

  const attribuerProfondeur = (noeuds: Noeud<T>[], profondeur: number): void => {
    for (const noeud of noeuds) {
      noeud.profondeur = profondeur;
      attribuerProfondeur(noeud.enfants, profondeur + 1);
    }
  };

  attribuerProfondeur(racines, 0);
  trierRecursivement(racines);

  return racines;
}

function trierRecursivement<T extends NoeudPlat>(noeuds: Noeud<T>[]): void {
  noeuds.sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  for (const noeud of noeuds) {
    trierRecursivement(noeud.enfants);
  }
}

/** Flattens the tree back to a list, parents before children. */
export function aplatir<T extends NoeudPlat>(noeuds: Noeud<T>[]): Noeud<T>[] {
  const resultat: Noeud<T>[] = [];

  const descendre = (liste: Noeud<T>[]): void => {
    for (const noeud of liste) {
      resultat.push(noeud);
      descendre(noeud.enfants);
    }
  };

  descendre(noeuds);

  return resultat;
}

/** Every descendant id of `id`, excluding `id` itself. */
export function descendants(
  structures: readonly NoeudPlat[],
  id: string,
): Set<string> {
  const enfantsPar = new Map<string, string[]>();

  for (const structure of structures) {
    if (structure.parentId === null) {
      continue;
    }
    const fratrie = enfantsPar.get(structure.parentId) ?? [];
    fratrie.push(structure.id);
    enfantsPar.set(structure.parentId, fratrie);
  }

  const trouves = new Set<string>();
  const aVisiter = [...(enfantsPar.get(id) ?? [])];

  while (aVisiter.length > 0) {
    const courant = aVisiter.pop()!;

    // Guards against an already-corrupted cycle in the stored data.
    if (trouves.has(courant)) {
      continue;
    }

    trouves.add(courant);
    aVisiter.push(...(enfantsPar.get(courant) ?? []));
  }

  return trouves;
}

/**
 * Would attaching `id` under `nouveauParentId` create a cycle?
 *
 * A structure cannot be its own parent, nor descend from one of its own
 * descendants. Without this check a move would make part of the tree
 * unreachable and loop any recursive traversal.
 */
export function creeraitUnCycle(
  structures: readonly NoeudPlat[],
  id: string,
  nouveauParentId: string | null,
): boolean {
  if (nouveauParentId === null) {
    return false;
  }

  if (nouveauParentId === id) {
    return true;
  }

  return descendants(structures, id).has(nouveauParentId);
}

/** Structures that may legally become the parent of `id`. */
export function parentsPossibles<T extends NoeudPlat>(
  structures: readonly T[],
  id: string | null,
): T[] {
  if (id === null) {
    return [...structures];
  }

  const interdits = descendants(structures, id);

  return structures.filter(
    (structure) => structure.id !== id && !interdits.has(structure.id),
  );
}
