import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db, schema } from '@/db';

// Login autonome de la démo : email + mot de passe, dans sa propre base logique. La démo
// n'utilise pas le SSO de la flotte.
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3007',
  emailAndPassword: {
    enabled: true,
    // Le compte de démo est diffusé publiquement avec un mot de passe de 6 caractères.
    minPasswordLength: 6,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
  },
  advanced: {
    // L'URL est publique et sert derrière Traefik en HTTPS.
    defaultCookieAttributes: { sameSite: 'lax' },
  },
});
