import { desc, eq } from 'drizzle-orm';
import { Mail, MapPin, Phone } from 'lucide-react';
import { notFound } from 'next/navigation';
import { db } from '@/db';
import { client, deal, evenement } from '@/db/schema';
import { Carte, Etiquette, Vide } from '@/components/ui/primitives';
import { cn } from '@/lib/cn';
import { dateLongue, montant } from '@/lib/format';
import { STAGE_INFO } from '@/lib/stages';
import { ActionsFiche } from './actions-fiche';
import { Timeline } from './timeline';

/* Fiche client : trois zones dans le carré, sans scroll de page. Colonne gauche
   (coordonnées + deals, ~300 px) et colonne droite (la timeline) défilent indépendamment. */

export default async function FicheClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [clientRow] = await db.select().from(client).where(eq(client.id, id)).limit(1);
  if (!clientRow) notFound();

  const [deals, evenements] = await Promise.all([
    db.select().from(deal).where(eq(deal.clientId, id)).orderBy(desc(deal.createdAt)),
    db
      .select()
      .from(evenement)
      .where(eq(evenement.clientId, id))
      .orderBy(desc(evenement.createdAt)),
  ]);

  return (
    <>
      <header className="flex shrink-0 items-start justify-between gap-4 pb-3">
        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-medium text-texte">{clientRow.entreprise}</h1>
          <p className="truncate text-[11px] text-atone">
            {clientRow.contact}
            {clientRow.secteur && <> · {clientRow.secteur}</>}
          </p>
        </div>
        <ActionsFiche client={clientRow} deals={deals} />
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden md:flex-row">
        {/* Colonne gauche — coordonnées + deals, défile pour son propre compte. */}
        <div className="flex max-h-[46%] w-full shrink-0 flex-col gap-3 overflow-hidden md:max-h-none md:w-[300px]">
          <Carte className="shrink-0 p-3">
            <Etiquette className="mb-2 block">Coordonnées</Etiquette>
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Mail size={12} strokeWidth={1.75} className="shrink-0 text-atone" />
                <span className="truncate text-atone-fort">{clientRow.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={12} strokeWidth={1.75} className="shrink-0 text-atone" />
                <span className="truncate text-atone-fort">{clientRow.telephone ?? '—'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={12} strokeWidth={1.75} className="shrink-0 text-atone" />
                <span className="truncate text-atone-fort">{clientRow.ville ?? '—'}</span>
              </div>
              <div className="mt-1 flex items-center justify-between border-t border-bord pt-2">
                <Etiquette>Client depuis</Etiquette>
                <span className="chiffres text-[11px] text-atone-fort">
                  {dateLongue(clientRow.createdAt)}
                </span>
              </div>
            </div>
          </Carte>

          <Carte className="flex min-h-0 flex-1 flex-col p-3">
            <Etiquette className="mb-2 block shrink-0">Ses deals</Etiquette>
            {deals.length === 0 ? (
              <Vide>Aucun deal</Vide>
            ) : (
              <ul className="filet-scroll flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto">
                {deals.map((d) => {
                  const info = STAGE_INFO[d.stage];
                  return (
                    <li
                      key={d.id}
                      className="transition-douce flex flex-col gap-1.5 rounded-md border border-bord bg-surface-2/60 px-2 py-2 hover:border-bord-vif"
                    >
                      {/* Le titre a la ligne entière : dans 300 px, le partager avec le montant
                          et l'étape le tronquait dès trois mots. */}
                      <div className="flex min-w-0 items-center gap-1.5">
                        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', info.point)} />
                        <span className="truncate text-xs text-texte">{d.titre}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 pl-3">
                        <span
                          className={cn(
                            'rounded border px-1.5 py-0.5 text-[9px] tracking-wide uppercase',
                            info.fond,
                            info.bord,
                            info.texte,
                          )}
                        >
                          {info.libelle}
                        </span>
                        <span className="chiffres text-[11px] text-atone-fort">
                          {montant(d.montant)}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Carte>
        </div>

        {/* Colonne droite — la timeline, pièce centrale de la fiche. */}
        <Carte className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
          <Etiquette className="block shrink-0 px-4 pt-3 pb-1">Historique</Etiquette>
          <Timeline evenements={evenements} />
        </Carte>
      </div>
    </>
  );
}
