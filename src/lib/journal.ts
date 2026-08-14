import { db } from '@/db';
import { evenement, type EvenementType } from '@/db/schema';
import { libelleStage, type Stage } from '@/lib/stages';

/* Écrire dans le journal d'un client. Tout ce qui arrive à un deal ou à un email passe par
   ici — la timeline de la fiche client lit cette table seule. */

export async function inscrire(entree: {
  clientId: string;
  dealId?: string | null;
  type: EvenementType;
  titre: string;
  detail?: string | null;
  meta?: Record<string, unknown>;
}): Promise<void> {
  await db.insert(evenement).values({
    clientId: entree.clientId,
    dealId: entree.dealId ?? null,
    type: entree.type,
    titre: entree.titre,
    detail: entree.detail ?? null,
    meta: entree.meta ?? null,
  });
}

/** Un deal vient de changer de colonne. */
export async function inscrireEtape(entree: {
  clientId: string;
  dealId: string;
  titreDeal: string;
  de: Stage;
  vers: Stage;
}): Promise<void> {
  await inscrire({
    clientId: entree.clientId,
    dealId: entree.dealId,
    type: 'deal_etape',
    titre: `${entree.titreDeal} → ${libelleStage(entree.vers)}`,
    detail: `Déplacé depuis « ${libelleStage(entree.de)} »`,
    meta: { de: entree.de, vers: entree.vers },
  });
}
