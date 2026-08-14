'use client';

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus } from 'lucide-react';
import { useMemo, useOptimistic, useState, useTransition } from 'react';
import { deplacerDeal } from '@/actions/deals';
import { Bouton, EnTete } from '@/components/ui/primitives';
import { cn } from '@/lib/cn';
import { montant } from '@/lib/format';
import { STAGES, STAGE_INFO, type Stage } from '@/lib/stages';
import { ModaleDeal, type ClientBref } from './modale-deal';

/* Le canvas du pipeline. Quatre colonnes qui tiennent COTE À CÔTE dans 872 px utiles :
   ~212 px chacune. Rien ne défile horizontalement, la page ne défile pas — seul le corps
   de chaque colonne défile. Les cartes sont compactes parce que le format l'exige. */

export type CarteDeal = {
  id: string;
  titre: string;
  montant: number;
  stage: Stage;
  position: number;
  clientId: string;
  entreprise: string;
};

type Mouvement = { dealId: string; vers: Stage; index: number };

type ParEtape = Record<Stage, CarteDeal[]>;

/** Range les cartes par colonne, chacune dans l'ordre de ses `position`. */
function grouper(cartes: CarteDeal[]): ParEtape {
  const vide = {} as ParEtape;
  for (const etape of STAGES) vide[etape] = [];
  for (const carte of cartes) vide[carte.stage].push(carte);
  for (const etape of STAGES) vide[etape].sort((a, b) => a.position - b.position);
  return vide;
}

/**
 * Applique un mouvement en local : on retire la carte, on la réinsère à sa place dans la
 * colonne d'arrivée, puis on renumérote les deux colonnes touchées. Exactement ce que la
 * server action fera en base — l'affichage optimiste ne peut donc pas mentir.
 */
function deplacer(cartes: CarteDeal[], mouvement: Mouvement): CarteDeal[] {
  const carte = cartes.find((c) => c.id === mouvement.dealId);
  if (!carte) return cartes;

  const depart = carte.stage;
  const autres = cartes.filter((c) => c.id !== carte.id);

  const arrivee = autres
    .filter((c) => c.stage === mouvement.vers)
    .sort((a, b) => a.position - b.position);
  const place = Math.min(Math.max(mouvement.index, 0), arrivee.length);
  arrivee.splice(place, 0, { ...carte, stage: mouvement.vers });

  const restantes = autres.filter((c) => c.stage !== mouvement.vers);
  const retassees =
    depart === mouvement.vers
      ? restantes
      : restantes
          .filter((c) => c.stage === depart)
          .sort((a, b) => a.position - b.position)
          .map((c, rang) => ({ ...c, position: rang }))
          .concat(restantes.filter((c) => c.stage !== depart));

  return [...retassees, ...arrivee.map((c, rang) => ({ ...c, position: rang }))];
}

function estStage(valeur: string): valeur is Stage {
  return (STAGES as readonly string[]).includes(valeur);
}

/** Où atterrit la carte : sur une autre carte (on prend sa place) ou sur une colonne vide. */
function resoudreCible(
  parEtape: ParEtape,
  survole: string,
): { stage: Stage; index: number } | null {
  if (estStage(survole)) return { stage: survole, index: parEtape[survole].length };
  for (const etape of STAGES) {
    const rang = parEtape[etape].findIndex((c) => c.id === survole);
    if (rang !== -1) return { stage: etape, index: rang };
  }
  return null;
}

export function Pipeline({
  cartes,
  clients,
}: {
  cartes: CarteDeal[];
  clients: ClientBref[];
}) {
  const [affichees, appliquer] = useOptimistic(cartes, deplacer);
  const [, demarrer] = useTransition();
  const [saisie, setSaisie] = useState<string | null>(null);
  const [survol, setSurvol] = useState<Stage | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [modale, setModale] = useState(false);

  const parEtape = useMemo(() => grouper(affichees), [affichees]);
  const active = saisie == null ? null : (affichees.find((c) => c.id === saisie) ?? null);

  const enCours = affichees
    .filter((c) => c.stage === 'prospect' || c.stage === 'offre')
    .reduce((somme, c) => somme + c.montant, 0);

  // 5 px avant de déclencher : un simple clic sur une carte n'ouvre pas un drag.
  const capteurs = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  function auDebut(evenement: DragStartEvent) {
    setSaisie(String(evenement.active.id));
    setMessage(null);
  }

  function auSurvol(evenement: DragOverEvent) {
    const { over } = evenement;
    setSurvol(over ? (resoudreCible(parEtape, String(over.id))?.stage ?? null) : null);
  }

  function auRelacher(evenement: DragEndEvent) {
    const { active: prise, over } = evenement;
    setSaisie(null);
    setSurvol(null);
    if (!over) return;

    const carte = affichees.find((c) => c.id === String(prise.id));
    const cible = resoudreCible(parEtape, String(over.id));
    if (!carte || !cible) return;

    // Même colonne, même rang : rien à faire.
    const rang = parEtape[carte.stage].findIndex((c) => c.id === carte.id);
    if (cible.stage === carte.stage && cible.index === rang) return;

    const mouvement: Mouvement = {
      dealId: carte.id,
      vers: cible.stage,
      index: cible.index,
    };

    demarrer(async () => {
      // L'écran bouge tout de suite ; si la base refuse, React rend l'état d'avant.
      appliquer(mouvement);
      const resultat = await deplacerDeal(mouvement);
      if (!resultat.ok) setMessage(resultat.message);
    });
  }

  return (
    <>
      <EnTete
        titre="Pipeline"
        compte={`${affichees.length} deals · ${montant(enCours)} en cours`}
      >
        <Bouton type="button" taille="sm" onClick={() => setModale(true)}>
          <Plus size={13} strokeWidth={2} />
          Nouveau deal
        </Bouton>
      </EnTete>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        {message != null && (
          <p className="shrink-0 rounded-md border border-ambre/40 bg-ambre/10 px-2.5 py-1.5 text-[11px] text-ambre">
            {message}
          </p>
        )}

        <DndContext
          // Identifiant figé : sans lui, dnd-kit numérote ses `aria-describedby` avec un
          // compteur global qui ne retombe pas sur la même valeur au rendu serveur et au
          // rendu client — React signale alors une divergence d'hydratation à chaque visite.
          id="pipeline"
          sensors={capteurs}
          collisionDetection={closestCorners}
          onDragStart={auDebut}
          onDragOver={auSurvol}
          onDragEnd={auRelacher}
          onDragCancel={() => {
            setSaisie(null);
            setSurvol(null);
          }}
        >
          {/* Dès 768 px de large — l'écran cible du carré compris — les quatre colonnes tiennent
              côte à côte et rien ne défile horizontalement. En dessous, elles gardent une largeur
              lisible et c'est la bande qui défile. */}
          <div className="filet-scroll flex min-h-0 flex-1 gap-2 overflow-x-auto md:grid md:grid-cols-4 md:overflow-hidden">
            {STAGES.map((etape) => (
              <Colonne
                key={etape}
                etape={etape}
                cartes={parEtape[etape]}
                survolee={survol === etape}
              />
            ))}
          </div>

          <DragOverlay dropAnimation={null}>
            {active != null && <Corps carte={active} enDeplacement />}
          </DragOverlay>
        </DndContext>
      </div>

      {modale && (
        <ModaleDeal clients={clients} onFermer={() => setModale(false)} />
      )}
    </>
  );
}

function Colonne({
  etape,
  cartes,
  survolee,
}: {
  etape: Stage;
  cartes: CarteDeal[];
  survolee: boolean;
}) {
  const info = STAGE_INFO[etape];
  const { setNodeRef } = useDroppable({ id: etape });
  const total = cartes.reduce((somme, c) => somme + c.montant, 0);

  const tonTotal =
    etape === 'gagne'
      ? 'text-vert glow-texte-vert'
      : etape === 'offre'
        ? 'text-rose'
        : 'text-atone-fort';

  return (
    <section
      className={cn(
        'transition-douce flex min-h-0 w-[210px] shrink-0 flex-col rounded-lg border md:w-auto md:shrink',
        survolee ? cn(info.bord, info.fond) : 'border-bord bg-surface/50',
      )}
    >
      <header className="shrink-0 border-b border-bord px-2 py-1.5">
        <div className="flex items-center gap-1.5">
          <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', info.point)} />
          <span className="flex-1 truncate text-[10px] tracking-[0.14em] text-atone uppercase">
            {info.libelle}
          </span>
          <span className="chiffres shrink-0 text-[10px] text-atone">{cartes.length}</span>
        </div>
        <p className={cn('chiffres mt-1 text-[11px]', tonTotal)}>{montant(total)}</p>
      </header>

      <div
        ref={setNodeRef}
        className="filet-scroll min-h-0 flex-1 space-y-1.5 overflow-y-auto p-1.5"
      >
        <SortableContext
          items={cartes.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cartes.map((carte) => (
            <CarteTriable key={carte.id} carte={carte} />
          ))}
        </SortableContext>
        {cartes.length === 0 && (
          <p className="rounded-md border border-dashed border-bord px-2 py-3 text-center text-[10px] text-atone">
            Déposer ici
          </p>
        )}
      </div>
    </section>
  );
}

function CarteTriable({ carte }: { carte: CarteDeal }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: carte.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className="cursor-grab touch-none active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <Corps carte={carte} enDeplacement={isDragging} />
    </div>
  );
}

/** Le dessin d'une carte — partagé par la colonne et par le calque qui suit le curseur. */
function Corps({
  carte,
  enDeplacement = false,
}: {
  carte: CarteDeal;
  enDeplacement?: boolean;
}) {
  return (
    <div
      className={cn(
        'transition-douce rounded-md border bg-surface-2 px-2 py-2',
        enDeplacement
          ? 'glow-rose border-rose/40 opacity-90'
          : 'border-bord hover:translate-y-[-1px] hover:border-bord-vif',
      )}
    >
      <p className="truncate text-[11px] leading-tight text-texte">{carte.titre}</p>
      <div className="mt-1.5 flex items-baseline justify-between gap-2">
        <span className="truncate text-[10px] text-atone">{carte.entreprise}</span>
        <span className="chiffres shrink-0 text-[11px] text-atone-fort">
          {montant(carte.montant)}
        </span>
      </div>
    </div>
  );
}
