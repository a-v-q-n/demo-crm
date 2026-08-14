import type { LucideIcon } from 'lucide-react';
import { Hourglass, Receipt, Target, TrendingUp } from 'lucide-react';
import { db } from '@/db';
import { deal } from '@/db/schema';
import { Carte, EnTete, Etiquette } from '@/components/ui/primitives';
import { cn } from '@/lib/cn';
import { montant, montantCourt, pourcent } from '@/lib/format';
import { STAGES, STAGE_INFO } from '@/lib/stages';
import { AnneauRepartition, type PartEtape } from './anneau-repartition';
import { GraphiqueEvolution, type PointEvolution } from './graphique-evolution';

// Couleurs hex littérales : recharts ne comprend pas les classes Tailwind.
const COULEUR_ETAPE: Record<(typeof STAGES)[number], string> = {
  prospect: '#7b8394',
  offre: '#ff3d8a',
  gagne: '#2ff09b',
  perdu: '#5b6376',
};

// Le tableau de bord tient entier dans le carré, sans scroll : trois bandes qui se
// partagent la hauteur disponible — indicateurs (fixe) / évolution (flex-1) / répartition
// (fixe). Toute l'agrégation se fait ici, côté serveur ; les composants clients ne
// reçoivent que des nombres déjà calculés.
export default async function DashboardPage() {
  const lignesBrutes = await db
    .select({
      montant: deal.montant,
      stage: deal.stage,
      createdAt: deal.createdAt,
      updatedAt: deal.updatedAt,
    })
    .from(deal);

  const lignes = lignesBrutes.map((d) => ({ ...d, montant: Number(d.montant) }));

  // ── Indicateurs ──────────────────────────────────────────────────────────────
  const gagnes = lignes.filter((d) => d.stage === 'gagne');
  const perdus = lignes.filter((d) => d.stage === 'perdu');
  const enCours = lignes.filter((d) => d.stage === 'prospect' || d.stage === 'offre');

  const caSigne = gagnes.reduce((s, d) => s + d.montant, 0);
  const montantEnCours = enCours.reduce((s, d) => s + d.montant, 0);
  const denomConversion = gagnes.length + perdus.length;
  const tauxConversion = denomConversion > 0 ? gagnes.length / denomConversion : null;
  const panierMoyen = gagnes.length > 0 ? caSigne / gagnes.length : 0;

  // ── Évolution sur les 8 derniers mois ────────────────────────────────────────
  const libelleMois = new Intl.DateTimeFormat('fr-CH', { month: 'short' });
  const maintenant = new Date();
  const fenetre = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(maintenant.getFullYear(), maintenant.getMonth() - (7 - i), 1);
    return { annee: d.getFullYear(), mois: d.getMonth(), libelle: libelleMois.format(d) };
  });

  const evolution: PointEvolution[] = fenetre.map(({ annee, mois, libelle }) => {
    const signe = lignes
      .filter(
        (d) =>
          d.stage === 'gagne' &&
          d.updatedAt.getFullYear() === annee &&
          d.updatedAt.getMonth() === mois,
      )
      .reduce((s, d) => s + d.montant, 0);
    const ouvert = lignes
      .filter(
        (d) =>
          d.stage !== 'perdu' &&
          d.createdAt.getFullYear() === annee &&
          d.createdAt.getMonth() === mois,
      )
      .reduce((s, d) => s + d.montant, 0);
    return { libelle, signe, ouvert };
  });

  // ── Répartition par étape ─────────────────────────────────────────────────────
  const repartition: PartEtape[] = STAGES.map((s) => {
    const deStage = lignes.filter((d) => d.stage === s);
    return {
      stage: s,
      libelle: STAGE_INFO[s].libelle,
      nombre: deStage.length,
      montant: deStage.reduce((sum, d) => sum + d.montant, 0),
      couleur: COULEUR_ETAPE[s],
    };
  });
  const montantMax = Math.max(1, ...repartition.map((r) => r.montant));
  const totalDeals = lignes.length;

  return (
    <>
      <EnTete titre="Tableau de bord" compte={`${totalDeals} deals`} />
      {/* Sur le carré, les trois bandes se partagent la hauteur et rien ne défile. Sous 768 px,
          les bandes s'empilent et c'est cette zone qui défile — jamais la page. */}
      <div className="filet-scroll flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto md:overflow-hidden">
        {/* Bande du haut — quatre indicateurs */}
        <div className="grid shrink-0 grid-cols-2 md:h-[92px] md:grid-cols-4 gap-2.5">
          <Indicateur
            icone={TrendingUp}
            etiquette="CA signé"
            valeur={montant(caSigne)}
            valeurClass="text-vert glow-texte-vert"
            contexte={`${gagnes.length} deal${gagnes.length > 1 ? 's' : ''} signé${gagnes.length > 1 ? 's' : ''}`}
          />
          <Indicateur
            icone={Hourglass}
            etiquette="Montant en cours"
            valeur={montant(montantEnCours)}
            valeurClass="text-rose"
            contexte={`${enCours.length} deal${enCours.length > 1 ? 's' : ''} en cours`}
          />
          <Indicateur
            icone={Target}
            etiquette="Taux de conversion"
            valeur={tauxConversion === null ? '—' : pourcent(tauxConversion)}
            valeurClass="text-texte"
            contexte={
              denomConversion > 0 ? `${gagnes.length} / ${denomConversion} deals clos` : 'aucun deal clos'
            }
          />
          <Indicateur
            icone={Receipt}
            etiquette="Panier moyen"
            valeur={montant(panierMoyen)}
            valeurClass="text-texte"
            contexte={`sur ${gagnes.length} vente${gagnes.length > 1 ? 's' : ''}`}
          />
        </div>

        {/* Bande du milieu — l'évolution, le geste visuel principal */}
        <Carte className="flex min-h-[260px] flex-1 flex-col p-3 md:min-h-0">
          <Etiquette className="block shrink-0 pb-2">Évolution du CA — 8 derniers mois</Etiquette>
          <div className="min-h-0 flex-1">
            <GraphiqueEvolution donnees={evolution} />
          </div>
        </Carte>

        {/* Bande du bas — la répartition par étape */}
        <div className="grid shrink-0 grid-cols-1 md:h-[170px] md:grid-cols-2 gap-2.5">
          <Carte className="flex flex-col justify-center gap-2.5 p-3">
            {repartition.map((r) => (
              <div key={r.stage} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className={cn('font-medium', STAGE_INFO[r.stage].texte)}>{r.libelle}</span>
                  <span className="chiffres text-atone">
                    {r.nombre} · {montantCourt(r.montant)}
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                  <div
                    className={cn(
                      'h-full rounded-full transition-douce',
                      r.stage === 'gagne' && 'glow-vert',
                    )}
                    style={{
                      width: r.montant > 0 ? `${Math.max(4, (r.montant / montantMax) * 100)}%` : '0%',
                      backgroundColor: r.couleur,
                    }}
                  />
                </div>
              </div>
            ))}
          </Carte>
          <Carte className="flex items-center gap-3 p-3">
            <div className="h-full flex-1">
              <AnneauRepartition donnees={repartition} total={totalDeals} />
            </div>
            <div className="flex shrink-0 flex-col gap-1.5">
              {repartition.map((r) => (
                <div key={r.stage} className="flex items-center gap-1.5 text-[10px]">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: r.couleur }}
                  />
                  <span className="text-atone">{r.libelle}</span>
                </div>
              ))}
            </div>
          </Carte>
        </div>
      </div>
    </>
  );
}

function Indicateur({
  icone: Icone,
  etiquette,
  valeur,
  valeurClass,
  contexte,
}: {
  icone: LucideIcon;
  etiquette: string;
  valeur: string;
  valeurClass: string;
  contexte: string;
}) {
  return (
    <Carte className="relative flex flex-col justify-center gap-1 p-3">
      <Icone className="absolute top-3 right-3 h-3.5 w-3.5 text-atone" />
      <Etiquette>{etiquette}</Etiquette>
      <span className={cn('chiffres text-[26px] font-semibold', valeurClass)}>{valeur}</span>
      <span className="text-[10px] text-atone">{contexte}</span>
    </Carte>
  );
}
