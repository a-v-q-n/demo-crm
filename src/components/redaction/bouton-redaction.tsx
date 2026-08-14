'use client';

import type * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, X } from 'lucide-react';
import { Bouton, Champ, Etiquette, Selecteur, Zone } from '@/components/ui/primitives';
import { redigerEmail, envoyerEmail } from '@/actions/redaction';
import { cn } from '@/lib/cn';
import { montant as formatMontant } from '@/lib/format';
import { libelleStage, type Stage } from '@/lib/stages';

/* La rédaction assistée, vue depuis la fiche client. Tout tient dans une modale qui ne dépasse
   jamais du carré de 1080×1080 : en-tête et pied fixes, seul le corps défile. */

type FicheClient = { id: string; entreprise: string; contact: string; email: string };
type Affaire = { id: string; titre: string; montant: number; stage: Stage };

/** Les trois intentions qui couvrent l'essentiel des relances. */
const INTENTIONS = ['relancer sans réponse', "envoyer l'offre", 'proposer un rendez-vous'] as const;

export function BoutonRedaction(props: {
  client: FicheClient;
  deals: Affaire[];
}): React.JSX.Element {
  const [ouvert, setOuvert] = useState(false);
  const fermer = useCallback(() => setOuvert(false), []);
  const sansAffaire = props.deals.length === 0;

  return (
    <>
      <Bouton
        ton="rose"
        taille="sm"
        type="button"
        onClick={() => setOuvert(true)}
        disabled={sansAffaire}
        title={sansAffaire ? "Ce client n'a aucune affaire à relancer." : undefined}
      >
        <Sparkles size={13} strokeWidth={1.75} />
        Rédiger
      </Bouton>

      {ouvert && <Modale client={props.client} deals={props.deals} fermer={fermer} />}
    </>
  );
}

type Phase = 'repos' | 'redaction' | 'envoi' | 'succes';

function Modale({
  client,
  deals,
  fermer,
}: {
  client: FicheClient;
  deals: Affaire[];
  fermer: () => void;
}) {
  const router = useRouter();
  const [dealId, setDealId] = useState(() => dealLePlusActif(deals).id);
  const [intention, setIntention] = useState('');
  const [sujet, setSujet] = useState('');
  const [corps, setCorps] = useState('');
  const [phase, setPhase] = useState<Phase>('repos');
  const [erreur, setErreur] = useState<string | null>(null);

  const enRedaction = phase === 'redaction';
  const enEnvoi = phase === 'envoi';
  const occupe = enRedaction || enEnvoi;
  const aBrouillon = sujet.trim() !== '' || corps.trim() !== '';

  // On ne ferme pas sous les doigts d'une action en vol : le résultat serait perdu de vue.
  const fermerSiPossible = useCallback(() => {
    if (!occupe) fermer();
  }, [occupe, fermer]);

  useEffect(() => {
    function surTouche(evenement: KeyboardEvent) {
      if (evenement.key === 'Escape') fermerSiPossible();
    }
    document.addEventListener('keydown', surTouche);
    return () => document.removeEventListener('keydown', surTouche);
  }, [fermerSiPossible]);

  // La confirmation reste juste assez longtemps pour être lue, puis la fiche se rafraîchit
  // pour que l'événement apparaisse dans la timeline.
  useEffect(() => {
    if (phase !== 'succes') return;
    const minuteur = setTimeout(() => {
      fermer();
      router.refresh();
    }, 1200);
    return () => clearTimeout(minuteur);
  }, [phase, fermer, router]);

  async function rediger() {
    setErreur(null);
    setPhase('redaction');
    const resultat = await redigerEmail({ clientId: client.id, dealId, intention });
    setPhase('repos');
    if (!resultat.ok) {
      setErreur(resultat.message);
      return;
    }
    setSujet(resultat.sujet);
    setCorps(resultat.corps);
  }

  async function expedier() {
    setErreur(null);
    setPhase('envoi');
    const resultat = await envoyerEmail({ clientId: client.id, dealId, sujet, corps });
    if (!resultat.ok) {
      setPhase('repos');
      setErreur(resultat.message);
      return;
    }
    setPhase('succes');
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-fond/80 backdrop-blur-sm"
      onClick={fermerSiPossible}
      role="presentation"
    >
      <div className="flex h-full items-center justify-center p-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Rédiger un email"
          onClick={(evenement) => evenement.stopPropagation()}
          className="flex max-h-[calc(100dvh-96px)] w-[560px] max-w-full flex-col overflow-hidden rounded-lg border border-bord-vif bg-surface shadow-[0_24px_70px_-20px_rgba(0,0,0,0.85)]"
        >
          {/* En-tête fixe */}
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-bord px-4 py-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <Sparkles size={13} strokeWidth={1.75} className="shrink-0 text-rose" />
                <span className="text-[11px] font-medium tracking-[0.16em] text-texte uppercase">
                  Rédiger un email
                </span>
              </div>
              <p className="truncate text-[11px] text-atone">
                {client.contact} <span className="text-bord-vif">·</span> {client.email}
              </p>
            </div>
            <button
              type="button"
              onClick={fermerSiPossible}
              aria-label="Fermer"
              className="transition-douce -mr-1 shrink-0 rounded-md p-1 text-atone hover:text-rose"
            >
              <X size={14} strokeWidth={1.75} />
            </button>
          </header>

          {/* Corps défilant */}
          <div className="filet-scroll flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-4 py-3.5">
            <div className="flex flex-col gap-1.5">
              <Etiquette>Affaire</Etiquette>
              <Selecteur
                value={dealId}
                onChange={(evenement) => setDealId(evenement.target.value)}
                disabled={occupe}
              >
                {deals.map((affaire) => (
                  <option key={affaire.id} value={affaire.id}>
                    {affaire.titre} · {libelleStage(affaire.stage)} ·{' '}
                    {formatMontant(affaire.montant)}
                  </option>
                ))}
              </Selecteur>
            </div>

            <div className="flex flex-col gap-1.5">
              <Etiquette>Intention</Etiquette>
              <Champ
                value={intention}
                onChange={(evenement) => setIntention(evenement.target.value)}
                placeholder="relance, sans réponse depuis trois semaines"
                disabled={occupe}
              />
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {INTENTIONS.map((puce) => (
                  <Bouton
                    key={puce}
                    ton="muet"
                    taille="sm"
                    type="button"
                    onClick={() => setIntention(puce)}
                    disabled={occupe}
                  >
                    {puce}
                  </Bouton>
                ))}
              </div>
            </div>

            {(aBrouillon || enRedaction) && (
              <div
                className={cn(
                  'transition-douce flex flex-col gap-3 rounded-md',
                  enRedaction && 'animate-pulse ring-1 ring-rose/35',
                )}
              >
                <div className="flex flex-col gap-1.5">
                  <Etiquette>Sujet</Etiquette>
                  <Champ
                    value={sujet}
                    onChange={(evenement) => setSujet(evenement.target.value)}
                    placeholder={enRedaction ? 'Rédaction…' : ''}
                    disabled={occupe}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Etiquette>Message</Etiquette>
                  <Zone
                    rows={11}
                    value={corps}
                    onChange={(evenement) => setCorps(evenement.target.value)}
                    placeholder={enRedaction ? 'Rédaction…' : ''}
                    disabled={occupe}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Pied fixe */}
          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-bord px-4 py-3">
            <p className="min-w-0 flex-1 text-[11px] leading-snug">
              {phase === 'succes' ? (
                <span className="glow-texte-vert text-vert">
                  Envoyé à {client.contact}.
                </span>
              ) : erreur != null ? (
                <span className="text-rose">{erreur}</span>
              ) : (
                <span className="text-atone">
                  La démo n&apos;envoie qu&apos;aux adresses @avqn.ch.
                </span>
              )}
            </p>

            <div className="flex shrink-0 items-center gap-2">
              {aBrouillon && (
                <Bouton
                  ton="muet"
                  taille="sm"
                  type="button"
                  onClick={rediger}
                  disabled={occupe || phase === 'succes'}
                >
                  {enRedaction ? 'Rédaction…' : 'Reformuler'}
                </Bouton>
              )}
              {aBrouillon ? (
                <Bouton
                  ton="vert"
                  taille="sm"
                  type="button"
                  onClick={expedier}
                  disabled={
                    occupe || phase === 'succes' || sujet.trim() === '' || corps.trim() === ''
                  }
                >
                  {enEnvoi ? 'Envoi…' : 'Envoyer'}
                </Bouton>
              ) : (
                <Bouton
                  ton="rose"
                  taille="sm"
                  type="button"
                  onClick={rediger}
                  disabled={occupe}
                >
                  {enRedaction ? 'Rédaction…' : 'Rédiger'}
                </Bouton>
              )}
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

/**
 * L'affaire la plus active : la première en `offre`, sinon en `prospect`, sinon la plus récente
 * parmi les autres. À égalité d'étape, le montant le plus élevé gagne. Les deals arrivent de la
 * fiche client du plus récent au plus ancien — c'est cet ordre qui sert de repère de récence,
 * le contrat du composant ne porte pas de date.
 */
function dealLePlusActif(deals: Affaire[]): Affaire {
  const plusGros = (liste: Affaire[]) =>
    liste.reduce((retenu, candidat) => (candidat.montant > retenu.montant ? candidat : retenu));

  const offres = deals.filter((affaire) => affaire.stage === 'offre');
  if (offres.length > 0) return plusGros(offres);

  const prospects = deals.filter((affaire) => affaire.stage === 'prospect');
  if (prospects.length > 0) return plusGros(prospects);

  const tete = deals[0];
  return plusGros(deals.filter((affaire) => affaire.stage === tete.stage));
}
