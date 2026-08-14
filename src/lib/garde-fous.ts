import { and, eq, gt, sql } from 'drizzle-orm';
import { db } from '@/db';
import { usage } from '@/db/schema';

/* Les deux barrières de la démonstration. L'URL est publique et le compte de démonstration
   l'est aussi : n'importe qui peut se connecter, brûler la clé Anthropic et déclencher des
   envois. Rien ici n'est décoratif. */

/** Le plafond horaire, par acte. Les deux compteurs sont indépendants. */
const PLAFOND_PAR_HEURE = 10;

/** Le mot qui entre dans le message d'erreur, par acte. */
const ACTE: Record<Acte, string> = {
  redaction: 'rédactions',
  envoi: 'envois',
};

export type Acte = 'redaction' | 'envoi';

export type Verdict = { ok: true } | { ok: false; message: string };

/**
 * N'autorise que les adresses dont le domaine est exactement `avqn.ch`.
 * `sys@avqn.ch` passe ; `x@evil.com` et `x@avqn.ch.evil.com` ne passent pas.
 */
export function adresseAutorisee(email: string): boolean {
  const normalise = email.trim().toLowerCase();
  const coupe = normalise.lastIndexOf('@');
  if (coupe <= 0 || coupe === normalise.length - 1) return false;
  return normalise.slice(coupe + 1) === 'avqn.ch';
}

/**
 * Compte les actes de la dernière heure et en réserve un si le plafond n'est pas atteint.
 *
 * Le compteur est **global à l'application** — un plafond par utilisateur ne protégerait rien
 * sur une démonstration dont le compte est public — et il est **persisté en base** (table
 * `usage`), donc partagé par tous les visiteurs et conservé au redémarrage.
 *
 * Le contrôle et l'insertion vivent dans une seule transaction, sous verrou consultatif
 * (`pg_advisory_xact_lock`) : deux requêtes simultanées se sérialisent au lieu de franchir le
 * plafond ensemble. Le verrou est pris par acte, donc une rédaction n'attend jamais un envoi.
 */
export async function consommerQuota(kind: Acte): Promise<Verdict> {
  return db.transaction(async (tx): Promise<Verdict> => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`quota:${kind}`}))`);

    const [compte] = await tx
      .select({ n: sql<number>`count(*)::int` })
      .from(usage)
      .where(
        and(
          eq(usage.kind, kind),
          gt(usage.createdAt, sql`now() - interval '1 hour'`),
        ),
      );

    if ((compte?.n ?? 0) >= PLAFOND_PAR_HEURE) {
      return {
        ok: false,
        message: `Plafond de démonstration atteint (${PLAFOND_PAR_HEURE} ${ACTE[kind]}/heure). Réessaie dans un moment.`,
      };
    }

    await tx.insert(usage).values({ kind });
    return { ok: true };
  });
}
