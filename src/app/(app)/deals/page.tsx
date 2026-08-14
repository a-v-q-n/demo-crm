import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { client, deal } from '@/db/schema';
import { Pipeline, type CarteDeal } from './pipeline';

// La page lit tout le pipeline d'un coup : quatre colonnes, une seule requête. L'ordre des
// étapes en base est celui de l'enum, donc celui des colonnes.
export const dynamic = 'force-dynamic';

export default async function PageDeals() {
  const lignes = await db
    .select({
      id: deal.id,
      titre: deal.titre,
      montant: deal.montant,
      stage: deal.stage,
      position: deal.position,
      clientId: deal.clientId,
      entreprise: client.entreprise,
    })
    .from(deal)
    .innerJoin(client, eq(deal.clientId, client.id))
    .orderBy(asc(deal.stage), asc(deal.position));

  const clients = await db
    .select({ id: client.id, entreprise: client.entreprise })
    .from(client)
    .orderBy(asc(client.entreprise));

  // `montant` est un numeric : Drizzle le rend en chaîne.
  const cartes: CarteDeal[] = lignes.map((ligne) => ({
    ...ligne,
    montant: Number(ligne.montant),
  }));

  return <Pipeline cartes={cartes} clients={clients} />;
}
