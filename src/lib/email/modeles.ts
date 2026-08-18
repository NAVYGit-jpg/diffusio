import 'server-only';

import { adresseApplication } from './adresse';

/**
 * E-mail bodies.
 *
 * Kept as plain functions for now. §8.4 asks for templates editable by the
 * super admin through the `ModeleEmail` table; these become the built-in
 * defaults when that screen arrives in Phase 9.
 */

type Organisation = {
  nom: string;
  sigle: string;
  couleurPrimaire: string;
  logoUrl: string | null;
};

/** Absolute address of the DIFFUSIO wordmark. See `adresseApplication`. */
function adresseLogo(): string {
  return `${adresseApplication()}/logo-diffusio.png`;
}

/**
 * Shared frame of every message.
 *
 * The card is white, so the dark-ink version of the logo is the right one — a
 * mail client has no dark-mode variable to read, unlike the application.
 *
 * When the organisation has its own logo it takes the header, and DIFFUSIO
 * signs the footer: the recipient must recognise their institution first, the
 * tool second.
 */
function enveloppe(organisation: Organisation, contenu: string): string {
  const logoDiffusio = adresseLogo();

  // Centred, as the message templates ask. `margin:0 auto` on a block image is
  // the only centring every mail client honours — `text-align` alone fails in
  // Outlook.
  const enTete = organisation.logoUrl
    ? `<img src="${organisation.logoUrl}" alt="${organisation.nom}" style="max-height:44px;display:block;margin:0 auto">`
    : `<img src="${logoDiffusio}" alt="DIFFUSIO" width="180" style="max-height:34px;width:auto;display:block;margin:0 auto">`;

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
</head>
<body style="margin:0;padding:24px;background:#f4f4f5;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#18181b">
  <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:10px;border:1px solid #e4e4e7">
    <tr>
      <td align="center" style="padding:20px 24px;border-bottom:3px solid ${organisation.couleurPrimaire};text-align:center">
        ${enTete}
      </td>
    </tr>

    <tr><td style="padding:24px;line-height:1.6;font-size:15px">${contenu}</td></tr>

    <tr>
      <td style="padding:16px 24px;border-top:1px solid #e4e4e7">
        <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%">
          <tr>
            <td style="vertical-align:middle">
              <img src="${logoDiffusio}" alt="DIFFUSIO" width="104" style="max-height:20px;width:auto;display:block;opacity:0.55">
            </td>
            <td style="text-align:right;font-size:12px;color:#71717a;line-height:1.5">
              Message automatique envoyé pour ${organisation.nom}.<br>
              Merci de ne pas répondre à cet e-mail.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export type TypeProduit = 'PUBLICATION' | 'INDICATEUR';

/**
 * How to name the product, and how to agree what follows it.
 *
 * "La publication … a été mise en ligne" but "L'indicateur … a été mis en
 * ligne". Writing the agreement out is worth the few lines: a message that goes
 * to a director of cabinet with "publié(e)" in it reads as unfinished.
 */
function designation(type: TypeProduit) {
  return type === 'PUBLICATION'
    ? {
        sujet: 'La publication',
        accord: 'e',
      }
    : {
        sujet: 'L’indicateur',
        accord: '',
      };
}

/** Salutation line shared by the three automatic messages. */
function salutation(nomPointFocal: string): string {
  return `Bonjour ${nomPointFocal},`;
}

const FORMULE_SANTE =
  'Nous espérons que ce message vous trouve en bonne santé.';

/**
 * Publication-is-online notice (§7).
 *
 * The QR code is fetched from the application rather than embedded as a base64
 * `data:` URI. Gmail strips `data:` image sources outright, so the code showed
 * as a broken frame — see `app/api/qr/[ligneId]`.
 *
 * The address is not repeated in running text: the button carries it, and it
 * still works when a mail client refuses images, being a link and not a
 * picture. The plain-text version keeps the address written out, having no
 * button to offer.
 */
export function modeleMiseEnLigne(params: {
  organisation: Organisation;
  typeProduit: TypeProduit;
  nomElement: string;
  nomPointFocal: string;
  periode: string;
  dateDebutCouverture: string;
  dateFinCouverture: string;
  dateDiffusionPrevue: string;
  dateDiffusionReelle: string;
  lien: string;
  qrCodeUrl: string;
  valeur?: string | null;
  unite?: string | null;
}): { sujet: string; corpsHtml: string; corpsTexte: string } {
  const sujet = `Mise en ligne de : ${params.nomElement}`;
  const { sujet: produit, accord } = designation(params.typeProduit);

  const phrase = `${produit} ${params.nomElement}, couvrant la période du ${params.dateDebutCouverture} au ${params.dateFinCouverture}, a été mis${accord} en ligne à la date du ${params.dateDiffusionReelle}.`;

  const ligneValeur =
    params.valeur != null && params.valeur !== ''
      ? `\n  • Valeur : ${params.valeur}${params.unite ? ` ${params.unite}` : ''}`
      : '';

  const corpsTexte = `${salutation(params.nomPointFocal)}

${FORMULE_SANTE}

${phrase}

Informations complémentaires :
  • Date de publication prévue : ${params.dateDiffusionPrevue}${ligneValeur}

Lien de la publication : ${params.lien}

Cordialement,`;

  const corpsHtml = enveloppe(
    params.organisation,
    `<p>${salutation(params.nomPointFocal)}</p>

     <p>${FORMULE_SANTE}</p>

     <p><strong>${produit} ${params.nomElement}</strong>, couvrant la période du
        ${params.dateDebutCouverture} au ${params.dateFinCouverture}, a été
        mis${accord} en ligne à la date du
        <strong>${params.dateDiffusionReelle}</strong>.</p>

     <p style="margin-top:20px;margin-bottom:4px">Informations complémentaires :</p>
     <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px">
       <tr>
         <td style="padding:4px 0;color:#71717a">Date de publication prévue</td>
         <td style="padding:4px 0">${params.dateDiffusionPrevue}</td>
       </tr>
       ${
         params.valeur != null && params.valeur !== ''
           ? `<tr>
                <td style="padding:4px 0;color:#71717a">Valeur</td>
                <td style="padding:4px 0"><strong>${params.valeur}${params.unite ? ` ${params.unite}` : ''}</strong></td>
              </tr>`
           : ''
       }
     </table>

     <p style="margin:24px 0">
       <a href="${params.lien}"
          style="display:inline-block;padding:12px 20px;background:${params.organisation.couleurPrimaire};color:#ffffff;text-decoration:none;border-radius:6px">
         Consulter la publication
       </a>
     </p>

     <table role="presentation" style="margin-top:8px">
       <tr>
         <td style="padding-right:16px">
           <img src="${params.qrCodeUrl}" alt="QR code vers la publication" width="128" height="128" style="display:block;border:1px solid #e4e4e7;border-radius:4px">
         </td>
         <td style="font-size:13px;color:#71717a;vertical-align:middle">
           Scannez ce code pour ouvrir la publication<br>depuis un téléphone.
         </td>
       </tr>
     </table>

     <p style="margin-top:24px">Cordialement,</p>`,
  );

  return { sujet, corpsHtml, corpsTexte };
}

/** Free-text alert sent by an administrator (§8.3). */
export function modeleAlerte(params: {
  organisation: Organisation;
  nomElement: string;
  periode: string;
  contenu: string;
  auteur: string;
  lien: string;
}): { sujet: string; corpsHtml: string; corpsTexte: string } {
  const sujet = `Alerte : ${params.nomElement} — ${params.periode}`;

  const corpsTexte = `${params.contenu}

—
Élément : ${params.nomElement}
Période : ${params.periode}
Message envoyé par ${params.auteur} pour ${params.organisation.nom}.

Ouvrir la ligne concernée :
${params.lien}`;

  const corpsHtml = enveloppe(
    params.organisation,
    `<p>${params.contenu.replace(/\n/g, '<br>')}</p>

     <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
       <tr>
         <td style="padding:4px 0;color:#71717a;width:110px">Élément</td>
         <td style="padding:4px 0"><strong>${params.nomElement}</strong></td>
       </tr>
       <tr>
         <td style="padding:4px 0;color:#71717a">Période</td>
         <td style="padding:4px 0">${params.periode}</td>
       </tr>
     </table>

     <p style="margin:24px 0">
       <a href="${params.lien}" style="display:inline-block;padding:12px 20px;background:${params.organisation.couleurPrimaire};color:#ffffff;text-decoration:none;border-radius:6px">
         Ouvrir la ligne concernée
       </a>
     </p>

     <p style="font-size:13px;color:#71717a">
       Message envoyé par ${params.auteur}.
     </p>`,
  );

  return { sujet, corpsHtml, corpsTexte };
}

/**
 * Reminder before the deadline (§8.1).
 *
 * Sent 15, 10, 5, 3 and 1 day before the announced date.
 */
export function modeleRappel(params: {
  organisation: Organisation;
  typeProduit: TypeProduit;
  nomElement: string;
  nomPointFocal: string;
  periode: string;
  dateDebutCouverture: string;
  dateFinCouverture: string;
  dateDiffusionPrevue: string;
  joursRestants: number;
  lien: string;
}): { sujet: string; corpsHtml: string; corpsTexte: string } {
  const sujet = `Publication imminente : ${params.nomElement}`;
  const { sujet: produit, accord } = designation(params.typeProduit);

  const restant = `${params.joursRestants} jour${params.joursRestants > 1 ? 's' : ''}`;

  const phrase = `${produit} ${params.nomElement}, couvrant la période du ${params.dateDebutCouverture} au ${params.dateFinCouverture}, doit être publié${accord} le ${params.dateDiffusionPrevue} (dans ${restant}).`;

  const demande =
    'Nous vous prions de nous faire parvenir la publication dans les temps, afin de faciliter la prise en charge du document avant diffusion à la date spécifiée.';

  const corpsTexte = `${salutation(params.nomPointFocal)}

${FORMULE_SANTE}

${phrase}

${demande}

Cordialement.

Déposer le livrable : ${params.lien}`;

  const corpsHtml = enveloppe(
    params.organisation,
    `<p>${salutation(params.nomPointFocal)}</p>

     <p>${FORMULE_SANTE}</p>

     <p><strong>${produit} ${params.nomElement}</strong>, couvrant la période du
        ${params.dateDebutCouverture} au ${params.dateFinCouverture}, doit être
        publié${accord} le <strong>${params.dateDiffusionPrevue}</strong>
        (dans ${restant}).</p>

     <p>${demande}</p>

     <p style="margin:24px 0">
       <a href="${params.lien}" style="display:inline-block;padding:12px 20px;background:${params.organisation.couleurPrimaire};color:#ffffff;text-decoration:none;border-radius:6px">
         Déposer le livrable
       </a>
     </p>

     <p>Cordialement.</p>`,
  );

  return { sujet, corpsHtml, corpsTexte };
}

/** Chase after a missed deadline, sent every day until it is settled (§8.2). */
export function modeleRelance(params: {
  organisation: Organisation;
  typeProduit: TypeProduit;
  nomElement: string;
  nomPointFocal: string;
  periode: string;
  dateDebutCouverture: string;
  dateFinCouverture: string;
  dateNonRespectee: string;
  joursDeRetard: number;
  lien: string;
}): { sujet: string; corpsHtml: string; corpsTexte: string } {
  const sujet = `Publication en retard : ${params.nomElement}`;
  const { sujet: produit, accord } = designation(params.typeProduit);

  const retard = `${params.joursDeRetard} jour${params.joursDeRetard > 1 ? 's' : ''}`;

  const phrase = `${produit} ${params.nomElement}, couvrant la période du ${params.dateDebutCouverture} au ${params.dateFinCouverture}, devait être publié${accord} le ${params.dateNonRespectee} ; ${params.typeProduit === 'PUBLICATION' ? 'elle' : 'il'} accuse un retard de ${retard}.`;

  const demande =
    'Nous vous prions de nous faire parvenir la publication au plus vite, afin de faciliter la prise en charge du document avant diffusion à la date spécifiée.';

  const corpsTexte = `${salutation(params.nomPointFocal)}

${FORMULE_SANTE}

${phrase}

${demande}

Cordialement.

Si un report est nécessaire, indiquez l'état d'avancement, la justification et
la prochaine date prévisionnelle depuis votre espace — les relances
automatiques cesseront alors :
${params.lien}`;

  const corpsHtml = enveloppe(
    params.organisation,
    `<p>${salutation(params.nomPointFocal)}</p>

     <p>${FORMULE_SANTE}</p>

     <p><strong>${produit} ${params.nomElement}</strong>, couvrant la période du
        ${params.dateDebutCouverture} au ${params.dateFinCouverture}, devait être
        publié${accord} le <strong>${params.dateNonRespectee}</strong> ;
        ${params.typeProduit === 'PUBLICATION' ? 'elle' : 'il'} accuse un retard
        de <strong>${retard}</strong>.</p>

     <p>${demande}</p>

     <p style="margin:24px 0">
       <a href="${params.lien}" style="display:inline-block;padding:12px 20px;background:${params.organisation.couleurPrimaire};color:#ffffff;text-decoration:none;border-radius:6px">
         Ouvrir la ligne concernée
       </a>
     </p>

     <p>Cordialement.</p>

     <p style="font-size:13px;color:#71717a">
       Si un report est nécessaire, indiquez l'état d'avancement, la justification
       et la prochaine date prévisionnelle depuis votre espace : les relances
       automatiques cesseront alors.
     </p>`,
  );

  return { sujet, corpsHtml, corpsTexte };
}

export function modeleInvitation(params: {
  organisation: Organisation;
  prenoms: string;
  nom: string;
  role: string;
  /** Structure the person belongs to, or supervises. Absent for a super admin. */
  structure?: string | null;
  lien: string;
  validiteHeures: number;
}): { sujet: string; corpsHtml: string; corpsTexte: string } {
  const sujet = `Votre accès à DIFFUSIO — ${params.organisation.sigle}`;

  const ligneStructure = params.structure
    ? `Structure : ${params.structure}\n`
    : '';

  const corpsTexte = `Bonjour ${params.prenoms} ${params.nom},

Un compte vient de vous être créé sur DIFFUSIO, l'application de suivi du
calendrier de diffusion de ${params.organisation.nom}.

Profil : ${params.role}
${ligneStructure}
DIFFUSIO vous permettra de déclarer vos publications et vos indicateurs,
de générer votre calendrier annuel de diffusion, d'y déposer vos livrables
et de suivre le respect de vos échéances.

Pour choisir votre mot de passe et activer votre compte, ouvrez le lien
ci-dessous. Il est valable ${params.validiteHeures} heures.

${params.lien}

Si vous n'êtes pas concerné par ce message, ignorez-le : sans action de
votre part, le compte restera inactif.`;

  const corpsHtml = enveloppe(
    params.organisation,
    `<p>Bonjour <strong>${params.prenoms} ${params.nom}</strong>,</p>

     <p>Un compte vient de vous être créé sur <strong>DIFFUSIO</strong>,
        l'application de suivi du calendrier de diffusion de
        ${params.organisation.nom}.</p>

     <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;margin:16px 0">
       <tr>
         <td style="padding:4px 0;color:#71717a;width:120px">Profil</td>
         <td style="padding:4px 0"><strong>${params.role}</strong></td>
       </tr>
       ${
         params.structure
           ? `<tr>
                <td style="padding:4px 0;color:#71717a">Structure</td>
                <td style="padding:4px 0"><strong>${params.structure}</strong></td>
              </tr>`
           : ''
       }
     </table>

     <p>DIFFUSIO vous permettra de déclarer vos publications et vos indicateurs,
        de générer votre calendrier annuel de diffusion, d'y déposer vos
        livrables et de suivre le respect de vos échéances.</p>

     <p style="margin:24px 0">
       <a href="${params.lien}"
          style="display:inline-block;padding:12px 20px;background:${params.organisation.couleurPrimaire};color:#ffffff;text-decoration:none;border-radius:6px">
         Choisir mon mot de passe
       </a>
     </p>

     <p style="font-size:13px;color:#71717a">
       Si le bouton ne fonctionne pas, copiez cette adresse dans votre
       navigateur :<br>
       <span style="word-break:break-all">${params.lien}</span>
     </p>

     <p style="font-size:13px;color:#71717a">
       Ce lien est valable ${params.validiteHeures} heures. Si vous n'êtes pas
       concerné par ce message, ignorez-le : sans action de votre part, le compte
       restera inactif.
     </p>`,
  );

  return { sujet, corpsHtml, corpsTexte };
}
