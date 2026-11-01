'use client';

import type { Role } from '@prisma/client';
import { LoaderCircle, MessageSquare, MessageSquarePlus, Send } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

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
import { initiales } from '@/components/avatar-utilisateur';
import { cn } from '@/lib/utils';
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
  //
  // Keyed on the thread and its length, not on the `active` object: marking
  // read refreshes the page, which hands a new object every time and used to
  // yank the reader back on each refresh. Only the thread scrolls — not the
  // page, which `scrollIntoView` would also move.
  const idActive = active?.id;
  const nombreMessages = active?.messages.length ?? 0;

  useEffect(() => {
    if (!idActive) {
      return;
    }

    const fil = finDuFil.current?.parentElement;
    if (fil) {
      fil.scrollTop = fil.scrollHeight;
    }
  }, [idActive, nombreMessages]);

  useEffect(() => {
    if (idActive) {
      void marquerConversationLueAction(idActive);
    }
  }, [idActive]);

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setNouvelle(true)} disabled={structures.length === 0}>
          <MessageSquarePlus aria-hidden />
          Nouvelle discussion
        </Button>
      </div>

      <div className="grid gap-5 md:grid-cols-[320px_1fr]">
        {/* ---------------------------------------------------- liste */}
        <aside className="verre flex flex-col overflow-hidden rounded-[var(--rayon-panneau)] p-2">
          <p className="px-3 pb-2 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Conversations
          </p>
          {conversations.length === 0 ? (
            <div className="p-6 text-center">
              <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-card shadow-[var(--elevation-2)]">
                <MessageSquare className="size-5 text-muted-foreground" aria-hidden />
              </span>
              <p className="mt-3 text-sm text-muted-foreground">
                Aucune discussion pour le moment.
              </p>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {conversations.map((conversation, rang) => {
                const choisie = active?.id === conversation.id;

                return (
                  <li
                    key={conversation.id}
                    className="surgir"
                    style={{ '--rang': rang } as React.CSSProperties}
                  >
                    <Link
                      href={`/discussion?conversation=${conversation.id}`}
                      className={cn(
                        'flex items-center gap-3 rounded-2xl p-3 no-underline transition-all duration-200',
                        choisie
                          ? 'bg-foreground text-background shadow-[var(--elevation-3)]'
                          : 'hover:-translate-y-0.5 hover:bg-card hover:shadow-[var(--elevation-2)]',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold',
                          choisie
                            ? 'bg-background/15 text-background'
                            : 'text-white shadow-[var(--elevation-1)]',
                        )}
                        style={
                          choisie ? undefined : { backgroundImage: 'var(--gradient-primaire)' }
                        }
                      >
                        {conversation.structure.slice(0, 3).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-semibold">
                            {conversation.sujet}
                          </span>
                          {conversation.nonLus > 0 && (
                            <span className="point-non-lu flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[var(--couleur-primaire-lisible)] px-1.5 text-[11px] font-bold text-white">
                              {conversation.nonLus}
                            </span>
                          )}
                        </span>
                        <span
                          className={cn(
                            'mt-0.5 block truncate text-xs',
                            choisie ? 'text-background/65' : 'text-muted-foreground',
                          )}
                        >
                          {conversation.structure} · {quand(conversation.dernierMessageAt)}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* ------------------------------------------------------ fil */}
        <section className="verre flex min-h-[32rem] flex-col overflow-hidden rounded-[var(--rayon-panneau)]">
          {!active ? (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <span
                className="flex size-16 items-center justify-center rounded-3xl text-white shadow-[var(--elevation-3)]"
                style={{ backgroundImage: 'var(--gradient-primaire)' }}
              >
                <MessageSquare className="size-7" aria-hidden />
              </span>
              <h2 className="mt-5 text-lg font-semibold">Sélectionnez une discussion</h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                {role === 'POINT_FOCAL'
                  ? 'Ouvrez une discussion pour signaler une difficulté, demander un délai ou poser une question à vos administrateurs.'
                  : 'Ouvrez une discussion pour interpeller un point focal sur une échéance ou un livrable.'}
              </p>
            </div>
          ) : (
            <>
              <header className="flex items-center gap-3 border-b border-border/60 bg-card/70 px-5 py-4 backdrop-blur">
                <span
                  className="flex size-10 items-center justify-center rounded-xl text-white shadow-[var(--elevation-2)]"
                  style={{ backgroundImage: 'var(--gradient-primaire)' }}
                >
                  <MessageSquare className="size-5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate font-semibold tracking-tight">{active.sujet}</h2>
                  <p className="truncate text-xs text-muted-foreground">
                    {active.structure} · {active.messages.length} message(s)
                  </p>
                </div>
              </header>

              <div className="max-h-[30rem] flex-1 space-y-4 overflow-y-auto px-5 py-6">
                {active.messages.map((message, rang) => {
                  const deMoi = message.auteurId === acteurId;

                  return (
                    <div
                      key={message.id}
                      className={cn('surgir flex items-end gap-2.5', deMoi && 'flex-row-reverse')}
                      // Only the last messages are staggered: on a long thread
                      // the first ones are off screen anyway.
                      style={
                        {
                          '--rang': Math.max(0, rang - active.messages.length + 8),
                        } as React.CSSProperties
                      }
                    >
                      <span
                        className={cn(
                          'flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold shadow-[var(--elevation-2)]',
                          deMoi ? 'bg-foreground text-background' : 'bg-card text-foreground',
                        )}
                        title={message.auteurNom}
                      >
                        {initiales(message.auteurNom)}
                      </span>
                      <div
                        className={cn(
                          'max-w-[75%] px-4 py-2.5 text-sm shadow-[var(--elevation-2)]',
                          deMoi
                            ? 'rounded-2xl rounded-br-md text-white'
                            : 'rounded-2xl rounded-bl-md bg-card',
                        )}
                        style={deMoi ? { backgroundImage: 'var(--gradient-primaire)' } : undefined}
                      >
                        {!deMoi && (
                          <p className="mb-1 text-xs font-semibold text-[var(--couleur-primaire-lisible)]">
                            {message.auteurNom}
                            <span className="font-normal text-muted-foreground">
                              {' '}
                              · {LIBELLE_ROLE[message.auteurRole]}
                            </span>
                          </p>
                        )}
                        <p className="whitespace-pre-wrap leading-relaxed">{message.contenu}</p>
                        <p
                          className={cn(
                            'mt-1 text-right text-[11px]',
                            deMoi ? 'text-white/75' : 'text-muted-foreground',
                          )}
                        >
                          {quand(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={finDuFil} />
              </div>

              <form action={actionReponse} key={active.messages.length} className="p-4 pt-2">
                <input type="hidden" name="conversationId" value={active.id} />
                <div className="flex items-end gap-2 rounded-3xl bg-card p-2 pl-4 shadow-[var(--elevation-3)] transition-shadow focus-within:shadow-[var(--elevation-4)]">
                  <Label htmlFor="reponse" className="sr-only">
                    Votre message
                  </Label>
                  <textarea
                    id="reponse"
                    name="message"
                    rows={1}
                    required
                    placeholder="Écrivez votre message… (Entrée pour envoyer)"
                    className="max-h-40 min-h-10 flex-1 resize-none bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
                    onKeyDown={(evenement) => {
                      // Enter sends, Shift+Enter breaks the line: the
                      // convention of every messaging application.
                      if (evenement.key === 'Enter' && !evenement.shiftKey) {
                        evenement.preventDefault();
                        evenement.currentTarget.form?.requestSubmit();
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={reponseEnCours}
                    className="size-10 shrink-0 rounded-full transition-transform hover:scale-105 active:scale-95"
                    aria-label="Envoyer"
                  >
                    {reponseEnCours ? (
                      <LoaderCircle className="animate-spin" aria-hidden />
                    ) : (
                      <Send aria-hidden />
                    )}
                  </Button>
                </div>
                {etatReponse.erreursChamps?.message && (
                  <p className="mt-2 px-4 text-sm text-destructive">
                    {etatReponse.erreursChamps.message[0]}
                  </p>
                )}
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
