'use client';

import { Building2, CircleAlert, LoaderCircle, Pencil, Plus } from 'lucide-react';
import { useActionState, useEffect, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
  basculerActivationStructureAction,
  enregistrerStructureAction,
  type EtatStructure,
} from '@/lib/actions/structures';
import { parentsPossibles } from '@/lib/structures/arborescence';
import {
  LIBELLE_TYPE_STRUCTURE,
  TYPES_STRUCTURE,
} from '@/lib/structures/schemas';

type Structure = {
  id: string;
  nom: string;
  sigle: string;
  code: string;
  type: string;
  parentId: string | null;
  actif: boolean;
  description: string | null;
  profondeur: number;
  _count: { pointsFocaux: number; publications: number };
};

const ETAT_INITIAL: EtatStructure = {};

export function TableauStructures({ structures }: { structures: Structure[] }) {
  const [ouvert, setOuvert] = useState(false);
  const [enEdition, setEnEdition] = useState<Structure | null>(null);
  const [etat, action, enCours] = useActionState(
    enregistrerStructureAction,
    ETAT_INITIAL,
  );
  const [bascule, demarrerBascule] = useTransition();

  // Closing on success has to happen after the action resolves, not on submit.
  useEffect(() => {
    if (etat.succes) {
      setOuvert(false);
      setEnEdition(null);
      toast.success('Structure enregistrée.');
    }
  }, [etat]);

  const ouvrirCreation = () => {
    setEnEdition(null);
    setOuvert(true);
  };

  const ouvrirEdition = (structure: Structure) => {
    setEnEdition(structure);
    setOuvert(true);
  };

  const basculerActivation = (structure: Structure) => {
    const message = structure.actif
      ? `Désactiver « ${structure.nom} » ?\n\nLa structure restera visible dans l'historique, mais ne pourra plus recevoir de nouvelles publications ni de nouveaux points focaux.`
      : `Réactiver « ${structure.nom} » ?`;

    if (!window.confirm(message)) {
      return;
    }

    demarrerBascule(async () => {
      const resultat = await basculerActivationStructureAction(structure.id);

      if (resultat.erreur) {
        toast.error(resultat.erreur);
      } else {
        toast.success(structure.actif ? 'Structure désactivée.' : 'Structure réactivée.');
      }
    });
  };

  const parents = parentsPossibles(structures, enEdition?.id ?? null);
  const champs = etat.erreursChamps;

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={ouvrirCreation}>
          <Plus aria-hidden />
          Nouvelle structure
        </Button>
      </div>

      {structures.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Building2
            className="mx-auto size-8 text-muted-foreground"
            aria-hidden
          />
          <h2 className="mt-4 font-medium">Aucune structure pour le moment</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Commencez par créer votre structure de plus haut niveau — par exemple
            votre ministère ou votre direction générale. Vous pourrez ensuite y
            rattacher les directions et services qui en dépendent.
          </p>
          <Button className="mt-6" onClick={ouvrirCreation}>
            <Plus aria-hidden />
            Créer la première structure
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Structure</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Points focaux</TableHead>
                <TableHead className="text-right">Publications</TableHead>
                <TableHead className="w-40 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {structures.map((structure) => (
                <TableRow key={structure.id} className={structure.actif ? '' : 'opacity-55'}>
                  <TableCell>
                    <div
                      className="flex items-center gap-2"
                      style={{ paddingLeft: `${structure.profondeur * 1.5}rem` }}
                    >
                      {structure.profondeur > 0 && (
                        <span aria-hidden className="text-muted-foreground">
                          └
                        </span>
                      )}
                      <span className="font-medium">{structure.nom}</span>
                      <span className="text-xs text-muted-foreground">
                        {structure.sigle}
                      </span>
                      {!structure.actif && (
                        <Badge variant="secondary">Désactivée</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{structure.code}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {LIBELLE_TYPE_STRUCTURE[
                      structure.type as keyof typeof LIBELLE_TYPE_STRUCTURE
                    ] ?? structure.type}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {structure._count.pointsFocaux}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {structure._count.publications}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => ouvrirEdition(structure)}
                      aria-label={`Modifier ${structure.nom}`}
                    >
                      <Pencil aria-hidden />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={bascule}
                      onClick={() => basculerActivation(structure)}
                    >
                      {structure.actif ? 'Désactiver' : 'Réactiver'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={ouvert} onOpenChange={setOuvert}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {enEdition ? 'Modifier la structure' : 'Nouvelle structure'}
            </DialogTitle>
            <DialogDescription>
              Le code identifie la structure de façon unique. Il servira aux
              imports et aux exports.
            </DialogDescription>
          </DialogHeader>

          {etat.erreur && (
            <Alert variant="destructive">
              <CircleAlert aria-hidden />
              <AlertDescription>{etat.erreur}</AlertDescription>
            </Alert>
          )}

          {/* `key` forces React to rebuild the uncontrolled fields when the
              edited structure changes, otherwise the previous values stick. */}
          <form key={enEdition?.id ?? 'creation'} action={action} className="space-y-4">
            {enEdition && <input type="hidden" name="id" value={enEdition.id} />}

            <div className="space-y-2">
              <Label htmlFor="nom">Nom</Label>
              <Input
                id="nom"
                name="nom"
                defaultValue={enEdition?.nom ?? ''}
                required
                aria-invalid={Boolean(champs?.nom)}
              />
              {champs?.nom && (
                <p className="text-sm text-destructive">{champs.nom[0]}</p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sigle">Sigle</Label>
                <Input
                  id="sigle"
                  name="sigle"
                  defaultValue={enEdition?.sigle ?? ''}
                  required
                  aria-invalid={Boolean(champs?.sigle)}
                />
                {champs?.sigle && (
                  <p className="text-sm text-destructive">{champs.sigle[0]}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Code</Label>
                <Input
                  id="code"
                  name="code"
                  defaultValue={enEdition?.code ?? ''}
                  required
                  className="font-mono"
                  aria-invalid={Boolean(champs?.code)}
                />
                {champs?.code && (
                  <p className="text-sm text-destructive">{champs.code[0]}</p>
                )}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select name="type" defaultValue={enEdition?.type ?? 'DIRECTION'}>
                  <SelectTrigger id="type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES_STRUCTURE.map((type) => (
                      <SelectItem key={type} value={type}>
                        {LIBELLE_TYPE_STRUCTURE[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="parentId">Structure parente</Label>
                <Select
                  name="parentId"
                  defaultValue={enEdition?.parentId ?? 'aucune'}
                >
                  <SelectTrigger id="parentId" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aucune">Aucune (niveau racine)</SelectItem>
                    {parents.map((parent) => (
                      <SelectItem key={parent.id} value={parent.id}>
                        {parent.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {champs?.parentId && (
                  <p className="text-sm text-destructive">{champs.parentId[0]}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (facultatif)</Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={enEdition?.description ?? ''}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOuvert(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={enCours}>
                {enCours && <LoaderCircle className="animate-spin" aria-hidden />}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
