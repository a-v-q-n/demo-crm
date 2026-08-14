'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Pencil } from 'lucide-react';
import { Bouton } from '@/components/ui/primitives';
import { BoutonRedaction } from '@/components/redaction/bouton-redaction';
import { ModaleClient } from '../modale-client';
import type { Client, Deal } from '@/db/schema';

/* Les actions de l'en-tête de fiche : retour à la liste, modification (modale), et la
   rédaction assistée (composant possédé par un autre agent). */

export function ActionsFiche({ client, deals }: { client: Client; deals: Deal[] }) {
  const router = useRouter();
  const [modaleOuverte, setModaleOuverte] = useState(false);

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Bouton ton="muet" taille="sm" onClick={() => router.push('/clients')}>
        <ArrowLeft size={13} strokeWidth={1.75} />
        Retour
      </Bouton>
      <Bouton ton="muet" taille="sm" onClick={() => setModaleOuverte(true)}>
        <Pencil size={13} strokeWidth={1.75} />
        Modifier
      </Bouton>
      <BoutonRedaction
        client={{
          id: client.id,
          entreprise: client.entreprise,
          contact: client.contact,
          email: client.email,
        }}
        deals={deals.map((d) => ({
          id: d.id,
          titre: d.titre,
          montant: Number(d.montant),
          stage: d.stage,
        }))}
      />

      {modaleOuverte && (
        <ModaleClient mode="modifier" client={client} onFerme={() => setModaleOuverte(false)} />
      )}
    </div>
  );
}
