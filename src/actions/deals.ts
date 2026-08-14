'use server';

import { and, asc, eq, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/db';
import { deal } from '@/db/schema';
import { inscrire, inscrireEtape } from '@/lib/journal';
import { exigerSession } from '@/lib/session';
import type { Stage } from '@/lib/stages';

/* Mutations du pipeline. Toute écriture passe par ici — le drag and drop du canvas
   n'appelle rien d'autre. Les `position` d'une colonne restent contiguës (0, 1, 2…) :
   c'est ce qui rend l'ordre stable après rechargement. */

type Resultat = { ok: true } | { ok: false; message: string };

/** Les chemins que touche un mouvement de deal. */
function revalider(clientId: string): void {
  revalidatePath('/deals');
  revalidatePath('/dashboard');
  revalidatePath(`/clients/${clientId}`);
}

/**
 * Déplace un deal : nouvelle étape et/ou nouvelle place dans sa colonne.
 * `index` est la place visée dans la colonne d'arrivée, comptée sans la carte déplacée.
 */
export async function deplacerDeal(entree: {
  dealId: string;
  vers: Stage;
  index: number;
}): Promise<Resultat> {
  await exigerSession();

  try {
    const [carte] = await db
      .select()
      .from(deal)
      .where(eq(deal.id, entree.dealId))
      .limit(1);

    if (!carte) return { ok: false, message: 'Deal introuvable.' };

    const de = carte.stage;
    const vers = entree.vers;

    await db.transaction(async (tx) => {
      // La colonne d'arrivée telle qu'elle est avant l'insertion, sans la carte déplacée.
      const arrivee = await tx
        .select({ id: deal.id })
        .from(deal)
        .where(and(eq(deal.stage, vers), ne(deal.id, carte.id)))
        .orderBy(asc(deal.position), asc(deal.createdAt));

      const place = Math.min(Math.max(entree.index, 0), arrivee.length);
      const ordonnee = arrivee.map((d) => d.id);
      ordonnee.splice(place, 0, carte.id);

      for (const [rang, id] of ordonnee.entries()) {
        if (id === carte.id) {
          await tx
            .update(deal)
            .set({ stage: vers, position: rang, updatedAt: new Date() })
            .where(eq(deal.id, id));
        } else {
          await tx.update(deal).set({ position: rang }).where(eq(deal.id, id));
        }
      }

      // La colonne de départ se retasse pour ne pas garder de trou.
      if (de !== vers) {
        const depart = await tx
          .select({ id: deal.id })
          .from(deal)
          .where(and(eq(deal.stage, de), ne(deal.id, carte.id)))
          .orderBy(asc(deal.position), asc(deal.createdAt));

        for (const [rang, d] of depart.entries()) {
          await tx.update(deal).set({ position: rang }).where(eq(deal.id, d.id));
        }
      }
    });

    // Le changement d'étape est un événement : il s'inscrit dans la timeline du client.
    if (de !== vers) {
      await inscrireEtape({
        clientId: carte.clientId,
        dealId: carte.id,
        titreDeal: carte.titre,
        de,
        vers,
      });
    }

    revalider(carte.clientId);
    return { ok: true };
  } catch {
    return { ok: false, message: 'Déplacement impossible.' };
  }
}

/** Ouvre un deal en fin de colonne et l'inscrit au journal du client. */
export async function creerDeal(entree: {
  clientId: string;
  titre: string;
  montant: number;
  stage: Stage;
}): Promise<Resultat> {
  await exigerSession();

  const titre = entree.titre.trim();
  if (!entree.clientId) return { ok: false, message: 'Choisis un client.' };
  if (!titre) return { ok: false, message: 'Donne un titre au deal.' };

  const valeur = Number.isFinite(entree.montant) ? Math.max(entree.montant, 0) : 0;

  try {
    const colonne = await db
      .select({ id: deal.id })
      .from(deal)
      .where(eq(deal.stage, entree.stage));

    const [cree] = await db
      .insert(deal)
      .values({
        clientId: entree.clientId,
        titre,
        // `numeric` : Drizzle attend et rend une chaîne.
        montant: valeur.toFixed(2),
        stage: entree.stage,
        position: colonne.length,
      })
      .returning({ id: deal.id });

    await inscrire({
      clientId: entree.clientId,
      dealId: cree?.id ?? null,
      type: 'deal_cree',
      titre: `Deal ouvert · ${titre}`,
      meta: { montant: valeur },
    });

    revalider(entree.clientId);
    return { ok: true };
  } catch {
    return { ok: false, message: 'Création impossible.' };
  }
}
