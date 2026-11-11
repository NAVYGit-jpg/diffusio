import { BookOpen, Clock, Layers, LineChart } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { StatistiquesCatalogue } from '@/lib/catalogue/statistiques';
import { CarteIndicateur } from '../tableau-de-bord/cartes';

function Barres({ parts }: { parts: { libelle: string; nombre: number }[] }) {
  const maximum = Math.max(1, ...parts.map((part) => part.nombre));

  return (
    <ul className="space-y-2.5">
      {parts.slice(0, 6).map((part) => (
        <li key={part.libelle} className="grid grid-cols-[minmax(0,9rem)_1fr_2rem] items-center gap-3 text-sm">
          <span className="truncate text-muted-foreground">{part.libelle}</span>
          <span className="h-2 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full"
              style={{ width: `${(part.nombre / maximum) * 100}%`, backgroundImage: 'var(--gradient-primaire)' }}
            />
          </span>
          <span className="text-right font-medium tabular-nums">{part.nombre}</span>
        </li>
      ))}
    </ul>
  );
}

/** Headline figures and breakdowns of the catalogue (cahier des charges §5). */
export function StatistiquesCatalogueVue({ stats }: { stats: StatistiquesCatalogue }) {
  return (
    <section aria-label="Statistiques du catalogue" className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <CarteIndicateur misEnAvant libelle="Produits au catalogue" valeur={stats.total} precision={`${stats.actifs} actif(s)`} icone={Layers} />
        <CarteIndicateur libelle="Publications" valeur={stats.publications} precision={`${stats.structuresCouvertes} structure(s)`} icone={BookOpen} />
        <CarteIndicateur libelle="Indicateurs" valeur={stats.indicateurs} precision={`${stats.domainesCouverts} domaine(s) couvert(s)`} icone={LineChart} />
        <CarteIndicateur
          libelle="Délai moyen de diffusion"
          valeur={stats.delaiMoyen === null ? null : `${stats.delaiMoyen}`}
          unite="j"
          precision="Entre fin de période et diffusion"
          icone={Clock}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Par périodicité</CardTitle></CardHeader>
          <CardContent><Barres parts={stats.parPeriodicite} /></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Par domaine</CardTitle></CardHeader>
          <CardContent><Barres parts={stats.parDomaine} /></CardContent>
        </Card>
      </div>
    </section>
  );
}
