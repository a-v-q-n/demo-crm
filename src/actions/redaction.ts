'use server';

import { and, desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import {
  client as clientTable,
  deal as dealTable,
  evenement,
  type Client,
  type Deal,
  type EvenementType,
} from '@/db/schema';
import { envoyer } from '@/lib/courriel';
import { adresseAutorisee, consommerQuota } from '@/lib/garde-fous';
import { redigerBrouillon } from '@/lib/ia';
import { inscrire } from '@/lib/journal';
import { exigerSession } from '@/lib/session';

/* Rédaction assistée depuis la fiche client. Aucune de ces actions ne lance d'exception vers le
   client : tout ressort en résultat typé, y compris les pannes. */

export type ResultatRedaction =
  | { ok: true; sujet: string; corps: string }
  | { ok: false; message: string };

export type ResultatEnvoi = { ok: true } | { ok: false; message: string };

/** Les libellés d'événements tels qu'ils sont donnés au modèle. */
const LIBELLE_EVENEMENT: Record<EvenementType, string> = {
  deal_cree: 'affaire ouverte',
  deal_etape: "changement d'étape",
  email_envoye: 'email envoyé',
};

/** Combien d'événements du client accompagnent la demande de rédaction. */
const PROFONDEUR_HISTORIQUE = 8;

export async function redigerEmail(entree: {
  clientId: string;
  dealId: string;
  intention: string;
}): Promise<ResultatRedaction> {
  await exigerSession();

  try {
    const quota = await consommerQuota('redaction');
    if (!quota.ok) return quota;

    const affaire = await chargerAffaire(entree.clientId, entree.dealId);
    if (affaire == null) return { ok: false, message: "Cette affaire est introuvable." };

    const historique = await db
      .select({
        type: evenement.type,
        titre: evenement.titre,
        date: evenement.createdAt,
      })
      .from(evenement)
      .where(eq(evenement.clientId, entree.clientId))
      .orderBy(desc(evenement.createdAt))
      .limit(PROFONDEUR_HISTORIQUE);

    const brouillon = await redigerBrouillon({
      entreprise: affaire.client.entreprise,
      contact: affaire.client.contact,
      intention: entree.intention,
      deal: {
        titre: affaire.deal.titre,
        montant: Number(affaire.deal.montant),
        stage: affaire.deal.stage,
        ouvertLe: affaire.deal.createdAt,
      },
      historique: historique.map((e) => ({
        type: LIBELLE_EVENEMENT[e.type],
        titre: e.titre,
        date: e.date,
      })),
    });

    return { ok: true, sujet: brouillon.sujet, corps: brouillon.corps };
  } catch {
    return { ok: false, message: 'La rédaction a échoué. Réessaie dans un moment.' };
  }
}

export async function envoyerEmail(entree: {
  clientId: string;
  dealId: string;
  sujet: string;
  corps: string;
}): Promise<ResultatEnvoi> {
  await exigerSession();

  try {
    const sujet = entree.sujet.trim();
    const corps = entree.corps.trim();
    if (sujet === '' || corps === '') {
      return { ok: false, message: 'Le sujet et le message ne peuvent pas être vides.' };
    }

    const affaire = await chargerAffaire(entree.clientId, entree.dealId);
    if (affaire == null) return { ok: false, message: "Cette affaire est introuvable." };

    // L'adresse se vérifie AVANT de consommer le quota : une adresse refusée ne coûte pas un
    // envoi au plafond horaire.
    if (!adresseAutorisee(affaire.client.email)) {
      return { ok: false, message: "La démo n'envoie qu'à des adresses @avqn.ch." };
    }

    const quota = await consommerQuota('envoi');
    if (!quota.ok) return quota;

    const envoi = await envoyer({ a: affaire.client.email, sujet, corps });
    if (!envoi.ok) return envoi;

    await inscrire({
      clientId: entree.clientId,
      dealId: entree.dealId,
      type: 'email_envoye',
      titre: sujet,
      detail: `Envoyé à ${affaire.client.contact} · ${affaire.client.email}`,
      meta: { sujet, destinataire: affaire.client.email },
    });

    revalidatePath(`/clients/${entree.clientId}`);
    return { ok: true };
  } catch {
    return { ok: false, message: "L'envoi a échoué. Réessaie dans un moment." };
  }
}

/** Charge le client et son affaire, et refuse un deal qui appartient à quelqu'un d'autre. */
async function chargerAffaire(
  clientId: string,
  dealId: string,
): Promise<{ client: Client; deal: Deal } | null> {
  const [fiche] = await db
    .select()
    .from(clientTable)
    .where(eq(clientTable.id, clientId))
    .limit(1);
  if (fiche == null) return null;

  const [affaire] = await db
    .select()
    .from(dealTable)
    .where(and(eq(dealTable.id, dealId), eq(dealTable.clientId, clientId)))
    .limit(1);
  if (affaire == null) return null;

  return { client: fiche, deal: affaire };
}
