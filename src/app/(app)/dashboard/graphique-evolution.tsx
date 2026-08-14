'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Carte, Etiquette } from '@/components/ui/primitives';
import { montant, montantCourt } from '@/lib/format';

export type PointEvolution = { libelle: string; signe: number; ouvert: number };

type ChargePayload = ReadonlyArray<{ value?: number | string; dataKey?: string | number }>;

/** Le tooltip par défaut de recharts est blanc et casserait la DA néon — celui-ci le remplace. */
function InfoBulle({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: ChargePayload;
  label?: string | number;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const signe = payload.find((p) => p.dataKey === 'signe')?.value;
  const ouvert = payload.find((p) => p.dataKey === 'ouvert')?.value;
  return (
    <Carte className="border-bord-vif bg-surface-2 px-2.5 py-2">
      <Etiquette className="block pb-1.5">{label}</Etiquette>
      <div className="flex flex-col gap-1 text-[11px]">
        <div className="chiffres flex items-center gap-1.5 text-vert">
          <span className="h-1.5 w-1.5 rounded-full bg-vert" />
          {montant(Number(signe ?? 0))}
        </div>
        <div className="chiffres flex items-center gap-1.5 text-rose">
          <span className="h-1.5 w-1.5 rounded-full bg-rose" />
          {montant(Number(ouvert ?? 0))}
        </div>
      </div>
    </Carte>
  );
}

/** Le geste visuel principal de la page : le CA signé mois par mois, en aire dégradée. */
export function GraphiqueEvolution({ donnees }: { donnees: PointEvolution[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={donnees} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="degradeSigne" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2ff09b" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#2ff09b" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="degradeOuvert" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff3d8a" stopOpacity={0.12} />
            <stop offset="100%" stopColor="#ff3d8a" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#1e222c" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="libelle"
          stroke="#7b8394"
          fontSize={10}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          stroke="#7b8394"
          fontSize={10}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => montantCourt(v)}
        />
        <Tooltip content={<InfoBulle />} cursor={{ stroke: '#2c313e', strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="ouvert"
          stroke="#ff3d8a"
          strokeWidth={1}
          fill="url(#degradeOuvert)"
        />
        <Area
          type="monotone"
          dataKey="signe"
          stroke="#2ff09b"
          strokeWidth={2}
          fill="url(#degradeSigne)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
