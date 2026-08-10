import 'server-only';

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

/**
 * Absolute address of the DIFFUSIO wordmark.
 *
 * A mail client fetches images from the internet, not from the machine running
 * the application: a relative path would never resolve. On a development
 * machine `AUTH_URL` points at localhost and the image simply will not load —
 * which is why every message also carries the wordmark as text.
 */
function adresseLogo(): string {
  const base = (process.env.AUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '');

  return `${base}/logo-diffusio.png`;
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

  const enTete = organisation.logoUrl
    ? `<img src="${organisation.logoUrl}" alt="${organisation.nom}" style="max-height:44px;display:block">`
    : `<img src="${logoDiffusio}" alt="DIFFUSIO" width="180" style="max-height:34px;width:auto;display:block">`;

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
      <td style="padding:20px 24px;border-bottom:3px solid ${organisation.couleurPrimaire}">
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

/**
 * Publication-is-online notice (§7).
 *
 * The QR code is embedded as a base64 PNG, as the specification asks. Some mail
 * clients block `data:` images, so the clickable link always appears in full
 * text next to it — the message must stay usable without the picture.
 */
export function modeleMiseEnLigne(params: {
  organisation: Organisation;
  nomElement: string;
  periode: string;
  dateDebutCouverture: string;
  dateFinCouverture: string;
  dateDiffusionPrevue: string;
  dateDiffusionReelle: string;
  lien: string;
  qrCodeDataUri: string;
  valeur?: string | null;
  unite?: string | null;
}): { sujet: string; corpsHtml: string; corpsTexte: string } {
  const sujet = `Mise en ligne : ${params.nomElement} — ${params.periode}`;

  const ligneValeur =
    params.valeur != null && params.valeur !== ''
      ? `Valeur : ${params.valeur}${params.unite ? ` ${params.unite}` : ''}\n`
      : '';

  const corpsTexte = `${params.organisation.nom} informe de la mise en ligne de :

${params.nomElement}
Période couverte : du ${params.dateDebutCouverture} au ${params.dateFinCouverture}
Date de diffusion prévue : ${params.dateDiffusionPrevue}
Date de diffusion réelle : ${params.dateDiffusionReelle}
${ligneValeur}
Consulter la publication :
${params.lien}`;

  const corpsHtml = enveloppe(
    params.organisation,
    `<p>${params.organisation.nom} informe de la mise en ligne de :</p>

     <h2 style="margin:16px 0 8px;font-size:18px">${params.nomElement}</h2>

     <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px">
       <tr>
         <td style="padding:4px 0;color:#71717a">Période couverte</td>
         <td style="padding:4px 0"><strong>du ${params.dateDebutCouverture} au ${params.dateFinCouverture}</strong></td>
       </tr>
       <tr>
         <td style="padding:4px 0;color:#71717a">Diffusion prévue</td>
         <td style="padding:4px 0">${params.dateDiffusionPrevue}</td>
       </tr>
       <tr>
         <td style="padding:4px 0;color:#71717a">Diffusion réelle</td>
         <td style="padding:4px 0"><strong>${params.dateDiffusionReelle}</strong></td>
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
           <img src="${params.qrCodeDataUri}" alt="QR code vers la publication" width="128" height="128" style="display:block;border:1px solid #e4e4e7;border-radius:4px">
         </td>
         <td style="font-size:13px;color:#71717a;vertical-align:middle">
           Scannez ce code pour ouvrir la publication<br>depuis un téléphone.<br><br>
           <span style="word-break:break-all">${params.lien}</span>
         </td>
       </tr>
     </table>`,
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

/** Reminder before the deadline (§8.1). */
export function modeleRappel(params: {
  organisation: Organisation;
  nomElement: string;
  periodicite: string;
  periode: string;
  dateDiffusionPrevue: string;
  joursRestants: string;
  lien: string;
}): { sujet: string; corpsHtml: string; corpsTexte: string } {
  const sujet = `Rappel : ${params.nomElement} à diffuser ${params.joursRestants}`;

  const corpsTexte = `Bonjour,

La diffusion suivante approche :

${params.nomElement}
Périodicité : ${params.periodicite}
Période couverte : ${params.periode}
Date de diffusion attendue : ${params.dateDiffusionPrevue} (${params.joursRestants})

Déposez le livrable depuis votre espace :
${params.lien}`;

  const corpsHtml = enveloppe(
    params.organisation,
    `<p>Bonjour,</p>
     <p>La diffusion suivante approche :</p>
     <h2 style="margin:16px 0 8px;font-size:18px">${params.nomElement}</h2>
     <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px">
       <tr><td style="padding:4px 0;color:#71717a">Périodicité</td><td style="padding:4px 0">${params.periodicite}</td></tr>
       <tr><td style="padding:4px 0;color:#71717a">Période couverte</td><td style="padding:4px 0">${params.periode}</td></tr>
       <tr><td style="padding:4px 0;color:#71717a">Diffusion attendue</td><td style="padding:4px 0"><strong>${params.dateDiffusionPrevue}</strong> — ${params.joursRestants}</td></tr>
     </table>
     <p style="margin:24px 0">
       <a href="${params.lien}" style="display:inline-block;padding:12px 20px;background:${params.organisation.couleurPrimaire};color:#ffffff;text-decoration:none;border-radius:6px">
         Déposer le livrable
       </a>
     </p>`,
  );

  return { sujet, corpsHtml, corpsTexte };
}

/** Chase after a missed deadline (§8.2). */
export function modeleRelance(params: {
  organisation: Organisation;
  nomElement: string;
  periodicite: string;
  periode: string;
  dateNonRespectee: string;
  retard: string;
  lien: string;
}): { sujet: string; corpsHtml: string; corpsTexte: string } {
  const sujet = `Retard : ${params.nomElement} — ${params.periode}`;

  const corpsTexte = `Bonjour,

La diffusion suivante n'a pas été effectuée à la date prévue :

${params.nomElement}
Périodicité : ${params.periodicite}
Période couverte : ${params.periode}
Date non respectée : ${params.dateNonRespectee}
Retard : ${params.retard}

Merci de transmettre la publication ou l'information dans les meilleurs délais.

Si un report est nécessaire, indiquez l'état d'avancement, la justification et
la prochaine date prévisionnelle depuis votre espace — les relances
automatiques cesseront alors :
${params.lien}`;

  const corpsHtml = enveloppe(
    params.organisation,
    `<p>Bonjour,</p>
     <p>La diffusion suivante n'a pas été effectuée à la date prévue :</p>
     <h2 style="margin:16px 0 8px;font-size:18px">${params.nomElement}</h2>
     <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px">
       <tr><td style="padding:4px 0;color:#71717a">Périodicité</td><td style="padding:4px 0">${params.periodicite}</td></tr>
       <tr><td style="padding:4px 0;color:#71717a">Période couverte</td><td style="padding:4px 0">${params.periode}</td></tr>
       <tr><td style="padding:4px 0;color:#71717a">Date non respectée</td><td style="padding:4px 0"><strong>${params.dateNonRespectee}</strong></td></tr>
       <tr><td style="padding:4px 0;color:#71717a">Retard</td><td style="padding:4px 0"><strong>${params.retard}</strong></td></tr>
     </table>
     <p>Merci de transmettre la publication ou l'information dans les meilleurs délais.</p>
     <p style="font-size:13px;color:#71717a">
       Si un report est nécessaire, indiquez l'état d'avancement, la justification
       et la prochaine date prévisionnelle depuis votre espace : les relances
       automatiques cesseront alors.
     </p>
     <p style="margin:24px 0">
       <a href="${params.lien}" style="display:inline-block;padding:12px 20px;background:${params.organisation.couleurPrimaire};color:#ffffff;text-decoration:none;border-radius:6px">
         Ouvrir la ligne concernée
       </a>
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
