'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { client } from '@/db/schema';
import { exigerSession } from '@/lib/session';

/* Server actions du domaine client : création et modification. Aucune API REST — tout passe
   par ici, appelé directement depuis les composants client des modales. */

export type DonneesClient = {
  entreprise: string;
  contact: string;
  email: string;
  telephone?: string;
  ville?: string;
  secteur?: string;
};

type Resultat = { ok: true; id: string } | { ok: false; message: string };

/** Valide les champs à la main — pas de lancer, on renvoie un refus lisible. */
function valider(donnees: DonneesClient): string | null {
  if (!donnees.entreprise.trim()) return "l'entreprise est obligatoire";
  if (!donnees.contact.trim()) return 'le contact est obligatoire';
  if (!donnees.email.trim() || !donnees.email.includes('@')) return 'email invalide';
  return null;
}

export async function creerClient(donnees: DonneesClient): Promise<Resultat> {
  await exigerSession();

  const erreur = valider(donnees);
  if (erreur) return { ok: false, message: erreur };

  const [ligne] = await db
    .insert(client)
    .values({
      entreprise: donnees.entreprise.trim(),
      contact: donnees.contact.trim(),
      email: donnees.email.trim(),
      telephone: donnees.telephone?.trim() || null,
      ville: donnees.ville?.trim() || null,
      secteur: donnees.secteur?.trim() || null,
    })
    .returning({ id: client.id });

  revalidatePath('/clients');
  return { ok: true, id: ligne.id };
}

export async function modifierClient(id: string, donnees: DonneesClient): Promise<Resultat> {
  await exigerSession();

  const erreur = valider(donnees);
  if (erreur) return { ok: false, message: erreur };

  await db
    .update(client)
    .set({
      entreprise: donnees.entreprise.trim(),
      contact: donnees.contact.trim(),
      email: donnees.email.trim(),
      telephone: donnees.telephone?.trim() || null,
      ville: donnees.ville?.trim() || null,
      secteur: donnees.secteur?.trim() || null,
    })
    .where(eq(client.id, id));

  revalidatePath('/clients');
  revalidatePath(`/clients/${id}`);
  return { ok: true, id };
}
