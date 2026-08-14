import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

type Base = NodePgDatabase<typeof schema>;

// Pool unique, conservé sur globalThis pour survivre au hot-reload de `next dev`.
const global_ = globalThis as unknown as { __pool?: Pool; __db?: Base };

function reel(): Base {
  if (global_.__db) return global_.__db;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL manquant');
  const pool = global_.__pool ?? new Pool({ connectionString: url, max: 8 });
  const base = drizzle(pool, { schema });
  if (process.env.NODE_ENV !== 'production') {
    global_.__pool = pool;
    global_.__db = base;
  }
  return base;
}

// La connexion ne s'ouvre qu'à la première requête, jamais au chargement du module : `next build`
// collecte les données de page en important les routes, sans aucune variable d'environnement.
// Une connexion construite à l'import ferait échouer le build.
export const db: Base = new Proxy({} as Base, {
  get(_cible, propriete) {
    const base = reel();
    const valeur = Reflect.get(base, propriete) as unknown;
    return typeof valeur === 'function' ? valeur.bind(base) : valeur;
  },
});

export { schema };
