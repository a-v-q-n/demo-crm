import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

// ── Better Auth ───────────────────────────────────────────────────────────────
// Tables du login autonome de la démo (email/mot de passe). La démo n'utilise pas le SSO
// de la flotte : son compte vit ici, dans sa propre base logique.

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified')
    .$defaultFn(() => false)
    .notNull(),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ── CRM ───────────────────────────────────────────────────────────────────────

// Les quatre colonnes du pipeline. L'ordre de déclaration EST l'ordre d'affichage.
export const stageEnum = pgEnum('stage', ['prospect', 'offre', 'gagne', 'perdu']);
export type Stage = (typeof stageEnum.enumValues)[number];
export const STAGES = stageEnum.enumValues;

// Un client = une entreprise et son contact principal.
export const client = pgTable(
  'client',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entreprise: text('entreprise').notNull(),
    contact: text('contact').notNull(),
    email: text('email').notNull(),
    telephone: text('telephone'),
    ville: text('ville'),
    secteur: text('secteur'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('client_entreprise_idx').on(t.entreprise)],
);

// Un deal appartient à un client (un client en a plusieurs). `position` ordonne les cartes
// dans leur colonne ; le drag and drop la réécrit.
export const deal = pgTable(
  'deal',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => client.id, { onDelete: 'cascade' }),
    titre: text('titre').notNull(),
    montant: numeric('montant', { precision: 12, scale: 2 }).notNull().default('0'),
    stage: stageEnum('stage').notNull().default('prospect'),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('deal_client_idx').on(t.clientId), index('deal_stage_idx').on(t.stage)],
);

// Le journal d'un client : tout ce qui s'est passé, dans l'ordre. La timeline de la fiche
// client lit cette table seule — aucun événement n'est reconstitué à la lecture.
export const evenementTypeEnum = pgEnum('evenement_type', [
  'deal_cree',
  'deal_etape',
  'email_envoye',
]);
export type EvenementType = (typeof evenementTypeEnum.enumValues)[number];

export const evenement = pgTable(
  'evenement',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clientId: uuid('client_id')
      .notNull()
      .references(() => client.id, { onDelete: 'cascade' }),
    dealId: uuid('deal_id').references(() => deal.id, { onDelete: 'cascade' }),
    type: evenementTypeEnum('type').notNull(),
    titre: text('titre').notNull(),
    detail: text('detail'),
    // Charge utile selon le type : { de, vers } pour deal_etape, { sujet, destinataire } pour
    // email_envoye, { montant } pour deal_cree.
    meta: jsonb('meta').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('evenement_client_idx').on(t.clientId, t.createdAt)],
);

// Compteur d'usage GLOBAL à l'application : une ligne par acte (rédaction ou envoi). Le
// plafond horaire se lit en comptant les lignes de la dernière heure — persisté en base,
// donc partagé par tous les visiteurs et survivant aux redémarrages. C'est le garde-fou :
// l'URL et le compte de démo sont publics.
export const usage = pgTable(
  'usage',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kind: text('kind').notNull(), // 'redaction' | 'envoi'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index('usage_kind_idx').on(t.kind, t.createdAt)],
);

export type Client = typeof client.$inferSelect;
export type Deal = typeof deal.$inferSelect;
export type Evenement = typeof evenement.$inferSelect;
