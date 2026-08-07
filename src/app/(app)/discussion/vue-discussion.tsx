'use client';

import type { Role } from '@prisma/client';
import { LoaderCircle, MessageSquare, MessageSquarePlus, Send } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  type EtatDiscussion,
  marquerConversationLueAction,
  ouvrirConversationAction,
  repondreAction,
} from '@/lib/actions/discussion';

type Conversation = {
  id: string;
  sujet: string;
  structure: string;
  dernierMessageAt: string;
  nonLus: number;
};

type Message = {
  id: string;
  contenu: string;
  createdAt: string;
  auteurId: string;
  auteurNom: string;
  auteurRole: Role;
};

type Active = {
  id: string;
  sujet: string;
  structure: string;
  messages: Message[];
};

const ETAT_INITIAL: EtatDiscussion = {};

const LIBELLE_ROLE: Record<Role, string> = {
  SUPER_ADMIN: 'Super administrateur',
  ADMIN: 'Administrateur',
  POINT_FOCAL: 'Point focal',
};

function quand(iso: string): string {
  const date = new Date(iso);
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);

  if (minutes < 1) return 'à l’instant';
  if (minutes < 60) return `il y a ${minutes} min`;
  if (minutes < 60 * 24) return `il y a ${Math.floor(minutes / 60)} h`;

  const j = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const heure = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');

  return `${j}/${m}/${date.getFullYear()} à ${heure}h${minute}`;
}

export function VueDiscussion({
  role,
  acteurId,
  structures,
  conversations,
  active,
}: {
  role: Role;
  acteurId: string;
  structures: { id: string; nom: string; sigle: string }[];
  conversations: Conversation[];
  active: Active | null;
}) {
  const router = useRouter();
  const [nouvelle, setNouvelle] = useState(false);
  const finDuFil = useRef<HTMLDivElement>(null);

  const [etatOuverture, actionOuverture, ouvertureEnCours] = useActionState(
    ouvrirConversationAction,
    ETAT_INITIAL,
  );
  const [etatReponse, actionReponse, reponseEnCours] = useActionState(
    repondreAction,
    ETAT_INITIAL,
  );

  useEffect(() => {
    if (etatOuverture.succes && etatOuverture.conversationId) {
      setNouvelle(false);
      toast.success(etatOuverture.message ?? 'Discussion ouverte.');
      router.push(`/discussion?conversation=${etatOuverture.conversationId}`);
    }
  }, [etatOuverture, router]);

  useEffect(() => {
    if (etatReponse.succes) {
      router.refresh();
    }
    if (etatReponse.erreur) {
      toast.error(etatReponse.erreur);
    }
  }, [etatReponse, router]);

  // Opening a thread marks it read, and the newest message is what matters:
  // scrolling to the bottom saves a gesture on a long exchange.
  useEffect(() => {
    if (!active) {
      return;
    }

    finDuFil.current?.scrollIntoView({ block: 'end' });
    void marquerConversationLueAction(active.id);
  }, [active]);

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setNouvelle(true)} disabled={structures.length === 0}>
          <MessageSquarePlus aria-hidden />
          Nouvelle discussion
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-[320px_1fr]">
        {/* ---------------------------------------------------- liste */}
        <aside className="rounded-lg border">
          {conversations.length === 0 ? (
            <div className="p-6 text-center">
              <MessageSquare
                className="mx-auto size-7 text-muted-foreground"
                aria-hidden
              />
              <p className="mt-3 text-sm text-muted-foreground">
                Aucune discussion pour le moment.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {conversations.map((conversation) => (
                <li key={conversation.id}>
                  <Link
                    href={`/discussion?conversation=${conversation.id}`}
                    className={
                      active?.id === conversation.id
                        ? 'block bg-secondary p-3'
                        : 'block p-3 transition-colors hover:bg-secondary/60'
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium">
                        {conversation.sujet}
                      </span>
                      {conversation.nonLus > 0 && (
                        <Badge className="shrink-0">{conversation.nonLus}</Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {conversation.structure} · {quand(conversation.dernierMessageAt)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* ------------------------------------------------------ fil */}
        <section className="rounded-lg border">
          {!active ? (
            <div className="flex h-full min-h-64 flex-col items-center justify-center p-8 text-center">
              <MessageSquare
                className="size-8 text-muted-foreground"
                aria-hidden
              />
              <h2 className="mt-4 font-medium">Sélectionnez une discussion</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                {role === 'POINT_FOCAL'
                  ? 'Ouvrez une discussion pour signaler une difficulté, demander un délai ou poser une question à vos administrateurs.'
                  : 'Ouvrez une discussion pour interpeller un point focal sur une échéance ou un livrable.'}
              </p>
            </div>
          ) : (
            <>
              <header className="border-b p-3">
                <h2 className="font-medium">{active.sujet}</h2>
                <p className="text-xs text-muted-foreground">{active.structure}</p>
              </header>

              <div className="max-h-[26rem] space-y-3 overflow-y-auto p-3">
                {active.messages.map((message) => {
                  const deMoi = message.auteurId === acteurId;

                  return (
                    <div
                      key={message.id}
                      className={deMoi ? 'flex justify-end' : 'flex justify-start'}
                    >
                      <div
                        className={
                          deMoi
                            ? 'max-w-[80%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground'
                            : 'max-w-[80%] rounded-lg bg-secondary px-3 py-2 text-sm'
                        }
                      >
                        {!deMoi && (
                          <p className="mb-1 text-xs opacity-80">
                            {message.auteurNom} · {LIBELLE_ROLE[message.auteurRole]}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap">{message.contenu}</p>
                        <p className="mt-1 text-xs opacity-70">
                          {quand(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={finDuFil} />
              </div>

              <form
                action={actionReponse}
                key={active.messages.length}
                className="flex items-end gap-2 border-t p-3"
              >
                <input type="hidden" name="conversationId" value={active.id} />
                <div className="min-w-0 flex-1">
                  <Label htmlFor="reponse" className="sr-only">
                    Votre message
                  </Label>
                  <Textarea
                    id="reponse"
                    name="message"
                    rows={2}
                    required
                    placeholder="Écrivez votre message…"
                  />
                  {etatReponse.erreursChamps?.message && (
                    <p className="mt-1 text-sm text-destructive">
                      {etatReponse.erreursChamps.message[0]}
                    </p>
                  )}
                </div>
                <Button type="submit" disabled={reponseEnCours}>
                  {reponseEnCours ? (
                    <LoaderCircle className="animate-spin" aria-hidden />
                  ) : (
                    <Send aria-hidden />
                  )}
                  Envoyer
                </Button>
              </form>
            </>
          )}
        </section>
      </div>

      {/* ------------------------------------------- nouvelle discussion */}
      <Dialog open={nouvelle} onOpenChange={setNouvelle}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouvelle discussion</DialogTitle>
            <DialogDescription>
              {role === 'POINT_FOCAL'
                ? 'Vos administrateurs seront prévenus.'
                : 'Les points focaux de la structure seront prévenus.'}
            </DialogDescription>
          </DialogHeader>

          <form action={actionOuverture} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="structureId">Structure concernée</Label>
              <Select name="structureId" defaultValue={structures[0]?.id}>
                <SelectTrigger id="structureId" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {structures.map((structure) => (
                    <SelectItem key={structure.id} value={structure.id}>
                      {structure.nom} ({structure.sigle})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sujet">Sujet</Label>
              <Input id="sujet" name="sujet" required />
              {etatOuverture.erreursChamps?.sujet && (
                <p className="text-sm text-destructive">
                  {etatOuverture.erreursChamps.sujet[0]}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="premierMessage">Message</Label>
              <Textarea id="premierMessage" name="message" rows={4} required />
              {etatOuverture.erreursChamps?.message && (
                <p className="text-sm text-destructive">
                  {etatOuverture.erreursChamps.message[0]}
                </p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setNouvelle(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={ouvertureEnCours}>
                {ouvertureEnCours && (
                  <LoaderCircle className="animate-spin" aria-hidden />
                )}
                Ouvrir la discussion
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
