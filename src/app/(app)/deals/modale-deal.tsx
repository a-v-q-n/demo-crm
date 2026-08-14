'use client';

import { X } from 'lucide-react';
import { useState, useTransition, type FormEvent } from 'react';
import { creerDeal } from '@/actions/deals';
import { Bouton, Carte, Champ, Etiquette, Selecteur } from '@/components/ui/primitives';
import { STAGES, STAGE_INFO, type Stage } from '@/lib/stages';

/* Ouvrir un deal. Le carré ne défile pas : la modale se pose par-dessus, compacte. */

export type ClientBref = { id: string; entreprise: string };

export function ModaleDeal({
  clients,
  onFermer,
}: {
  clients: ClientBref[];
  onFermer: () => void;
}) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? '');
  const [titre, setTitre] = useState('');
  const [montant, setMontant] = useState('');
  const [stage, setStage] = useState<Stage>('prospect');
  const [message, setMessage] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  function envoyer(evenement: FormEvent<HTMLFormElement>) {
    evenement.preventDefault();
    setMessage(null);
    demarrer(async () => {
      const resultat = await creerDeal({
        clientId,
        titre,
        montant: Number(montant) || 0,
        stage,
      });
      if (resultat.ok) onFermer();
      else setMessage(resultat.message);
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-fond/80 p-6 backdrop-blur-[2px]"
      onMouseDown={onFermer}
    >
      <Carte
        className="w-[340px] p-4"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[13px] font-medium tracking-[0.16em] text-texte uppercase">
            Nouveau deal
          </h2>
          <button
            type="button"
            onClick={onFermer}
            className="transition-douce text-atone hover:text-rose"
            aria-label="Fermer"
          >
            <X size={14} strokeWidth={1.75} />
          </button>
        </div>

        <form onSubmit={envoyer} className="flex flex-col gap-2.5">
          <label className="flex flex-col gap-1">
            <Etiquette>Client</Etiquette>
            <Selecteur
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              required
            >
              {clients.length === 0 && <option value="">Aucun client</option>}
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.entreprise}
                </option>
              ))}
            </Selecteur>
          </label>

          <label className="flex flex-col gap-1">
            <Etiquette>Titre</Etiquette>
            <Champ
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Refonte du site"
              required
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1">
              <Etiquette>Montant (CHF)</Etiquette>
              <Champ
                className="chiffres"
                type="number"
                min={0}
                step={100}
                value={montant}
                onChange={(e) => setMontant(e.target.value)}
                placeholder="0"
              />
            </label>
            <label className="flex flex-col gap-1">
              <Etiquette>Étape</Etiquette>
              <Selecteur
                value={stage}
                onChange={(e) => setStage(e.target.value as Stage)}
              >
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_INFO[s].libelle}
                  </option>
                ))}
              </Selecteur>
            </label>
          </div>

          {message != null && (
            <p className="text-[11px] text-ambre">{message}</p>
          )}

          <div className="mt-1 flex justify-end gap-2">
            <Bouton type="button" ton="muet" taille="sm" onClick={onFermer}>
              Annuler
            </Bouton>
            <Bouton
              type="submit"
              taille="sm"
              disabled={enCours || clients.length === 0 || titre.trim() === ''}
            >
              {enCours ? 'Création…' : 'Créer le deal'}
            </Bouton>
          </div>
        </form>
      </Carte>
    </div>
  );
}
