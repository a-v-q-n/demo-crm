# syntax=docker/dockerfile:1
# Image immuable du CRM de démonstration — Next.js en sortie standalone. Coolify ne build
# jamais : la CI construit et pousse cette image taguée sha-<commit>, Coolify la pull par sha.

# ── deps ────────────────────────────────────────────────────────────────────
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── build ───────────────────────────────────────────────────────────────────
FROM node:22-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Le build n'exige aucune variable d'environnement : la connexion base et le secret d'auth
# sont lus paresseusement au boot (instrumentation.ts) et à la première requête.
RUN npm run build

# ── runtime ─────────────────────────────────────────────────────────────────
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
# Sha du commit buildé (passé par la CI en build-arg) — exposé par /healthz pour prouver que
# le conteneur sert bien le sha poussé.
ARG GIT_SHA
ENV GIT_SHA=$GIT_SHA
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/drizzle ./drizzle
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||3000)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
