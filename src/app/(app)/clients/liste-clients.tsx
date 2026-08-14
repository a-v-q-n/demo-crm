'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { Bouton, Champ, EnTete, Vide } from '@/components/ui/primitives';
import { montant } from '@/lib/format';
import { ModaleClient } from './modale-client';
import type { ClientAvecStats } from './page';

/* Liste des clients — recherche instantanée côté client (entreprise, contact, ville),
   insensible à la casse et aux accents. Cliquer une ligne ouvre la fiche. */

function normaliser(valeur: string): string {
  return valeur
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

export function ListeClients({ clients }: { clients: ClientAvecStats[] }) {
  const router = useRouter();
  const [recherche, setRecherche] = useState('');
  const [modaleOuverte, setModaleOuverte] = useState(false);

  const resultats = useMemo(() => {
    const requete = normaliser(recherche.trim());
    if (!requete) return clients;
    return clients.filter((c) =>
      normaliser(`${c.entreprise} ${c.contact} ${c.ville ?? ''}`).includes(requete),
    );
  }, [clients, recherche]);

  // Le pied de liste résume ce qui est affiché — il suit donc la recherche, pas le total.
  const totaux = useMemo(
    () => ({
      deals: resultats.reduce((s, c) => s + c.nbDeals, 0),
      montant: resultats.reduce((s, c) => s + c.montantEnCours, 0),
    }),
    [resultats],
  );

  return (
    <>
      <EnTete titre="Clients" compte={resultats.length}>
        <Bouton taille="sm" onClick={() => setModaleOuverte(true)}>
          <Plus size={13} strokeWidth={1.75} />
          Nouveau client
        </Bouton>
      </EnTete>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        <div className="relative shrink-0">
          <Search
            size={13}
            strokeWidth={1.75}
            className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-atone"
          />
          <Champ
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Rechercher une entreprise, un contact, une ville…"
            className="pl-7"
          />
        </div>

        <div className="filet-scroll min-h-0 flex-1 overflow-y-auto rounded-t-lg border border-bord">
          <table className="w-full border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-surface">
              <tr className="border-b border-bord text-[10px] tracking-[0.12em] text-atone uppercase">
                <th className="px-3 py-2 text-left font-medium">Entreprise</th>
                <th className="px-3 py-2 text-left font-medium">Contact</th>
                <th className="px-3 py-2 text-left font-medium">Ville</th>
                <th className="px-3 py-2 text-left font-medium">Secteur</th>
                <th className="px-3 py-2 text-right font-medium">Deals</th>
                <th className="px-3 py-2 text-right font-medium">Montant</th>
              </tr>
            </thead>
            <tbody>
              {resultats.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <Vide>Aucun client ne correspond à la recherche</Vide>
                  </td>
                </tr>
              ) : (
                resultats.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => router.push(`/clients/${c.id}`)}
                    className="transition-douce cursor-pointer border-b border-b-bord/60 border-l-2 border-l-transparent last:border-b-0 hover:border-l-rose hover:bg-surface-2"
                  >
                    <td className="px-3 py-3 text-texte">{c.entreprise}</td>
                    <td className="px-3 py-3 text-atone-fort">{c.contact}</td>
                    <td className="px-3 py-3 text-atone">{c.ville ?? '—'}</td>
                    <td className="px-3 py-3 text-atone">{c.secteur ?? '—'}</td>
                    <td className="chiffres px-3 py-3 text-right text-atone-fort">{c.nbDeals}</td>
                    <td className="chiffres px-3 py-3 text-right text-texte">
                      {montant(c.montantEnCours)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex shrink-0 items-center justify-between rounded-b-lg border border-t-0 border-bord bg-surface/60 px-3 py-2.5 text-[11px]">
          <span className="text-atone">
            {resultats.length} client{resultats.length > 1 ? 's' : ''} ·{' '}
            <span className="chiffres text-atone-fort">{totaux.deals}</span> deal
            {totaux.deals > 1 ? 's' : ''}
          </span>
          <span className="flex items-baseline gap-2">
            <span className="text-[10px] tracking-[0.14em] text-atone uppercase">
              Total en cours
            </span>
            <span className="chiffres glow-texte-rose font-medium text-rose">
              {montant(totaux.montant)}
            </span>
          </span>
        </div>
      </div>

      {modaleOuverte && <ModaleClient mode="creer" onFerme={() => setModaleOuverte(false)} />}
    </>
  );
}
