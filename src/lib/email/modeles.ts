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

function enveloppe(organisation: Organisation, contenu: string): string {
  return `<!doctype html>
<html lang="fr">
<body style="margin:0;padding:24px;background:#f5f5f5;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#18181b">
  <table role="presentation" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;border:1px solid #e4e4e7">
    <tr>
      <td style="padding:20px 24px;border-bottom:3px solid ${organisation.couleurPrimaire}">
        ${
          organisation.logoUrl
            ? `<img src="${organisation.logoUrl}" alt="${organisation.nom}" style="max-height:40px">`
            : `<strong style="font-size:18px">${organisation.sigle}</strong>`
        }
      </td>
    </tr>
    <tr><td style="padding:24px;line-height:1.6">${contenu}</td></tr>
    <tr>
      <td style="padding:16px 24px;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a">
        Message automatique envoyé par DIFFUSIO pour ${organisation.nom}.
        Merci de ne pas répondre à cet e-mail.
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function modeleInvitation(params: {
  organisation: Organisation;
  prenoms: string;
  nom: string;
  role: string;
  lien: string;
  validiteHeures: number;
}): { sujet: string; corpsHtml: string; corpsTexte: string } {
  const sujet = `Votre accès à DIFFUSIO — ${params.organisation.sigle}`;

  const corpsTexte = `Bonjour ${params.prenoms} ${params.nom},

Un compte vient de vous être créé sur DIFFUSIO, l'application de suivi du
calendrier de diffusion de ${params.organisation.nom}.

Votre profil : ${params.role}

Pour choisir votre mot de passe et activer votre compte, ouvrez le lien
ci-dessous. Il est valable ${params.validiteHeures} heures.

${params.lien}

Si vous n'êtes pas concerné par ce message, ignorez-le : sans action de
votre part, le compte restera inactif.`;

  const corpsHtml = enveloppe(
    params.organisation,
    `<p>Bonjour <strong>${params.prenoms} ${params.nom}</strong>,</p>
     <p>Un compte vient de vous être créé sur DIFFUSIO, l'application de suivi du
        calendrier de diffusion de ${params.organisation.nom}.</p>
     <p>Votre profil : <strong>${params.role}</strong></p>
     <p style="margin:24px 0">
       <a href="${params.lien}"
          style="display:inline-block;padding:12px 20px;background:${params.organisation.couleurPrimaire};color:#ffffff;text-decoration:none;border-radius:6px">
         Choisir mon mot de passe
       </a>
     </p>
     <p style="font-size:13px;color:#71717a">
       Ce lien est valable ${params.validiteHeures} heures. Si vous n'êtes pas
       concerné par ce message, ignorez-le : sans action de votre part, le compte
       restera inactif.
     </p>`,
  );

  return { sujet, corpsHtml, corpsTexte };
}
