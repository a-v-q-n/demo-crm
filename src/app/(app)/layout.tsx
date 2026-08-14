import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Nav } from '@/components/shell/nav';
import { auth } from '@/lib/auth';

// Coquille des trois pages protégées. C'est ici que la hauteur est verrouillée : le carré
// de 1080×1080 ne défile jamais, seules les zones internes le font.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect('/login');

  return (
    <div className="flex h-full overflow-hidden">
      <Nav email={session.user.email} />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden px-5 py-4">
        {children}
      </main>
    </div>
  );
}
