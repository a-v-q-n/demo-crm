# demo-crm — CRM de démonstration AVQN

Une démonstration publique : pipeline, fiches clients, timelines, rédaction assistée. Elle sert à
montrer, pas à porter des données réelles. `demo-crm` suit le cycle de dev continu AVQN — la
méthode (plugin `avqn-dev` : `/avqn-dev:dev`, `/avqn-dev:apercu`) arrive avec le repo, la mécanique de déploiement (reusable
workflows) dans `a-v-q-n/ci`. Ce repo ne porte que **son contrat**, son build et son code.

## Contrat

- **Commande de gate** : `npm run build` (= `tsc --noEmit && next build`) — exactement ce que la CI
  rejoue avant de livrer l'image. Ce projet est une démonstration assumée : **il n'a pas de tests**.
- **UI** : oui. **L'écran cible est un carré de 1080 × 1080** — c'est la contrainte de conception
  numéro un (cf. « L'écran cible » plus bas). Routes : `/login`, `/clients`, `/clients/[id]`,
  `/deals`, `/dashboard`.
- **Services requis en local** : le Postgres central (par tunnel SSH, cf. « En local »).
- **Versioning** : pas de bump (version figée `0.1.0`).
- **Palier** : `mono` — le push `main` déploie directement la prod ; pas de `promote.yml`.
- **Mode Coolify** : `application` — image docker ; le deploy PATCH `docker_registry_image_tag`.
- **Coordonnées Coolify** :
  - prod : `bsw4ksocs8wwow08cwg8wwsc` — https://demo-crm.avqn.ch/healthz (mode application)
  - projet Coolify `demo-crm` (`gsogo48ww48848cwow0oo0o0`), serveur `Prod` (46.62.162.135)

## Déploiement

Image immuable `sha-<commit>` construite par `.github/workflows/ci.yml`, poussée sur GHCR
(`ghcr.io/a-v-q-n/demo-crm`), puis Coolify la pull par sha (Coolify ne build jamais). Le secret
`COOLIFY_TOKEN` est hérité du secret d'organisation — rien à poser par repo. La route `/healthz`
répond `{ ok, sha }` : le health-check du deploy exige un 200 **et** le sha attendu. Ce n'est pas
une API métier, c'est la sonde du déploiement.

## La stack

Next.js App Router (sortie standalone), TypeScript strict, Tailwind v4, Postgres via Drizzle,
**server actions pour toutes les mutations — aucune API REST métier**. Better Auth pour le login
email/mot de passe. dnd-kit pour le pipeline, recharts pour le dashboard, lucide pour les icônes.

Les migrations Drizzle et l'amorce des données sont jouées **au boot** (`src/instrumentation.ts`),
les deux idempotentes : un déploiement neuf sert des pages pleines sans geste manuel.

## La base

Base logique dédiée **`demo_crm`** dans le Postgres central partagé (ressource Coolify
`postgres-central`, `bokkwc08kk40c00o8cs0wogg`, serveur Prod), avec son propre rôle applicatif
`demo_crm`. Pas d'instance Postgres à part.

Better Auth pose ses tables (`user`, `session`, `account`, `verification`) dans cette base : la
démo a **son login autonome**, isolé de l'auth de la flotte, et n'utilise pas le SSO.

Schéma métier : `client` (entreprise + contact), `deal` (rattaché à un client, quatre étapes
`prospect | offre | gagne | perdu`), `evenement` (le journal d'un client — c'est la source unique
de la timeline), `usage` (le compteur des garde-fous).

## Les secrets

Tous dans le coffre BWS, câblés dans Coolify avec `mcp__ops__secret_wire` : la valeur ne sort
jamais du coffre. Jamais de valeur en dur dans l'UI Coolify, dans le dépôt ou dans le code.

| Clé d'env | Secret dans le coffre |
|---|---|
| `DATABASE_URL` | `DEMO_CRM_DATABASE_URL` |
| `BETTER_AUTH_SECRET` | `DEMO_CRM_BETTER_AUTH_SECRET` |
| `ANTHROPIC_API_KEY` | `ANTHROPIC_API_KEY` (partagé) |
| `RESEND_API_KEY` | `RESEND_API_KEY` (partagé) |
| `RESEND_FROM` | `RESEND_FROM` (partagé) |

`BETTER_AUTH_URL` est la seule variable posée en clair (`https://demo-crm.avqn.ch`) : ce n'est pas
un secret.

## Les garde-fous — non négociables

L'URL est publique et le compte de démonstration l'est aussi (`hello@avqn.ch` / `123456`, mot de
passe de 6 caractères, d'où `minPasswordLength: 6`). N'importe qui peut donc se connecter, brûler
la clé Anthropic et déclencher des envois. Deux barrières, dans `src/lib/garde-fous.ts` :

1. **L'envoi n'est autorisé que vers les adresses `@avqn.ch`.**
2. **10 rédactions par heure et 10 envois par heure**, en compteur **global à l'application** —
   pas par utilisateur, un plafond par utilisateur ne protégerait rien ici — **persisté en base**
   (table `usage`), sous verrou consultatif pour que deux requêtes simultanées ne franchissent pas
   le plafond ensemble.

Tous les contacts du jeu de démonstration portent l'adresse `sys@avqn.ch` : les envois de démo
arrivent dans une seule boîte. Les noms et les entreprises sont fictifs.

## L'écran cible

**La démo tourne sur un carré de 1080 × 1080.** Toute l'interface est conçue pour ce format
d'abord : chaque page tient dans le carré **sans scroll vertical de page**, les quatre colonnes du
pipeline sont visibles côte à côte, la navigation latérale reste étroite (168 px). La hauteur est
la contrainte serrée : densité maîtrisée, pas de grands vides ni de titres surdimensionnés. Le
`<body>` est en `overflow: hidden` — ce sont les zones internes qui défilent. Le layout reste
correct sur desktop large et sur mobile, mais **le carré prime** en cas d'arbitrage.

## En local

L'accès direct au port 5432 du serveur Prod est bloqué depuis le poste : on passe par un tunnel SSH.

```
ssh -f -N -L 5470:127.0.0.1:5432 root@46.62.162.135
npm install
npm run dev            # http://localhost:3007
```

`.env.local` (gitignoré) s'alimente depuis le coffre — `DATABASE_URL` pointe sur `127.0.0.1:5470`,
le reste reprend les valeurs du coffre. Login : `hello@avqn.ch` / `123456`.

## Style

2 espaces, fonctions déclarées, commentaires en français. Jamais de secret commité.
