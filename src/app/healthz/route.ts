// Sonde du déploiement : {ok, sha}. Le job `deploy` l'interroge pour prouver que le conteneur
// sert bien le sha poussé. Ce n'est pas une API métier.
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({ ok: true, sha: process.env.GIT_SHA?.slice(0, 12) ?? null });
}
