// Boot serveur (hook officiel Next) : joue les migrations drizzle au démarrage du runtime
// Node, jamais au build. Idempotent — pas d'étape de release séparée.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const fs = await import('node:fs');
  const path = await import('node:path');
  const { migrate } = await import('drizzle-orm/node-postgres/migrator');
  const { db } = await import('@/db');

  let dir = process.cwd();
  let folder: string | null = null;
  for (let i = 0; i < 5; i++) {
    const candidate = path.join(dir, 'drizzle');
    if (fs.existsSync(path.join(candidate, 'meta', '_journal.json'))) {
      folder = candidate;
      break;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  if (!folder) throw new Error(`dossier drizzle/ introuvable depuis ${process.cwd()}`);

  await migrate(db, { migrationsFolder: folder });

  // Amorce idempotente : toutes les pages sont pleines dès la première ouverture, y compris
  // après un déploiement neuf. Un client déjà présent n'est jamais touché.
  const { amorcer } = await import('@/db/seed');
  const bilan = await amorcer();
  console.log(`[boot] migrations jouées, amorce : ${bilan.clients} client(s) créé(s)`);
}
