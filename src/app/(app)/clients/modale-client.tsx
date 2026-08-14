'use client';

import { useState, useTransition, type ChangeEvent, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { Bouton, Carte, Champ, Etiquette } from '@/components/ui/primitives';
import { creerClient, modifierClient, type DonneesClient } from '@/actions/clients';
import type { Client } from '@/db/schema';

/* Modale partagée création / modification — même formulaire, action serveur différente. */

type Props =
  | { mode: 'creer'; onFerme: () => void }
  | { mode: 'modifier'; client: Client; onFerme: () => void };

const CHAMP_VIDE: DonneesClient = {
  entreprise: '',
  contact: '',
  email: '',
  telephone: '',
  ville: '',
  secteur: '',
};

export function ModaleClient(props: Props) {
  const { mode, onFerme } = props;
  const clientExistant = props.mode === 'modifier' ? props.client : null;

  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const [valeurs, setValeurs] = useState<DonneesClient>(
    clientExistant
      ? {
          entreprise: clientExistant.entreprise,
          contact: clientExistant.contact,
          email: clientExistant.email,
          telephone: clientExistant.telephone ?? '',
          ville: clientExistant.ville ?? '',
          secteur: clientExistant.secteur ?? '',
        }
      : CHAMP_VIDE,
  );

  function surChangement(nom: keyof DonneesClient) {
    return (e: ChangeEvent<HTMLInputElement>) =>
      setValeurs((v) => ({ ...v, [nom]: e.target.value }));
  }

  function soumettre(e: FormEvent) {
    e.preventDefault();
    setErreur(null);
    demarrer(async () => {
      const resultat =
        props.mode === 'creer'
          ? await creerClient(valeurs)
          : await modifierClient(props.client.id, valeurs);
      if (!resultat.ok) {
        setErreur(resultat.message);
        return;
      }
      router.refresh();
      onFerme();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-fond/80 backdrop-blur-sm"
      onClick={onFerme}
    >
      <Carte
        className="flex max-h-[560px] w-[380px] flex-col p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex shrink-0 items-center justify-between">
          <h2 className="text-xs font-medium tracking-[0.14em] text-texte uppercase">
            {mode === 'creer' ? 'Nouveau client' : 'Modifier le client'}
          </h2>
          <button
            type="button"
            onClick={onFerme}
            className="transition-douce text-atone hover:text-texte"
          >
            <X size={15} strokeWidth={1.75} />
          </button>
        </div>

        <form
          onSubmit={soumettre}
          className="filet-scroll flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1"
        >
          <label className="flex flex-col gap-1">
            <Etiquette>Entreprise</Etiquette>
            <Champ required value={valeurs.entreprise} onChange={surChangement('entreprise')} />
          </label>
          <label className="flex flex-col gap-1">
            <Etiquette>Contact</Etiquette>
            <Champ required value={valeurs.contact} onChange={surChangement('contact')} />
          </label>
          <label className="flex flex-col gap-1">
            <Etiquette>Email</Etiquette>
            <Champ
              required
              type="email"
              value={valeurs.email}
              onChange={surChangement('email')}
            />
          </label>
          <label className="flex flex-col gap-1">
            <Etiquette>Téléphone</Etiquette>
            <Champ value={valeurs.telephone} onChange={surChangement('telephone')} />
          </label>
          <label className="flex flex-col gap-1">
            <Etiquette>Ville</Etiquette>
            <Champ value={valeurs.ville} onChange={surChangement('ville')} />
          </label>
          <label className="flex flex-col gap-1">
            <Etiquette>Secteur</Etiquette>
            <Champ value={valeurs.secteur} onChange={surChangement('secteur')} />
          </label>

          {erreur && <p className="text-[11px] text-rose">{erreur}</p>}

          <div className="mt-1 flex shrink-0 justify-end gap-2">
            <Bouton type="button" ton="muet" taille="sm" onClick={onFerme}>
              Annuler
            </Bouton>
            <Bouton type="submit" ton="rose" taille="sm" disabled={enCours}>
              {mode === 'creer' ? 'Créer' : 'Enregistrer'}
            </Bouton>
          </div>
        </form>
      </Carte>
    </div>
  );
}
