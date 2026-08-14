import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/* Primitives partagées — le vocabulaire visuel commun aux trois pages.
   Densité maîtrisée : l'écran cible est un carré de 1080×1080, la hauteur est la
   contrainte serrée. Rien ici ne prend de la place pour rien. */

export function Carte({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-lg border border-bord bg-surface/70 backdrop-blur-[2px]',
        className,
      )}
      {...props}
    />
  );
}

/** L'en-tête d'une page : un titre discret et, à droite, ses actions. */
export function EnTete({
  titre,
  compte,
  children,
}: {
  titre: string;
  compte?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="flex shrink-0 items-center justify-between gap-4 pb-3">
      <div className="flex items-baseline gap-3">
        <h1 className="text-[15px] font-medium tracking-[0.18em] text-texte uppercase">
          {titre}
        </h1>
        {compte != null && (
          <span className="chiffres text-[11px] text-atone">{compte}</span>
        )}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </header>
  );
}

type BoutonProps = ComponentProps<'button'> & {
  ton?: 'rose' | 'vert' | 'muet';
  taille?: 'sm' | 'md';
};

export function Bouton({
  ton = 'rose',
  taille = 'md',
  className,
  ...props
}: BoutonProps) {
  return (
    <button
      className={cn(
        'transition-douce inline-flex items-center justify-center gap-1.5 rounded-md border font-medium whitespace-nowrap disabled:pointer-events-none disabled:opacity-40',
        taille === 'sm' ? 'h-7 px-2.5 text-[11px]' : 'h-8 px-3 text-xs',
        ton === 'rose' &&
          'border-rose/45 bg-rose/12 text-rose hover:bg-rose/22 hover:shadow-[0_0_18px_-4px_rgba(255,61,138,0.6)]',
        ton === 'vert' &&
          'border-vert/45 bg-vert/12 text-vert hover:bg-vert/22 hover:shadow-[0_0_18px_-4px_rgba(47,240,155,0.6)]',
        ton === 'muet' &&
          'border-bord-vif bg-surface-2 text-atone-fort hover:border-bord-vif hover:bg-surface-3 hover:text-texte',
        className,
      )}
      {...props}
    />
  );
}

export function Champ({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      className={cn(
        'transition-douce h-8 w-full rounded-md border border-bord bg-surface-2 px-2.5 text-xs text-texte placeholder:text-atone hover:border-bord-vif',
        className,
      )}
      {...props}
    />
  );
}

export function Zone({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        'transition-douce filet-scroll w-full resize-none rounded-md border border-bord bg-surface-2 px-2.5 py-2 text-xs leading-relaxed text-texte placeholder:text-atone hover:border-bord-vif',
        className,
      )}
      {...props}
    />
  );
}

export function Selecteur({ className, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(
        'transition-douce h-8 w-full rounded-md border border-bord bg-surface-2 px-2 text-xs text-texte hover:border-bord-vif',
        className,
      )}
      {...props}
    />
  );
}

/** Libellé d'un champ ou d'une donnée — toujours en petites capitales atones. */
export function Etiquette({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'text-[10px] tracking-[0.14em] text-atone uppercase',
        className,
      )}
      {...props}
    />
  );
}

/** Le carré vide qui remplace une liste sans contenu. */
export function Vide({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center py-8 text-xs text-atone">
      {children}
    </div>
  );
}
