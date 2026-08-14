import type { Stage } from '@/db/schema';

export { STAGES } from '@/db/schema';
export type { Stage } from '@/db/schema';

/** Le vocabulaire visuel des quatre étapes — un seul endroit pour libellé et couleur. */
export const STAGE_INFO: Record<
  Stage,
  { libelle: string; texte: string; bord: string; fond: string; point: string }
> = {
  prospect: {
    libelle: 'Prospect',
    texte: 'text-atone-fort',
    bord: 'border-bord-vif',
    fond: 'bg-surface-3',
    point: 'bg-atone',
  },
  offre: {
    libelle: 'Offre envoyée',
    texte: 'text-rose',
    bord: 'border-rose/40',
    fond: 'bg-rose/10',
    point: 'bg-rose',
  },
  gagne: {
    libelle: 'Gagné',
    texte: 'text-vert',
    bord: 'border-vert/40',
    fond: 'bg-vert/10',
    point: 'bg-vert',
  },
  perdu: {
    libelle: 'Perdu',
    texte: 'text-ardoise',
    bord: 'border-bord',
    fond: 'bg-surface-2',
    point: 'bg-ardoise',
  },
};

export function libelleStage(s: Stage): string {
  return STAGE_INFO[s].libelle;
}
