import { count, eq } from 'drizzle-orm';
import { db } from '@/db';
import { client, deal, evenement, user, type Stage } from '@/db/schema';
import { auth } from '@/lib/auth';
import { libelleStage } from '@/lib/stages';

/* Amorce de la démo — rejouable.
   Un client déjà présent (reconnu à son entreprise) est laissé intact : rejouer complète les
   trous sans écraser les déplacements de cartes faits pendant une démonstration.

   Tous les contacts portent la même adresse : les envois de démo doivent arriver dans une
   seule boîte. Les noms et les entreprises, eux, sont fictifs et variés. */

const ADRESSE_CONTACT = 'sys@avqn.ch';
const COMPTE_DEMO = { email: 'hello@avqn.ch', password: '123456', name: 'Démo AVQN' };

const JOUR = 86_400_000;

type Graine = {
  entreprise: string;
  contact: string;
  ville: string;
  secteur: string;
  telephone: string;
  deals: Array<{ titre: string; montant: number; stage: Stage; ouvertIlYA: number }>;
};

// Quinze entreprises fictives, réparties sur six mois pour nourrir les graphiques.
const GRAINES: Graine[] = [
  {
    entreprise: 'Helvetia Robotics',
    contact: 'Camille Perret',
    ville: 'Lausanne',
    secteur: 'Industrie',
    telephone: '+41 21 555 04 12',
    deals: [
      { titre: 'Refonte du poste de supervision', montant: 68000, stage: 'gagne', ouvertIlYA: 168 },
      { titre: 'Module de télémétrie', montant: 24500, stage: 'offre', ouvertIlYA: 34 },
    ],
  },
  {
    entreprise: 'Nordwind Analytics',
    contact: 'Sven Halvorsen',
    ville: 'Zurich',
    secteur: 'Données',
    telephone: '+41 44 555 18 90',
    deals: [
      { titre: 'Entrepôt de données clients', montant: 112000, stage: 'gagne', ouvertIlYA: 152 },
      { titre: 'Tableaux de bord direction', montant: 31000, stage: 'gagne', ouvertIlYA: 61 },
    ],
  },
  {
    entreprise: 'Maison Vervelle',
    contact: 'Aline Vervelle',
    ville: 'Genève',
    secteur: 'Horlogerie',
    telephone: '+41 22 555 77 03',
    deals: [
      { titre: 'Boutique en ligne sur mesure', montant: 84000, stage: 'offre', ouvertIlYA: 41 },
      { titre: 'Refonte de l’identité', montant: 19000, stage: 'perdu', ouvertIlYA: 121 },
    ],
  },
  {
    entreprise: 'Rives & Compagnie',
    contact: 'Théo Marchand',
    ville: 'Neuchâtel',
    secteur: 'Immobilier',
    telephone: '+41 32 555 21 44',
    deals: [
      { titre: 'Portail locataires', montant: 46500, stage: 'prospect', ouvertIlYA: 12 },
    ],
  },
  {
    entreprise: 'Altiplano Voyages',
    contact: 'Nadia Kessler',
    ville: 'Sion',
    secteur: 'Tourisme',
    telephone: '+41 27 555 63 81',
    deals: [
      { titre: 'Moteur de réservation', montant: 57000, stage: 'gagne', ouvertIlYA: 134 },
      { titre: 'Application mobile guides', montant: 38000, stage: 'offre', ouvertIlYA: 27 },
    ],
  },
  {
    entreprise: 'Fondation Clairval',
    contact: 'Bertrand Nicolet',
    ville: 'Fribourg',
    secteur: 'Associatif',
    telephone: '+41 26 555 30 17',
    deals: [
      { titre: 'Plateforme de dons', montant: 29500, stage: 'gagne', ouvertIlYA: 96 },
      { titre: 'Espace bénévoles', montant: 14000, stage: 'prospect', ouvertIlYA: 8 },
    ],
  },
  {
    entreprise: 'Kraft & Söhne',
    contact: 'Miriam Kraft',
    ville: 'Bâle',
    secteur: 'Logistique',
    telephone: '+41 61 555 92 26',
    deals: [
      { titre: 'Suivi de flotte temps réel', montant: 96000, stage: 'offre', ouvertIlYA: 52 },
    ],
  },
  {
    entreprise: 'Studio Palissade',
    contact: 'Jonas Rey',
    ville: 'Lausanne',
    secteur: 'Architecture',
    telephone: '+41 21 555 45 09',
    deals: [
      { titre: 'Portfolio interactif', montant: 22000, stage: 'gagne', ouvertIlYA: 78 },
      { titre: 'Visite virtuelle 3D', montant: 41000, stage: 'perdu', ouvertIlYA: 145 },
    ],
  },
  {
    entreprise: 'Verlaine Cosmétiques',
    contact: 'Sophie Berthoud',
    ville: 'Vevey',
    secteur: 'Beauté',
    telephone: '+41 21 555 11 58',
    deals: [
      { titre: 'Refonte e-commerce', montant: 73500, stage: 'gagne', ouvertIlYA: 187 },
      { titre: 'Programme de fidélité', montant: 26000, stage: 'prospect', ouvertIlYA: 5 },
    ],
  },
  {
    entreprise: 'Orbis Assurances',
    contact: 'Patrick Zumsteg',
    ville: 'Berne',
    secteur: 'Assurance',
    telephone: '+41 31 555 88 70',
    deals: [
      { titre: 'Espace assuré', montant: 128000, stage: 'offre', ouvertIlYA: 63 },
      { titre: 'Audit d’accessibilité', montant: 12500, stage: 'gagne', ouvertIlYA: 39 },
    ],
  },
  {
    entreprise: 'Le Comptoir Numérique',
    contact: 'Élodie Fournier',
    ville: 'Yverdon',
    secteur: 'Commerce',
    telephone: '+41 24 555 39 62',
    deals: [
      { titre: 'Caisse connectée', montant: 34000, stage: 'perdu', ouvertIlYA: 108 },
    ],
  },
  {
    entreprise: 'Terrafirma Génie Civil',
    contact: 'Marco Bianchi',
    ville: 'Lugano',
    secteur: 'Construction',
    telephone: '+41 91 555 74 35',
    deals: [
      { titre: 'Suivi de chantier', montant: 88000, stage: 'gagne', ouvertIlYA: 119 },
      { titre: 'Extension gestion des sous-traitants', montant: 43000, stage: 'prospect', ouvertIlYA: 19 },
    ],
  },
  {
    entreprise: 'Aurore Santé',
    contact: 'Delphine Aubry',
    ville: 'Morges',
    secteur: 'Santé',
    telephone: '+41 21 555 66 84',
    deals: [
      { titre: 'Prise de rendez-vous en ligne', montant: 52000, stage: 'offre', ouvertIlYA: 22 },
    ],
  },
  {
    entreprise: 'Brasserie du Sextant',
    contact: 'Yann Lecoultre',
    ville: 'Nyon',
    secteur: 'Alimentaire',
    telephone: '+41 22 555 50 29',
    deals: [
      { titre: 'Boutique et abonnements', montant: 18500, stage: 'gagne', ouvertIlYA: 57 },
      { titre: 'Refonte du site vitrine', montant: 9800, stage: 'prospect', ouvertIlYA: 3 },
    ],
  },
  {
    entreprise: 'Cordelier Formation',
    contact: 'Isabelle Grandjean',
    ville: 'Genève',
    secteur: 'Formation',
    telephone: '+41 22 555 47 16',
    deals: [
      { titre: 'Plateforme de cours', montant: 64000, stage: 'offre', ouvertIlYA: 46 },
      { titre: 'Refonte du catalogue', montant: 21500, stage: 'perdu', ouvertIlYA: 163 },
    ],
  },
];

/* Le chemin qu'un deal a parcouru avant d'atteindre son étape actuelle. Chaque étape
   traversée devient un événement daté, pour que les timelines aient de la matière. */
const CHEMIN: Record<Stage, Stage[]> = {
  prospect: [],
  offre: ['offre'],
  gagne: ['offre', 'gagne'],
  perdu: ['offre', 'perdu'],
};

const SUJETS_EMAIL = [
  'Suite à notre échange',
  'Proposition commerciale',
  'Relance — sans nouvelles de votre côté',
  'Récapitulatif de la réunion',
  'Ajustement du périmètre',
];

function jourMoins(n: number): Date {
  return new Date(Date.now() - n * JOUR);
}

async function compteDemo(): Promise<void> {
  const [{ n }] = await db
    .select({ n: count() })
    .from(user)
    .where(eq(user.email, COMPTE_DEMO.email));
  if (n > 0) return;

  await auth.api.signUpEmail({
    body: {
      name: COMPTE_DEMO.name,
      email: COMPTE_DEMO.email,
      password: COMPTE_DEMO.password,
    },
  });
}

export async function amorcer(): Promise<{ comptes: number; clients: number }> {
  await compteDemo();

  let crees = 0;

  for (const graine of GRAINES) {
    const [existant] = await db
      .select({ id: client.id })
      .from(client)
      .where(eq(client.entreprise, graine.entreprise))
      .limit(1);
    if (existant) continue;

    const plusAncien = Math.max(...graine.deals.map((d) => d.ouvertIlYA));

    const [nouveau] = await db
      .insert(client)
      .values({
        entreprise: graine.entreprise,
        contact: graine.contact,
        email: ADRESSE_CONTACT,
        telephone: graine.telephone,
        ville: graine.ville,
        secteur: graine.secteur,
        createdAt: jourMoins(plusAncien + 4),
      })
      .returning({ id: client.id });
    crees += 1;

    for (const [rang, d] of graine.deals.entries()) {
      const ouverture = jourMoins(d.ouvertIlYA);
      const etapes = CHEMIN[d.stage];
      // Durée du cycle de vente, en jours : un deal ouvert il y a longtemps se referme il y a
      // longtemps. C'est ce qui étale les signatures sur les mois — sans ça, toutes les
      // transitions se tasseraient à la fin de la fenêtre et la courbe d'évolution serait un
      // pic. Dérivée du montant : déterministe, et un gros deal met plus de temps à se signer.
      const cycle = Math.min(d.ouvertIlYA - 3, 21 + (Math.round(d.montant / 1000) % 50));
      const pas = etapes.length > 0 ? cycle / etapes.length : 0;

      const [creation] = await db
        .insert(deal)
        .values({
          clientId: nouveau.id,
          titre: d.titre,
          montant: d.montant.toFixed(2),
          stage: d.stage,
          position: rang,
          createdAt: ouverture,
          updatedAt: etapes.length ? jourMoins(Math.round(d.ouvertIlYA - cycle)) : ouverture,
        })
        .returning({ id: deal.id });

      const journal: Array<typeof evenement.$inferInsert> = [
        {
          clientId: nouveau.id,
          dealId: creation.id,
          type: 'deal_cree',
          titre: `Deal ouvert · ${d.titre}`,
          detail: `Montant estimé ${d.montant.toLocaleString('fr-CH')} CHF`,
          meta: { montant: d.montant },
          createdAt: ouverture,
        },
      ];

      let depuis: Stage = 'prospect';
      etapes.forEach((vers, i) => {
        journal.push({
          clientId: nouveau.id,
          dealId: creation.id,
          type: 'deal_etape',
          titre: `${d.titre} → ${libelleStage(vers)}`,
          detail: `Déplacé depuis « ${libelleStage(depuis)} »`,
          meta: { de: depuis, vers },
          createdAt: jourMoins(Math.round(d.ouvertIlYA - pas * (i + 1))),
        });
        depuis = vers;
      });

      // Un ou deux emails par deal, glissés dans l'intervalle — la timeline mêle les genres.
      const nbEmails = (d.ouvertIlYA % 3 === 0 ? 2 : 1) as 1 | 2;
      for (let i = 0; i < nbEmails; i++) {
        const sujet = SUJETS_EMAIL[(d.ouvertIlYA + i * 7) % SUJETS_EMAIL.length];
        journal.push({
          clientId: nouveau.id,
          dealId: creation.id,
          type: 'email_envoye',
          titre: sujet,
          detail: `Envoyé à ${graine.contact} · ${ADRESSE_CONTACT}`,
          meta: { sujet, destinataire: ADRESSE_CONTACT },
          createdAt: jourMoins(Math.max(1, Math.round(d.ouvertIlYA - pas * (i + 1) - 3))),
        });
      }

      await db.insert(evenement).values(journal);
    }
  }

  return { comptes: 1, clients: crees };
}
