'use client';

import { Check, LoaderCircle, Plus, X } from 'lucide-react';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { creerDomaineAction } from '@/lib/actions/catalogue';

type Domaine = { id: string; nom: string };

/**
 * Domain picker with « add a domain » built in.
 *
 * A missing domain is created on the spot and selected; it joins the list for
 * the rest of the session and, the page being revalidated, for every later
 * form too.
 */
export function ChoixDomaine({
  identifiant,
  domaines,
  valeur,
  onChange,
  desactive = false,
}: {
  identifiant: string;
  domaines: Domaine[];
  valeur: string;
  onChange: (id: string) => void;
  desactive?: boolean;
}) {
  const [ajoutes, setAjoutes] = useState<Domaine[]>([]);
  const [saisie, setSaisie] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const liste = [...domaines, ...ajoutes.filter((a) => !domaines.some((d) => d.id === a.id))].sort((a, b) =>
    a.nom.localeCompare(b.nom, 'fr'),
  );

  const creer = () =>
    demarrer(async () => {
      const resultat = await creerDomaineAction(saisie ?? '');
      if (resultat.erreur || !resultat.domaine) {
        toast.error(resultat.erreur ?? 'Domaine non créé.');
        return;
      }
      const domaine = resultat.domaine;
      setAjoutes((avant) => [...avant, domaine]);
      onChange(domaine.id);
      setSaisie(null);
      toast.success(`Domaine « ${domaine.nom} » ajouté.`);
    });

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Select name="domaineId" value={valeur || undefined} onValueChange={onChange} disabled={desactive}>
          <SelectTrigger id={identifiant} className="w-full">
            <SelectValue placeholder="À sélectionner" />
          </SelectTrigger>
          <SelectContent>
            {liste.map((domaine) => (
              <SelectItem key={domaine.id} value={domaine.id}>
                {domaine.nom}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!desactive && saisie === null && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            onClick={() => setSaisie('')}
            aria-label="Ajouter un domaine"
            title="Ajouter un domaine"
          >
            <Plus aria-hidden />
          </Button>
        )}
      </div>

      {saisie !== null && (
        <div className="surgir flex gap-2">
          <Input
            autoFocus
            value={saisie}
            onChange={(evenement) => setSaisie(evenement.target.value)}
            onKeyDown={(evenement) => {
              if (evenement.key === 'Enter') {
                evenement.preventDefault();
                creer();
              }
            }}
            placeholder="Nom du nouveau domaine"
          />
          <Button type="button" size="icon" onClick={creer} disabled={enCours} aria-label="Créer le domaine">
            {enCours ? <LoaderCircle className="animate-spin" aria-hidden /> : <Check aria-hidden />}
          </Button>
          <Button type="button" size="icon" variant="ghost" onClick={() => setSaisie(null)} aria-label="Annuler">
            <X aria-hidden />
          </Button>
        </div>
      )}
    </div>
  );
}
