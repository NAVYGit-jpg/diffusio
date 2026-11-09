/**
 * Placement of the numbered markers drawn over the documentation screenshots.
 *
 * Shared by the web page (SVG) and the PDF (react-pdf Svg), so both show the
 * same arrows. Boxes come from documentation/captures/reperes.json, in percent
 * of the screenshot; everything here works in screenshot pixels.
 */

export type Boite = { x: number; y: number; l: number; h: number };

export type ReperesCapture = {
  largeur: number;
  hauteur: number;
  reperes: Record<string, Boite>;
};

export type Repere = {
  numero: number;
  /** Highlighted area, in pixels. */
  zone: { x: number; y: number; l: number; h: number };
  pastille: { x: number; y: number };
  /** Absent when the marker sits on the element itself. */
  fleche?: { x1: number; y1: number; x2: number; y2: number; pointe: string };
};

export const RAYON_PASTILLE = 19;
const ECART = 78;

function dans(px: number, py: number, z: Repere['zone'], marge = 0) {
  return px > z.x - marge && px < z.x + z.l + marge && py > z.y - marge && py < z.y + z.h + marge;
}

export function placerReperes(capture: ReperesCapture): Repere[] {
  const { largeur: W, hauteur: H } = capture;
  const places: { x: number; y: number }[] = [];

  return Object.entries(capture.reperes)
    .map(([numero, b]) => ({ numero: Number(numero), b }))
    .sort((a, b) => a.numero - b.numero)
    .map(({ numero, b }) => {
      const zone = { x: (b.x / 100) * W, y: (b.y / 100) * H, l: (b.l / 100) * W, h: (b.h / 100) * H };
      const cx = zone.x + zone.l / 2;
      const cy = zone.y + zone.h / 2;
      const r = RAYON_PASTILLE;

      // Candidates around the box, the side with the most room first.
      const gauche = cx > W / 2;
      const candidats = [
        { x: gauche ? zone.x - ECART : zone.x + zone.l + ECART, y: zone.y - ECART * 0.55 },
        { x: gauche ? zone.x - ECART : zone.x + zone.l + ECART, y: zone.y + zone.h + ECART * 0.55 },
        { x: cx, y: zone.y - ECART },
        { x: cx, y: zone.y + zone.h + ECART },
        { x: gauche ? zone.x + zone.l + ECART : zone.x - ECART, y: cy },
        { x: gauche ? zone.x - ECART : zone.x + zone.l + ECART, y: cy },
      ];

      const libre = (p: { x: number; y: number }) =>
        p.x > r + 6 &&
        p.x < W - r - 6 &&
        p.y > r + 6 &&
        p.y < H - r - 6 &&
        !dans(p.x, p.y, zone, r + 4) &&
        places.every((q) => Math.hypot(q.x - p.x, q.y - p.y) > r * 2.6);

      const choisi = candidats.find(libre);

      if (!choisi) {
        // No room outside: the marker sits on the element's top-left corner.
        const pastille = {
          x: Math.min(Math.max(zone.x + r + 4, r + 4), W - r - 4),
          y: Math.min(Math.max(zone.y + r + 4, r + 4), H - r - 4),
        };
        places.push(pastille);
        return { numero, zone, pastille };
      }

      places.push(choisi);

      // Arrow from the marker to the nearest point of the box border.
      const ax = Math.min(Math.max(choisi.x, zone.x), zone.x + zone.l);
      const ay = Math.min(Math.max(choisi.y, zone.y), zone.y + zone.h);
      const dx = ax - choisi.x;
      const dy = ay - choisi.y;
      const d = Math.hypot(dx, dy) || 1;
      const ux = dx / d;
      const uy = dy / d;
      const x1 = choisi.x + ux * (r + 3);
      const y1 = choisi.y + uy * (r + 3);
      const x2 = ax - ux * 3;
      const y2 = ay - uy * 3;
      const t = 13;
      const base = { x: x2 - ux * t, y: y2 - uy * t };
      const pointe = [
        `${x2},${y2}`,
        `${base.x - uy * t * 0.55},${base.y + ux * t * 0.55}`,
        `${base.x + uy * t * 0.55},${base.y - ux * t * 0.55}`,
      ].join(' ');

      return { numero, zone, pastille: choisi, fleche: { x1, y1, x2: base.x, y2: base.y, pointe } };
    });
}

/** Splits `**bold**` markup into runs. */
export function segmentsGras(texte: string): { texte: string; gras: boolean }[] {
  return texte
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((morceau) =>
      morceau.startsWith('**') && morceau.endsWith('**')
        ? { texte: morceau.slice(2, -2), gras: true }
        : { texte: morceau, gras: false },
    );
}
