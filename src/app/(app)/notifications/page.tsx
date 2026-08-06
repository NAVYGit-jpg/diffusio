import type { Metadata } from 'next';

import { exigerActeur } from '@/lib/auth/session';
import { prisma } from '@/lib/prisma';
import { ListeNotifications } from './liste-notifications';

export const metadata: Metadata = {
  title: 'Notifications — DIFFUSIO',
};

export default async function PageNotifications() {
  const acteur = await exigerActeur();

  const notifications = await prisma.notification.findMany({
    where: { destinataireId: acteur.id },
    orderBy: [{ lu: 'asc' }, { createdAt: 'desc' }],
    take: 200,
    select: {
      id: true,
      type: true,
      titre: true,
      message: true,
      lien: true,
      lu: true,
      createdAt: true,
    },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Les 200 dernières, non lues en premier.
        </p>
      </header>

      <ListeNotifications
        notifications={notifications.map((notification) => ({
          ...notification,
          createdAt: notification.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
