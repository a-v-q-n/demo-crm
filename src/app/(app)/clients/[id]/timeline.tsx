import { ArrowRightLeft, Plus, Send } from 'lucide-react';
import { cn } from '@/lib/cn';
import { dateCourte } from '@/lib/format';
import type { Evenement } from '@/db/schema';

/* La timeline verticale de la fiche client — pièce centrale de l'écran. Une ligne continue à
   gauche, une puce néon par événement, groupé par mois. */

const ICONE_PAR_TYPE = {
  deal_cree: Plus,
  deal_etape: ArrowRightLeft,
  email_envoye: Send,
} as const;

/** Couleur néon d'un événement — dérivée du type, et de l'étape d'arrivée pour deal_etape. */
function couleurEvenement(e: Evenement): string {
  if (e.type === 'email_envoye') return 'text-ambre';
  if (e.type === 'deal_etape') {
    const vers = e.meta?.vers;
    if (vers === 'gagne') return 'text-vert';
    if (vers === 'perdu') return 'text-ardoise';
    return 'text-rose';
  }
  return 'text-rose'; // deal_cree
}

/** Libellé « Août 2026 », première lettre en majuscule. */
function libelleMois(d: Date): string {
  const brut = new Intl.DateTimeFormat('fr-CH', { month: 'long', year: 'numeric' }).format(d);
  return brut.charAt(0).toUpperCase() + brut.slice(1);
}

function grouperParMois(evenements: Evenement[]): Array<{ cle: string; libelle: string; evenements: Evenement[] }> {
  const groupes: Array<{ cle: string; libelle: string; evenements: Evenement[] }> = [];
  for (const e of evenements) {
    const d = new Date(e.createdAt);
    const cle = `${d.getFullYear()}-${d.getMonth()}`;
    const dernier = groupes.at(-1);
    if (dernier && dernier.cle === cle) {
      dernier.evenements.push(e);
    } else {
      groupes.push({ cle, libelle: libelleMois(d), evenements: [e] });
    }
  }
  return groupes;
}

export function Timeline({ evenements }: { evenements: Evenement[] }) {
  if (evenements.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-xs text-atone">
        Aucun événement pour ce client
      </div>
    );
  }

  const groupes = grouperParMois(evenements);

  return (
    <div className="filet-scroll min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-3">
      <ol className="relative ml-3 border-l border-bord-vif pl-5">
        {groupes.map((groupe) => (
          <li key={groupe.cle} className="mb-4 last:mb-0">
            <p className="mb-2 text-[10px] tracking-[0.14em] text-atone uppercase">
              {groupe.libelle}
            </p>
            <ol className="flex flex-col gap-3.5">
              {groupe.evenements.map((e) => {
                const couleur = couleurEvenement(e);
                const Icone = ICONE_PAR_TYPE[e.type];
                return (
                  <li key={e.id} className="relative">
                    <span
                      className={cn(
                        'absolute -left-6 top-1 h-2 w-2 rounded-full bg-current',
                        couleur,
                      )}
                      style={{
                        boxShadow: '0 0 0 3px var(--color-surface), 0 0 9px 1px currentColor',
                      }}
                    />
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-1.5">
                        <Icone size={12} strokeWidth={2} className={cn('mt-0.5 shrink-0', couleur)} />
                        <div className="min-w-0">
                          <p className="truncate text-xs text-texte">{e.titre}</p>
                          {e.detail && (
                            <p className="truncate text-[11px] text-atone">{e.detail}</p>
                          )}
                        </div>
                      </div>
                      <span className="chiffres shrink-0 text-[10px] text-atone">
                        {dateCourte(e.createdAt)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </li>
        ))}
      </ol>
    </div>
  );
}
