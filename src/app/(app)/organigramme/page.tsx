import type { Metadata } from 'next';
import { Mail, Phone, ShieldCheck, UserRound } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { perimetreStructures } from '@/lib/auth/permissions';
import { exigerActeur } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';

export const metadata: Metadata = {
  title: 'Organigramme — DIFFUSIO',
};

type Personne = {
  nom: string;
  prenoms: string;
  email: string;
  telephone: string | null;
  fonction: string | null;
  actif: boolean;
};

function Membre({ personne, role }: { personne: Personne; role: string }) {
  const initiales = `${personne.prenoms.charAt(0)}${personne.nom.charAt(0)}`.toUpperCase();

  return (
    <li className="flex items-start gap-3 rounded-xl border border-border/70 bg-card/60 p-3 transition-colors hover:bg-[var(--couleur-primaire-douce)]">
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
        style={{ backgroundImage: 'var(--gradient-primaire)' }}
        aria-hidden
      >
        {initiales}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 font-medium">
          {personne.prenoms} {personne.nom}
          <Badge variant="outline" className="text-[11px]">{role}</Badge>
          {!personne.actif && <Badge variant="secondary" className="text-[11px]">Inactif</Badge>}
        </p>
        {personne.fonction && <p className="text-sm text-muted-foreground">{personne.fonction}</p>}
        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <a href={`mailto:${personne.email}`} className="inline-flex items-center gap-1 hover:text-foreground">
            <Mail className="size-3.5" aria-hidden /> {personne.email}
          </a>
          {personne.telephone && (
            <a href={`tel:${personne.telephone}`} className="inline-flex items-center gap-1 hover:text-foreground">
              <Phone className="size-3.5" aria-hidden /> {personne.telephone}
            </a>
          )}
        </p>
      </div>
    </li>
  );
}

/**
 * Who answers for each structure: the supervisors (administrators) and the
 * points focaux attached to it.
 *
 * Scoped like everything else: a super admin sees the whole organisation, an
 * administrator the structures they supervise, a point focal their own.
 */
export default async function PageOrganigramme() {
  const acteur = await exigerActeur();
  const perimetre = perimetreStructures(acteur);

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
      parent: { select: { sigle: true } },
      pointsFocaux: {
        where: { deletedAt: null, role: 'POINT_FOCAL' },
        select: { nom: true, prenoms: true, email: true, telephone: true, fonction: true, actif: true, estTitulaire: true },
        orderBy: [{ estTitulaire: 'desc' }, { nom: 'asc' }],
      },
      adminStructures: {
        where: { admin: { deletedAt: null } },
        select: {
          admin: { select: { nom: true, prenoms: true, email: true, telephone: true, fonction: true, actif: true } },
        },
      },
    },
    orderBy: { nom: 'asc' },
  });

  const totalPointsFocaux = structures.reduce((somme, s) => somme + s.pointsFocaux.length, 0);
  const sansPointFocal = structures.filter((s) => s.pointsFocaux.length === 0).length;

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Organigramme</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Les superviseurs et les points focaux de chaque structure
          {acteur.role === 'SUPER_ADMIN' ? '' : ' de votre périmètre'}.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <Badge variant="secondary">{structures.length} structure(s)</Badge>
          <Badge variant="secondary">{totalPointsFocaux} point(s) focal(aux)</Badge>
          {sansPointFocal > 0 && (
            <Badge variant="destructive">{sansPointFocal} structure(s) sans point focal</Badge>
          )}
        </div>
      </header>

      {structures.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Aucune structure dans votre périmètre.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {structures.map((structure) => (
            <Card key={structure.id}>
              <CardHeader className="pb-3">
                <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                  {structure.nom}
                  <Badge>{structure.sigle}</Badge>
                </CardTitle>
                {structure.parent && (
                  <p className="text-xs text-muted-foreground">Rattachée à {structure.parent.sigle}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--couleur-primaire-lisible)]">
                    <ShieldCheck className="size-3.5" aria-hidden /> Superviseurs
                  </p>
                  {structure.adminStructures.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun superviseur désigné.</p>
                  ) : (
                    <ul className="space-y-2">
                      {structure.adminStructures.map(({ admin }) => (
                        <Membre key={admin.email} personne={admin} role="Superviseur" />
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--couleur-primaire-lisible)]">
                    <UserRound className="size-3.5" aria-hidden /> Points focaux
                  </p>
                  {structure.pointsFocaux.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Aucun point focal rattaché.</p>
                  ) : (
                    <ul className="space-y-2">
                      {structure.pointsFocaux.map((pf) => (
                        <Membre key={pf.email} personne={pf} role={pf.estTitulaire ? 'Titulaire' : 'Suppléant'} />
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
