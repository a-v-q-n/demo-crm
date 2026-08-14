import { amorcer } from '@/db/seed';

// Point d'amorce opérationnel — pas une API métier. Il rejoue le seed sur le conteneur
// déployé (`docker exec … node -e "fetch(…)"`), et n'est atteignable qu'avec le secret que
// le conteneur porte déjà : la valeur ne sort jamais du coffre.
export const dynamic = 'force-dynamic';

export async function POST(requete: Request): Promise<Response> {
  const attendu = process.env.BETTER_AUTH_SECRET;
  if (!attendu || requete.headers.get('x-amorce') !== attendu) {
    return Response.json({ ok: false }, { status: 404 });
  }
  const bilan = await amorcer();
  return Response.json({ ok: true, ...bilan });
}
