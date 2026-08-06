'use client';

import {
  CircleAlert,
  CircleCheck,
  Download,
  LoaderCircle,
  Upload,
} from 'lucide-react';
import { useActionState, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  importerStructuresAction,
  type EtatImport,
} from '@/lib/actions/import-structures';

const ETAT_INITIAL: EtatImport = {};

export function DialogueImport() {
  const [ouvert, setOuvert] = useState(false);
  const [etat, action, enCours] = useActionState(
    importerStructuresAction,
    ETAT_INITIAL,
  );
  const champFichier = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (etat.applique) {
      setOuvert(false);
      toast.success(
        `${etat.nombreCrees} structure(s) créée(s) depuis le fichier.`,
      );
    }
  }, [etat]);

  const rapport = etat.rapport;
  const cycliques = etat.cycliques ?? [];
  const bloquant =
    !rapport ||
    rapport.colonnesManquantes.length > 0 ||
    rapport.erreurs.length > 0 ||
    cycliques.length > 0;
  const analyseFaite = Boolean(rapport) && !etat.applique;

  return (
    <>
      <Button variant="outline" onClick={() => setOuvert(true)}>
        <Upload aria-hidden />
        Importer depuis Excel
      </Button>

      <Dialog open={ouvert} onOpenChange={setOuvert}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importer des structures</DialogTitle>
            <DialogDescription>
              Rien n&apos;est enregistré tant que vous n&apos;avez pas confirmé.
              L&apos;application contrôle d&apos;abord le fichier ligne par ligne.
            </DialogDescription>
          </DialogHeader>

          <Alert>
            <Download aria-hidden />
            <AlertDescription>
              Première fois ?{' '}
              <a
                href="/api/modeles/structures"
                className="font-medium underline underline-offset-4"
              >
                Téléchargez le modèle Excel
              </a>{' '}
              : il contient les bonnes colonnes, trois exemples et un mode
              d&apos;emploi.
            </AlertDescription>
          </Alert>

          {etat.erreur && (
            <Alert variant="destructive">
              <CircleAlert aria-hidden />
              <AlertDescription>{etat.erreur}</AlertDescription>
            </Alert>
          )}

          <form action={action} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fichier">Fichier Excel (.xlsx)</Label>
              <Input
                ref={champFichier}
                id="fichier"
                name="fichier"
                type="file"
                accept=".xlsx,.xlsm"
                required
              />
            </div>

            {rapport && rapport.colonnesManquantes.length > 0 && (
              <Alert variant="destructive">
                <CircleAlert aria-hidden />
                <AlertDescription>
                  Colonnes obligatoires absentes du fichier :{' '}
                  <strong>{rapport.colonnesManquantes.join(', ')}</strong>. Utilisez
                  le modèle pour repartir sur de bonnes bases.
                </AlertDescription>
              </Alert>
            )}

            {analyseFaite && rapport!.colonnesManquantes.length === 0 && (
              <div className="space-y-3 rounded-md border p-3 text-sm">
                <p className="font-medium">Résultat du contrôle</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>
                    <strong className="text-foreground">
                      {rapport!.aCreer.length}
                    </strong>{' '}
                    structure(s) à créer
                  </li>
                  {rapport!.dejaExistants.length > 0 && (
                    <li>
                      {rapport!.dejaExistants.length} ligne(s) ignorée(s), code déjà
                      présent : {rapport!.dejaExistants.join(', ')}
                    </li>
                  )}
                  {rapport!.lignesIgnorees > 0 && (
                    <li>{rapport!.lignesIgnorees} ligne(s) vide(s) ignorée(s)</li>
                  )}
                  <li
                    className={
                      rapport!.erreurs.length > 0 ? 'text-destructive' : undefined
                    }
                  >
                    {rapport!.erreurs.length} erreur(s)
                  </li>
                </ul>
              </div>
            )}

            {cycliques.length > 0 && (
              <Alert variant="destructive">
                <CircleAlert aria-hidden />
                <AlertDescription>
                  Ces structures se désignent mutuellement comme parentes, ce qui
                  est impossible :{' '}
                  <strong>{cycliques.map((c) => c.code).join(', ')}</strong>.
                </AlertDescription>
              </Alert>
            )}

            {rapport && rapport.erreurs.length > 0 && (
              <div className="max-h-64 overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Ligne</TableHead>
                      <TableHead className="w-32">Colonne</TableHead>
                      <TableHead>Problème</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rapport.erreurs.map((erreur, index) => (
                      <TableRow key={`${erreur.ligne}-${index}`}>
                        <TableCell className="tabular-nums">{erreur.ligne}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {erreur.colonne ?? '—'}
                        </TableCell>
                        <TableCell>{erreur.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {analyseFaite && !bloquant && (
              <Alert>
                <CircleCheck aria-hidden />
                <AlertDescription>
                  Le fichier est valide. Confirmez pour créer les{' '}
                  {rapport!.aCreer.length} structure(s).
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOuvert(false)}
              >
                Fermer
              </Button>

              {/* Both buttons submit the same form; the second one carries the
                  confirmation flag, so the file is sent again with it. */}
              <Button type="submit" variant="secondary" disabled={enCours}>
                {enCours && <LoaderCircle className="animate-spin" aria-hidden />}
                Contrôler le fichier
              </Button>

              <Button
                type="submit"
                name="confirmer"
                value="1"
                disabled={enCours || bloquant}
              >
                Confirmer l&apos;import
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
