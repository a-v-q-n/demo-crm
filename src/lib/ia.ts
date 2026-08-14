import Anthropic from '@anthropic-ai/sdk';
import { dateLongue, montant as formatMontant } from '@/lib/format';
import { libelleStage, type Stage } from '@/lib/stages';

/* La rédaction assistée. Les consignes vivent en dur ici — pas de page de réglages : un prompt
   qui se règle dans une interface est un prompt que personne ne relit. */

const MODELE = 'claude-sonnet-5';

/** Un email court n'a rien à réfléchir : tout le budget de sortie va au texte. */
const MAX_TOKENS = 1200;

/** L'angle propre à chaque étape du pipeline. C'est ce qui change entre deux relances. */
export const CONSIGNE_PAR_ETAPE: Record<Stage, string> = {
  prospect:
    "L'affaire en est au premier contact : rien n'a encore été proposé. Le but de l'email est " +
    "d'obtenir un échange, pas de vendre. Ton curieux et bref, une seule question ouverte, une " +
    'proposition de créneau simple à accepter.',
  offre:
    "Une offre est sur la table et attend une réponse. Relancer sans harceler : rappeler en une " +
    "ligne ce qui a été proposé, lever l'objection la plus probable (budget, calendrier, " +
    'périmètre) sans la nommer comme un reproche, et proposer une prochaine étape concrète.',
  gagne:
    "L'affaire est signée. Il ne s'agit plus de vendre mais d'entretenir la relation : prendre " +
    'des nouvelles de la mise en route, vérifier que la suite est claire, ouvrir sur la prochaine ' +
    'échéance du projet.',
  perdu:
    "L'affaire est perdue. Rester présent sans insister : pas de relance commerciale, pas de " +
    "tentative de récupérer la décision. Un message court qui laisse la porte ouverte pour plus " +
    'tard et respecte le choix fait.',
};

/** Les règles de forme, communes à toutes les étapes. */
const CONSIGNE_DE_FORME = [
  'Écris en français, au vouvoiement, dans le registre professionnel courant de Suisse romande.',
  '120 mots maximum pour le corps.',
  "Pas de formule ampoulée, pas de superlatif, pas de « J'espère que vous allez bien », pas de " +
    '« Je me permets de revenir vers vous ».',
  'Va au fait dès la première phrase et termine par une seule demande claire.',
  'Signe « Manu » — pas de bloc de signature, pas de coordonnées.',
  'Le sujet fait moins de 60 caractères et ne contient ni emoji ni point d\'exclamation.',
].join('\n- ');

export type EvenementContexte = {
  type: string;
  titre: string;
  date: Date | string;
};

export type ContexteRedaction = {
  entreprise: string;
  contact: string;
  intention: string;
  deal: {
    titre: string;
    montant: number;
    stage: Stage;
    ouvertLe: Date | string;
  };
  /** Les 8 derniers événements du client, du plus récent au plus ancien. */
  historique: EvenementContexte[];
};

export type Brouillon = { sujet: string; corps: string };

/** Rédige le brouillon d'un email à partir du contexte réel de l'affaire. */
export async function redigerBrouillon(contexte: ContexteRedaction): Promise<Brouillon> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const systeme = [
    "Tu écris à la place de Manu, indépendant qui vend des prestations de conseil et de " +
      'développement. Tu produis un email prêt à envoyer, pas un modèle à trous.',
    '',
    `Contexte d'étape — ${libelleStage(contexte.deal.stage)} : ${CONSIGNE_PAR_ETAPE[contexte.deal.stage]}`,
    '',
    `Forme :\n- ${CONSIGNE_DE_FORME}`,
    '',
    'Réponds UNIQUEMENT par un objet JSON de la forme {"sujet": "...", "corps": "..."}. ' +
      'Les sauts de ligne du corps sont des \\n. Aucun texte avant ou après le JSON.',
  ].join('\n');

  const historique =
    contexte.historique.length > 0
      ? contexte.historique
          .map((e) => `- ${dateLongue(e.date)} · ${e.type} · ${e.titre}`)
          .join('\n')
      : '- (aucun événement enregistré)';

  const utilisateur = [
    `Entreprise : ${contexte.entreprise}`,
    `Contact : ${contexte.contact}`,
    `Affaire : ${contexte.deal.titre}`,
    `Montant : ${formatMontant(contexte.deal.montant)}`,
    `Étape : ${libelleStage(contexte.deal.stage)}`,
    `Ouverte le : ${dateLongue(contexte.deal.ouvertLe)}`,
    '',
    'Historique récent :',
    historique,
    '',
    `Intention de cet email : ${contexte.intention.trim() || 'reprendre contact'}`,
  ].join('\n');

  const reponse = await client.messages.create({
    model: MODELE,
    max_tokens: MAX_TOKENS,
    thinking: { type: 'disabled' },
    system: systeme,
    messages: [{ role: 'user', content: utilisateur }],
  });

  const texte = reponse.content
    .map((bloc) => (bloc.type === 'text' ? bloc.text : ''))
    .join('\n')
    .trim();

  return lireBrouillon(texte, contexte.deal.titre);
}

/**
 * Extrait le JSON de la réponse. Si le modèle encadre l'objet de texte, on prend le premier
 * bloc `{...}` ; si rien ne se parse, le texte brut devient le corps.
 */
function lireBrouillon(texte: string, titreDeal: string): Brouillon {
  const secours: Brouillon = { sujet: `À propos de ${titreDeal}`, corps: texte };
  const bloc = texte.match(/\{[\s\S]*\}/);
  if (bloc == null) return secours;

  try {
    const objet: unknown = JSON.parse(bloc[0]);
    if (typeof objet !== 'object' || objet == null) return secours;
    const { sujet, corps } = objet as { sujet?: unknown; corps?: unknown };
    if (typeof corps !== 'string' || corps.trim() === '') return secours;
    return {
      sujet: typeof sujet === 'string' && sujet.trim() !== '' ? sujet.trim() : secours.sujet,
      corps: corps.trim(),
    };
  } catch {
    return secours;
  }
}
