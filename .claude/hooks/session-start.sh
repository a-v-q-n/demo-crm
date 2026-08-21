#!/usr/bin/env bash
# Hook SessionStart — accueil de session cloud (1 conteneur = 1 clone = 1 branche). Trois rôles :
#   (1) neutraliser la signature de commit cassée du harness cloud (sinon `git commit` échoue) ;
#   (2) installer les deps npm en session distante (gate utilisable d'emblée) ;
#   (3) annoncer la branche + rappeler le palier de déploiement.
set -uo pipefail

emit() {
  jq -nc --arg c "$1" '{hookSpecificOutput:{hookEventName:"SessionStart",additionalContext:$c}}' 2>/dev/null \
    || printf '%s\n' "$1"
}

git rev-parse --git-dir >/dev/null 2>&1 || { emit "🚀 demo-crm (hors dépôt git)."; exit 0; }
branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')"

# Signature de commit : le harness cloud pose une signature SSH globale (commit.gpgsign=true) dont le
# signer est souvent absent/cassé → `git commit` échoue et bloque l'agent. On neutralise au niveau du
# dépôt (le local prime sur le global) pour que les commits passent toujours. Inutile ici (flotte
# mono-opérateur ; la recette pousse sur main).
git config --local commit.gpgsign false 2>/dev/null || true

# Méthode en session cloud : le plugin avqn-dev (marketplace publique a-v-q-n/skills) s'amorce ici —
# l'auto-install déclaré dans .claude/settings.json ne se déclenche pas dans la VM. Idempotent.
# Docker : le binaire est là, pas le démon — on le lance si le repo a des services à conteneuriser.
if [ "${CLAUDE_CODE_REMOTE:-}" = "true" ]; then
  if claude plugin list 2>/dev/null | grep -q 'avqn-dev@avqn'; then
    claude plugin marketplace update avqn >&2 2>&1 || true
  else
    claude plugin marketplace add a-v-q-n/skills >&2 2>&1 || true
    claude plugin install avqn-dev@avqn >&2 2>&1 || true
  fi
  if ls compose*.y*ml docker-compose*.y*ml >/dev/null 2>&1 && ! docker info >/dev/null 2>&1; then
    (dockerd >/tmp/dockerd.log 2>&1 &) ; sleep 3
  fi
fi

# Deps npm en session distante : `npm install` (idempotent, profite du cache conteneur) pour que la
# gate tourne d'emblée. Sortie vers stderr pour ne pas polluer le JSON additionalContext sur stdout.
if [ "${CLAUDE_CODE_REMOTE:-}" = "true" ]; then
  ( cd "$CLAUDE_PROJECT_DIR" && npm install --no-audit --no-fund ) >&2 || true
fi

base="Dis ce que tu veux faire. Gate locale : \`npm run build\`. Méthodo (brancher/TDD/PR/CI/FF merge) : plugin avqn-dev (/avqn-dev:dev). ATTENTION mono-palier : pas de preview — le FF merge sur \`main\` déploie DIRECTEMENT la PROD (\`https://demo-crm.avqn.ch\`). Surveille le run CI post-merge (job \`deploy\`) jusqu'au vert."

if [ "$branch" = "main" ] || [ "$branch" = "master" ]; then
  emit "🚀 demo-crm — tu es sur \`$branch\`. Bascule sur ta branche de session (\`git switch -c claude/<mission>\`) avant de coder. $base"
else
  emit "🚀 demo-crm — session isolée sur la branche \`$branch\`. $base"
fi
exit 0
