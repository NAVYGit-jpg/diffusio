import type { Metadata } from 'next';

import { perimetreStructures } from '@/lib/auth/permissions';
import { exigerActeur } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { VueDiscussion } from './vue-discussion';

export const metadata: Metadata = {
  title: 'Discussion — DIFFUSIO',
};

export default async function PageDiscussion({
  searchParams,
}: {
  searchParams: Promise<{ conversation?: string }>;
}) {
  const acteur = await exigerActeur();
  const { conversation: conversationChoisie } = await searchParams;
  const perimetre = perimetreStructures(acteur);

  const filtreStructure =
    perimetre === null ? {} : { structureId: { in: perimetre } };

  const [conversations, structures] = await Promise.all([
    prisma.conversation.findMany({
      where: { organisationId: acteur.organisationId, ...filtreStructure },
      orderBy: { dernierMessageAt: 'desc' },
      take: 100,
      select: {
        id: true,
        sujet: true,
        dernierMessageAt: true,
        structure: { select: { nom: true, sigle: true } },
        _count: {
          select: {
            messages: { where: { lu: false, auteurId: { not: acteur.id } } },
          },
        },
      },
    }),
    prisma.structure.findMany({
      where: {
        organisationId: acteur.organisationId,
        deletedAt: null,
        actif: true,
        ...(perimetre === null ? {} : { id: { in: perimetre } }),
      },
      select: { id: true, nom: true, sigle: true },
      orderBy: { nom: 'asc' },
    }),
  ]);

  const active = conversationChoisie
    ? await prisma.conversation.findFirst({
        where: {
          id: conversationChoisie,
          organisationId: acteur.organisationId,
          ...filtreStructure,
        },
        include: {
          structure: { select: { nom: true, sigle: true } },
          messages: {
            orderBy: { createdAt: 'asc' },
            include: {
              auteur: { select: { id: true, nom: true, prenoms: true, role: true } },
            },
          },
        },
      })
    : null;

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Discussion</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {acteur.role === 'POINT_FOCAL'
            ? 'Échangez avec les administrateurs qui supervisent votre structure.'
            : 'Échangez avec les points focaux des structures que vous supervisez.'}
        </p>
      </header>

      <VueDiscussion
        role={acteur.role}
        acteurId={acteur.id}
        structures={structures}
        conversations={conversations.map((conversation) => ({
          id: conversation.id,
          sujet: conversation.sujet,
          structure: conversation.structure.sigle,
          dernierMessageAt: conversation.dernierMessageAt.toISOString(),
          nonLus: conversation._count.messages,
        }))}
        active={
          active
            ? {
                id: active.id,
                sujet: active.sujet,
                structure: `${active.structure.nom} (${active.structure.sigle})`,
                messages: active.messages.map((message) => ({
                  id: message.id,
                  contenu: message.contenu,
                  createdAt: message.createdAt.toISOString(),
                  auteurId: message.auteur.id,
                  auteurNom: `${message.auteur.prenoms} ${message.auteur.nom}`,
                  auteurRole: message.auteur.role,
                })),
              }
            : null
        }
      />
    </div>
  );
}
