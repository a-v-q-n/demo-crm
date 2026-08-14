import { Resend } from 'resend';

/* L'envoi. L'expéditeur est celui de la flotte, son domaine est déjà vérifié — il n'a pas à
   être choisi ici. Le corps est du texte : c'est cette version qui fait foi, le HTML n'en est
   que l'habillage. */

export type Envoi = { a: string; sujet: string; corps: string };

export type Resultat = { ok: true } | { ok: false; message: string };

export async function envoyer({ a, sujet, corps }: Envoi): Promise<Resultat> {
  const cle = process.env.RESEND_API_KEY;
  if (cle == null || cle === '') {
    return { ok: false, message: "L'envoi n'est pas configuré (clé Resend manquante)." };
  }

  const expediteur = process.env.RESEND_FROM;
  if (expediteur == null || expediteur === '') {
    return { ok: false, message: "L'envoi n'est pas configuré (expéditeur manquant)." };
  }

  try {
    const { error } = await new Resend(cle).emails.send({
      from: expediteur,
      to: a,
      subject: sujet,
      text: corps,
      html: gabarit(sujet, corps),
    });

    if (error != null) {
      return { ok: false, message: error.message || "L'envoi a été refusé." };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "L'envoi a échoué. Réessaie dans un moment." };
  }
}

/** Le destinataire n'est pas dans la démonstration : gabarit clair, sur fond blanc. */
function gabarit(sujet: string, corps: string): string {
  const texte = echapper(corps).replace(/\r?\n/g, '<br>');
  return [
    '<!doctype html><html lang="fr"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    `<title>${echapper(sujet)}</title></head>`,
    '<body style="margin:0;padding:24px;background:#f4f4f5;">',
    '<div style="max-width:560px;margin:0 auto;padding:28px 32px;background:#ffffff;',
    'border:1px solid #e4e4e7;border-radius:8px;',
    'font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Helvetica,Arial,sans-serif;',
    'font-size:15px;line-height:1.6;color:#18181b;">',
    `<p style="margin:0;">${texte}</p>`,
    '</div></body></html>',
  ].join('');
}

function echapper(valeur: string): string {
  return valeur
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
