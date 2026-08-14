'use client';

import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import type { Stage } from '@/lib/stages';

export type PartEtape = {
  stage: Stage;
  libelle: string;
  nombre: number;
  montant: number;
  couleur: string;
};

/** L'anneau de répartition du montant par étape, avec le nombre total de deals au centre. */
export function AnneauRepartition({ donnees, total }: { donnees: PartEtape[]; total: number }) {
  return (
    <div className="relative h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={donnees}
            dataKey="montant"
            nameKey="libelle"
            innerRadius={46}
            outerRadius={68}
            paddingAngle={2}
            stroke="none"
            isAnimationActive={false}
          >
            {donnees.map((d) => (
              <Cell key={d.stage} fill={d.couleur} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="chiffres text-[20px] font-semibold text-texte">{total}</span>
        <span className="text-[9px] tracking-[0.1em] text-atone uppercase">deals</span>
      </div>
    </div>
  );
}
