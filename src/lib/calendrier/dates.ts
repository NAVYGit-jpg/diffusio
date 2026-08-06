/**
 * Date primitives for the calendar engine (cahier des charges §5).
 *
 * Every date here is a **calendar day**, never an instant. They are built and
 * read exclusively in UTC: using local time would shift a "31 December" to the
 * 30th or the 1st depending on the server's timezone, and the whole product is
 * about dates being exactly right.
 */

/** Builds a calendar day. `mois` is 1-based, as people write it. */
export function jour(annee: number, mois: number, jourDuMois: number): Date {
  return new Date(Date.UTC(annee, mois - 1, jourDuMois));
}

/** Strips any time part, keeping the calendar day in UTC. */
export function normaliserJour(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/** Last day of a month, leap years included. Day 0 of month m+1 is the trick. */
export function dernierJourDuMois(annee: number, mois: number): Date {
  return new Date(Date.UTC(annee, mois, 0));
}

export function ajouterJours(date: Date, nombre: number): Date {
  const resultat = new Date(date.getTime());
  resultat.setUTCDate(resultat.getUTCDate() + nombre);
  return resultat;
}

/** True for Saturday and Sunday. */
export function estWeekend(date: Date): boolean {
  const jourSemaine = date.getUTCDay();
  return jourSemaine === 0 || jourSemaine === 6;
}

export type JourFerie = {
  date: Date;
  /** Falls on the same month and day every year (1 January, Christmas…). */
  recurrentAnnuel: boolean;
};

export function estFerie(date: Date, feries: readonly JourFerie[]): boolean {
  const cible = normaliserJour(date);

  return feries.some((ferie) => {
    const reference = normaliserJour(ferie.date);

    if (ferie.recurrentAnnuel) {
      return (
        reference.getUTCMonth() === cible.getUTCMonth() &&
        reference.getUTCDate() === cible.getUTCDate()
      );
    }

    return reference.getTime() === cible.getTime();
  });
}

/** A working day is neither a weekend day nor a public holiday. */
export function estJourOuvre(date: Date, feries: readonly JourFerie[]): boolean {
  return !estWeekend(date) && !estFerie(date, feries);
}

/**
 * Moves a date to the next working day, if it is not one already.
 *
 * Bounded to a year: a table of holidays covering every day would otherwise
 * loop forever.
 */
export function reporterAuJourOuvre(
  date: Date,
  feries: readonly JourFerie[],
): Date {
  let courant = normaliserJour(date);

  for (let essai = 0; essai < 366; essai += 1) {
    if (estJourOuvre(courant, feries)) {
      return courant;
    }
    courant = ajouterJours(courant, 1);
  }

  return courant;
}

/** Formats a day as DD/MM/YYYY (§ règle de conduite 5). */
export function formaterJJMMAAAA(date: Date): string {
  const j = String(date.getUTCDate()).padStart(2, '0');
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${j}/${m}/${date.getUTCFullYear()}`;
}

/** ISO calendar day, for storage and comparison. */
export function formaterISO(date: Date): string {
  return normaliserJour(date).toISOString().slice(0, 10);
}
