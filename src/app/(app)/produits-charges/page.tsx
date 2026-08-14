import { PackageCheck } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { exigerActeur } from '@/lib/auth/session';
import { normaliserJour } from '@/lib/calendrier/dates';
import {
  estChargee,
  estChargeeIncompletement,
  joursAvantEcheance,
} from '@/lib/calendrier/selection';
import { equipeOrganisation } from '@/lib/notifications/destinataires';
import {
  chargerChoixFiltres,
  chargerLignesLivrables,
  critereSelection,
} from '@/lib/livrables/vues';
import {
  lireParametre,
  lireParametres,
} from '@/lib/tableau-bord/filtres-url';
import { FiltresLivrables } from '../_livrables/filtres-livrables';
import { ListeLivrables } from '../_livrables/liste-livrables';

export const metadata: Metadata = {
  title: 'Produits chargés — DIFFUSIO',
};

/**
 * Everything already handed over (§9.1, §6, §7).
 *
 * A line appears as soon as a file is stored **or** an indicator value is
 * filled in — not only once it is complete. A publication whose PDF is in but
 * whose figures are missing is precisely the one somebody has to come back to;
 * hiding it until it is finished would hide the work in progress.
 */
export default async function PageProduitsCharges({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const acteur = await exigerActeur();
  const aujourdhui = new Date();
  const parametres = await searchParams;

  const anneeBrute = lireParametre(parametres, 'annee');
  const anneeDemandee = anneeBrute === null ? null : Number(anneeBrute);
  // Une année illisible dans l'adresse n'est pas une erreur : on retombe sur
  // « toutes les années » plutôt que d'afficher un écran vide.
  const annee =
    anneeDemandee !== null && Number.isInteger(anneeDemandee)
      ? anneeDemandee
      : null;

  const structureIds = lireParametres(parametres, 'structure');

  const [toutes, choix] = await Promise.all([
    chargerLignesLivrables(acteur, {
      ...(annee === null ? {} : { annee }),
      structureIds,
    }),
    chargerChoixFiltres(acteur),
  ]);

  const lignes = toutes
    .filter((ligne) => estChargee(critereSelection(ligne)))
    .map((ligne) => ({
      ...ligne,
      joursRestants: joursAvantEcheance(
        { dateDiffusionPrevue: new Date(ligne.dateDiffusionPrevue) },
        aujourdhui,
      ),
      incomplet: estChargeeIncompletement(critereSelection(ligne)),
      // §10 — a publication that came out late is neither a success nor an
      // ongoing delay; it deserves to be named for what it is.
      publieeEnRetard:
        ligne.dateDiffusionReelle !== null &&
        normaliserJour(new Date(ligne.dateDiffusionReelle)).getTime() >
          normaliserJour(new Date(ligne.dateDiffusionPrevue)).getTime(),
    }))
    // Most recent deadline first: what has just been handed over is what people
    // come here to check.
    .sort(
      (a, b) =>
        new Date(b.dateDiffusionPrevue).getTime() -
        new Date(a.dateDiffusionPrevue).getTime(),
    );

  const livrees = lignes.filter((ligne) => ligne.statut === 'TELEVERSE').length;
  const publiees = lignes.filter((ligne) => ligne.statut === 'MIS_EN_LIGNE').length;
  const publieesEnRetard = lignes.filter((ligne) => ligne.publieeEnRetard).length;
  const structuresDistinctes = new Set(lignes.map((ligne) => ligne.structureId));
  const filtreActif = annee !== null || structureIds.length > 0;

  // Offered when publishing; only the super administrator's team is chosen from,
  // the structure's own team being always in copy.
  const membresCoordination = await equipeOrganisation(acteur.organisationId);

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Produits chargés</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Les publications et indicateurs dont les fichiers ont été déposés ou
          les valeurs renseignées. Ouvrez une ligne pour consulter les fichiers
          ou corriger une valeur.
        </p>
      </header>

      <FiltresLivrables
        chemin="/produits-charges"
        annee={annee}
        structureIds={structureIds}
        annees={choix.annees}
        structures={choix.structures}
      />

      {lignes.length === 0 && filtreActif ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <PackageCheck
            className="mx-auto size-8 text-muted-foreground"
            aria-hidden
          />
          <h2 className="mt-4 font-medium">
            Aucun produit chargé pour ce filtre
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            Des produits ont été chargés ailleurs, mais aucun ne correspond à
            l&apos;année ou aux structures que vous avez choisies.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/produits-charges">Retirer les filtres</Link>
          </Button>
        </div>
      ) : lignes.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <PackageCheck
            className="mx-auto size-8 text-muted-foreground"
            aria-hidden
          />
          <h2 className="mt-4 font-medium">Rien n&apos;a encore été chargé</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            Cet écran réunira les publications dont le fichier a été déposé et
            les indicateurs dont la valeur a été saisie. Déposez un premier
            livrable depuis le calendrier.
          </p>
          <Button asChild variant="outline" className="mt-6">
            <Link href="/calendrier">Aller au calendrier</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total chargé</CardDescription>
                <CardTitle className="text-2xl tabular-nums">
                  {lignes.length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Livrés, en attente de publication</CardDescription>
                <CardTitle className="text-2xl tabular-nums text-amber-700 dark:text-amber-400">
                  {livrees}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Publiés</CardDescription>
                <CardTitle className="text-2xl tabular-nums text-emerald-700 dark:text-emerald-400">
                  {publiees}
                </CardTitle>
                {publieesEnRetard > 0 && (
                  <p className="text-xs text-muted-foreground">
                    dont {publieesEnRetard} après l&apos;échéance
                  </p>
                )}
              </CardHeader>
            </Card>
          </div>

          <Card className="mb-4">
            <CardContent className="py-1 text-sm text-muted-foreground">
              Une ligne reste <strong>Livré</strong> tant qu&apos;un
              administrateur n&apos;a pas confirmé la mise en ligne ; elle passe
              alors à <strong>Publié</strong>. Une publication déjà publiée se
              consulte mais ne se remplace plus.
            </CardContent>
          </Card>

          <ListeLivrables
            lignes={lignes}
            role={acteur.role}
            colonneEcheance="chargee"
            afficherStructure={structuresDistinctes.size > 1}
            membresCoordination={membresCoordination}
          />
        </>
      )}
    </div>
  );
}
