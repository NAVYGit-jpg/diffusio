'use client';

import {
  CircleAlert,
  CircleCheck,
  Download,
  LoaderCircle,
  Upload,
} from 'lucide-react';
import { useActionState, useEffect, useState } from 'react';
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
  importerUtilisateursAction,
  type EtatImportUtilisateurs,
} from '@/lib/actions/import-utilisateurs';

const ETAT_INITIAL: EtatImportUtilisateurs = {};

export function DialogueImportUtilisateurs({
  desactive,
}: {
  desactive: boolean;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [etat, action, enCours] = useActionState(
    importerUtilisateursAction,
    ETAT_INITIAL,
  );

  useEffect(() => {
    if (etat.applique) {
      setOuvert(false);
      toast.success(
        `${etat.nombreCrees} compte(s) créé(s), ${etat.nombreInvitations} invitation(s) envoyée(s).`,
      );
    }
  }, [etat]);

  const rapport = etat.rapport;
  const bloquant =
    !rapport ||
    rapport.colonnesManquantes.length > 0 ||
    rapport.erreurs.length > 0 ||
    rapport.aCreer.length === 0;
  const analyseFaite = Boolean(rapport) && !etat.applique;

  return (
    <>
      <Button variant="outline" onClick={() => setOuvert(true)} disabled={desactive}>
        <Upload aria-hidden />
        Importer depuis Excel
      </Button>

      <Dialog open={ouvert} onOpenChange={setOuvert}>
        <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importer des utilisateurs</DialogTitle>
            <DialogDescription>
              Chaque compte créé recevra une invitation pour choisir son mot de
              passe. Rien n&apos;est enregistré tant que vous n&apos;avez pas
              confirmé.
            </DialogDescription>
          </DialogHeader>

          <Alert>
            <Download aria-hidden />
            <AlertDescription>
              <a
                href="/api/modeles/utilisateurs"
                className="font-medium underline underline-offset-4"
              >
                Téléchargez le modèle Excel
              </a>{' '}
              : il contient les bonnes colonnes, un mode d&apos;emploi et la
              liste des codes de vos structures.
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
              <Label htmlFor="fichierUtilisateurs">Fichier Excel (.xlsx)</Label>
              <Input
                id="fichierUtilisateurs"
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
                  Colonnes obligatoires absentes :{' '}
                  <strong>{rapport.colonnesManquantes.join(', ')}</strong>.
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
                    compte(s) à créer
                  </li>
                  {rapport!.dejaExistants.length > 0 && (
                    <li>
                      {rapport!.dejaExistants.length} ligne(s) ignorée(s), adresse
                      déjà enregistrée : {rapport!.dejaExistants.join(', ')}
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

            {rapport && rapport.erreurs.length > 0 && (
              <div className="max-h-64 overflow-y-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Ligne</TableHead>
                      <TableHead className="w-44">Colonne</TableHead>
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
                  {rapport!.aCreer.length} compte(s) et envoyer leurs invitations.
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
