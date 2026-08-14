'use client';

import { Columns3, LayoutDashboard, LogOut, Users } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';
import { signOut } from '@/lib/auth-client';

// Navigation latérale — étroite par contrat : dans un carré de 1080 px, chaque pixel pris
// ici est un pixel perdu pour les quatre colonnes du pipeline.
const LIENS = [
  { href: '/clients', libelle: 'Clients', Icone: Users },
  { href: '/deals', libelle: 'Pipeline', Icone: Columns3 },
  { href: '/dashboard', libelle: 'Dashboard', Icone: LayoutDashboard },
] as const;

export function Nav({ email }: { email: string }) {
  const chemin = usePathname();

  return (
    <nav className="flex h-full w-12 shrink-0 flex-col border-r border-bord bg-surface/60 px-2 py-4 md:w-[168px] md:px-2.5">
      <Link href="/dashboard" className="mb-6 flex items-center gap-2 px-1.5">
        <span className="glow-rose h-2 w-2 shrink-0 rounded-full bg-rose" />
        <span className="hidden text-[13px] font-semibold tracking-[0.16em] text-texte uppercase md:inline">
          Demo<span className="text-rose">CRM</span>
        </span>
      </Link>

      <ul className="flex flex-col gap-0.5">
        {LIENS.map(({ href, libelle, Icone }) => {
          const actif = chemin === href || chemin.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                title={libelle}
                className={cn(
                  'transition-douce flex items-center gap-2.5 rounded-md px-2 py-2 text-xs md:px-2.5',
                  actif
                    ? 'border border-rose/40 bg-rose/10 text-rose shadow-[0_0_18px_-6px_rgba(255,61,138,0.7)]'
                    : 'border border-transparent text-atone hover:bg-surface-2 hover:text-texte',
                )}
              >
                <Icone size={14} strokeWidth={1.75} className="shrink-0" />
                <span className="hidden md:inline">{libelle}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto flex flex-col gap-2 border-t border-bord pt-3">
        <p className="hidden truncate px-1.5 text-[10px] text-atone md:block" title={email}>
          {email}
        </p>
        <button
          type="button"
          title="Se déconnecter"
          onClick={async () => {
            await signOut();
            // Navigation dure, comme à la connexion : le cache de routeur garde pour `/login`
            // une entrée qui redirige vers `/dashboard`, valable du temps où la session
            // existait. La rejouer renverrait dans l'application qu'on vient de quitter.
            window.location.assign('/login');
          }}
          className="transition-douce flex items-center gap-2 rounded-md px-1.5 py-1.5 text-[11px] text-atone hover:text-rose"
        >
          <LogOut size={13} strokeWidth={1.75} className="shrink-0" />
          <span className="hidden md:inline">Se déconnecter</span>
        </button>
      </div>
    </nav>
  );
}
