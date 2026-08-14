import { count, eq, sql } from 'drizzle-orm';
import { db } from '@/db';
import { client, deal } from '@/db/schema';
import { ListeClients } from './liste-clients';

/* Page /clients — une seule requête agrégée (leftJoin + groupBy) : le nombre de deals et le
   montant en cours (deals hors « perdu ») par client. Le filtrage est délégué au client
   (ListeClients) pour une recherche instantanée sans aller-retour serveur. */

export type ClientAvecStats = {
  id: string;
  entreprise: string;
  contact: string;
  email: string;
  telephone: string | null;
  ville: string | null;
  secteur: string | null;
  createdAt: Date;
  nbDeals: number;
  montantEnCours: number;
};

async function recupererClients(): Promise<ClientAvecStats[]> {
  const lignes = await db
    .select({
      id: client.id,
      entreprise: client.entreprise,
      contact: client.contact,
      email: client.email,
      telephone: client.telephone,
      ville: client.ville,
      secteur: client.secteur,
      createdAt: client.createdAt,
      nbDeals: count(deal.id),
      montantEnCours: sql<string>`coalesce(sum(case when ${deal.stage} <> 'perdu' then ${deal.montant} else 0 end), 0)`,
    })
    .from(client)
    .leftJoin(deal, eq(deal.clientId, client.id))
    .groupBy(client.id)
    .orderBy(client.entreprise);

  return lignes.map((ligne) => ({ ...ligne, montantEnCours: Number(ligne.montantEnCours) }));
}

export default async function ClientsPage() {
  const clients = await recupererClients();
  return <ListeClients clients={clients} />;
}
